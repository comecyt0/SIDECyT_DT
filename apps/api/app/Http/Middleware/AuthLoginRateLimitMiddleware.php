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
 *   2. Por email — 10 intentos acumulados → lockout de 15 min (progresivo)
 *
 * Configuración en .env:
 *   AUTH_LOGIN_RATE_LIMIT   (default 5)   — intentos por IP por ventana
 *   AUTH_LOGIN_RATE_WINDOW  (default 60)  — segundos de la ventana IP
 *   AUTH_ACCOUNT_LOCKOUT    (default 10)  — intentos hasta lockout de cuenta
 *   AUTH_LOCKOUT_MINUTES    (default 15)  — minutos de lockout de cuenta
 */
class AuthLoginRateLimitMiddleware
{
    private const MAX_ATTEMPTS = 5;

    private const WINDOW_SECONDS = 60;

    private const LOCKOUT_ATTEMPTS = 10;

    private const LOCKOUT_MINUTES = 15;

    public function handle(Request $request, Closure $next): Response
    {
        $ip = $request->ip();
        $email = strtolower(trim((string) $request->input('email', '')));
        $maxAttempts = (int) env('AUTH_LOGIN_RATE_LIMIT', self::MAX_ATTEMPTS);
        $windowSecs = (int) env('AUTH_LOGIN_RATE_WINDOW', self::WINDOW_SECONDS);
        $lockoutLimit = (int) env('AUTH_ACCOUNT_LOCKOUT', self::LOCKOUT_ATTEMPTS);
        $lockoutMins = (int) env('AUTH_LOCKOUT_MINUTES', self::LOCKOUT_MINUTES);

        $ipKey = "auth_login_attempts:{$ip}";
        $emailKey = "auth_account_attempts:{$email}";
        $lockoutKey = "auth_account_locked:{$email}";

        // ── 1. Verificar lockout de cuenta ───────────────────────────────
        if ($email && Cache::has($lockoutKey)) {
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
            }

            $remaining = max(0, $maxAttempts - ($ipAttempts + 1));
        } else {
            // Login exitoso → limpiar todos los contadores
            Cache::forget($ipKey);
            if ($email) {
                Cache::forget($emailKey);
                Cache::forget($lockoutKey);
                Cache::forget($lockoutKey.'_ttl');
            }
            $remaining = $maxAttempts;
        }

        $response->headers->set('X-RateLimit-Limit', $maxAttempts);
        $response->headers->set('X-RateLimit-Remaining', $remaining);
        $response->headers->set('X-RateLimit-Reset', now()->addSeconds($windowSecs)->timestamp);

        return $response;
    }
}
