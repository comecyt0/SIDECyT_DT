<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * AuthLoginRateLimitMiddleware
 *
 * Dos capas de protección:
 *   1. Por IP   — 5 intentos / 60s (bloqueo temporal)
 *   2. Por cuenta+IP — 10 intentos fallidos desde la MISMA IP → bloqueo de 15 min para ese par
 *   3. Por cuenta (global) — 50 intentos fallidos desde cualquier IP → bloqueo de 15 min de la cuenta
 *
 * SEGURIDAD (24/09/2026): antes 10 intentos por correo, vinieran de donde vinieran, bloqueaban la cuenta. Cualquiera
 * podía dejar fuera al administrador a propósito con 10 contraseñas malas. Ahora un atacante desde una IP solo se
 * bloquea a sí mismo; el bloqueo global de la cuenta exige un ataque distribuido (50) y queda en el log.
 *
 * Configuración en .env:
 *   AUTH_LOGIN_RATE_LIMIT   (default 5)   — intentos por IP por ventana
 *   AUTH_LOGIN_RATE_WINDOW  (default 60)  — segundos de la ventana IP
 *   AUTH_ACCOUNT_LOCKOUT    (default 10)  — intentos hasta lockout de cuenta
 *   AUTH_LOCKOUT_MINUTES    (default 15)  — minutos de lockout de cuenta
 *   AUTH_ACCOUNT_LOCKOUT_GLOBAL (default 50) — intentos (todas las IP) hasta bloquear la cuenta
 */
class AuthLoginRateLimitMiddleware
{
    private const MAX_ATTEMPTS = 5;

    private const WINDOW_SECONDS = 60;

    private const LOCKOUT_ATTEMPTS = 10;

    private const LOCKOUT_MINUTES = 15;

    private const LOCKOUT_GLOBAL = 50;

    public function handle(Request $request, Closure $next): Response
    {
        $ip = $request->ip();
        $email = strtolower(trim((string) $request->input('email', '')));
        // config/comecyt.php (security.*): nunca env() aquí — con config:cache devolvería null.
        $maxAttempts = (int) config('comecyt.security.auth_login_rate_limit', self::MAX_ATTEMPTS) ?: self::MAX_ATTEMPTS;
        $windowSecs = (int) config('comecyt.security.auth_login_rate_window', self::WINDOW_SECONDS) ?: self::WINDOW_SECONDS;
        $lockoutLimit = (int) config('comecyt.security.auth_account_lockout', self::LOCKOUT_ATTEMPTS) ?: self::LOCKOUT_ATTEMPTS;
        $lockoutMins = (int) config('comecyt.security.auth_lockout_minutes', self::LOCKOUT_MINUTES) ?: self::LOCKOUT_MINUTES;

        $lockoutGlobal = (int) config('comecyt.security.auth_account_lockout_global', self::LOCKOUT_GLOBAL) ?: self::LOCKOUT_GLOBAL;
        $ipKey = "auth_login_attempts:{$ip}";
        $emailKey = "auth_account_attempts:{$email}|{$ip}";
        $lockoutKey = "auth_account_locked:{$email}|{$ip}";
        $globalKey = "auth_account_attempts_global:{$email}";
        $globalLockKey = "auth_account_locked_global:{$email}";

        // ── 1. Verificar bloqueo de cuenta (este par cuenta+IP, o la cuenta entera) ──
        if ($email && (Cache::has($lockoutKey) || Cache::has($globalLockKey))) {
            $ttl = Cache::get($lockoutKey.'_ttl', $lockoutMins * 60);

            return response()->json([
                'error' => 'Account Locked',
                'message' => "Cuenta bloqueada por demasiados intentos fallidos. Intenta de nuevo en {$lockoutMins} minutos o usa la opción ¿Olvidaste tu contraseña?",
                'code' => 429,
                'retry_after' => $ttl,
                'locked' => true,
            ], 429, ['Retry-After' => $ttl]);
        }

        // ── 2. Verificar rate limit por IP ───────────────────────────────
        $ipAttempts = (int) Cache::get($ipKey, 0);
        if ($ipAttempts >= $maxAttempts) {
            return response()->json([
                'error' => 'Too Many Login Attempts',
                'message' => "Demasiados intentos de login. Intenta de nuevo en {$windowSecs} segundos.",
                'code' => 429,
                'retry_after' => $windowSecs,
            ], 429, [
                'X-RateLimit-Limit' => $maxAttempts,
                'X-RateLimit-Remaining' => 0,
                'Retry-After' => $windowSecs,
            ]);
        }

        $response = $next($request);

        if ($response->getStatusCode() === 401) {
            // Incrementar contador IP
            if ($ipAttempts === 0) {
                Cache::put($ipKey, 1, $windowSecs);
            } else {
                Cache::increment($ipKey);
            }

            // Incrementar contador de cuenta
            if ($email) {
                $emailAttempts = (int) Cache::get($emailKey, 0) + 1;
                Cache::put($emailKey, $emailAttempts, $lockoutMins * 60);

                // Activar lockout de cuenta si se superó el límite
                if ($emailAttempts >= $lockoutLimit) {
                    $lockoutSecs = $lockoutMins * 60;
                    Cache::put($lockoutKey, true, $lockoutSecs);
                    Cache::put($lockoutKey.'_ttl', $lockoutSecs, $lockoutSecs);
                    Cache::forget($emailKey);

                    \Log::warning('Account locked after too many failed attempts', [
                        'email' => $email,
                        'ip' => $ip,
                        'attempts' => $emailAttempts,
                    ]);
                }

                $globalAttempts = (int) Cache::get($globalKey, 0) + 1;
                Cache::put($globalKey, $globalAttempts, $lockoutMins * 60);
                if ($globalAttempts >= $lockoutGlobal) {
                    Cache::put($globalLockKey, true, $lockoutMins * 60);
                    Cache::forget($globalKey);
                    \Log::channel('security')->critical('Cuenta bloqueada por intentos desde muchas IP', [
                        'email' => $email,
                        'attempts' => $globalAttempts,
                    ]);
                }
            }

            $remaining = max(0, $maxAttempts - ($ipAttempts + 1));
        } else {
            // Login exitoso → limpiar todos los contadores
            Cache::forget($ipKey);
            if ($email) {
                Cache::forget($emailKey);
                Cache::forget($lockoutKey);
                Cache::forget($lockoutKey.'_ttl');
                Cache::forget($globalKey);
            }
            $remaining = $maxAttempts;
        }

        $response->headers->set('X-RateLimit-Limit', $maxAttempts);
        $response->headers->set('X-RateLimit-Remaining', $remaining);
        $response->headers->set('X-RateLimit-Reset', now()->addSeconds($windowSecs)->timestamp);

        return $response;
    }
}
