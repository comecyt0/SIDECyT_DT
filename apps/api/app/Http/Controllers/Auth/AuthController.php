<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

class AuthController extends Controller
{
    /**
     * @return JsonResponse
     */
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);
        // 02/10/2026: el correo no distingue mayúsculas (PostgreSQL sí). Se usa el correo tal como está guardado; si no
        // existe, se intenta con lo escrito y falla igual que una contraseña incorrecta (no se revela nada).
        $guardado = \App\Models\User::whereRaw('LOWER(email) = ?', [mb_strtolower(trim((string) $credentials['email']))])->value('email');
        if ($guardado) $credentials['email'] = $guardado;

        // SEGURIDAD (24/09/2026): solo cuentas activas. Una desactivada recibe el mismo mensaje que una contraseña
        // incorrecta (no se revela que existe).
        if (! $token = auth()->guard('api')->attempt($credentials + ['activo' => true])) {
            Log::channel('security')->warning('Failed login attempt', [
                'email' => $request->email,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return response()->json(['error' => 'Credenciales inválidas'], 401);
        }

        $user = auth()->guard('api')->user();

        // Si el usuario tiene 2FA activo, NO emitimos el JWT aún:
        // invalidamos el token recién creado y emitimos un challenge_id (UUID en cache).
        if ($user->hasTwoFactorEnabled()) {
            auth()->guard('api')->logout(); // invalida el token que recién emitimos
            $challengeId = (string) Str::uuid();
            Cache::put('2fa_challenge:'.$challengeId, $user->id, now()->addMinutes(5));

            Log::channel('security')->info('Login requires 2FA', [
                'user_id' => $user->id,
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'requires_2fa' => true,
                'challenge_id' => $challengeId,
                'message' => 'Ingresa el código de tu app autenticadora.',
            ], 200);
        }

        Log::channel('security')->info('Successful login', [
            'user_id' => $user->id,
            'email' => $request->email,
            'ip' => $request->ip(),
        ]);

        return $this->respondWithToken($token);
    }

    /**
     * POST /auth/2fa/challenge { challenge_id, code }
     * Segunda etapa del login para usuarios con 2FA. Si el código TOTP (o un
     * código de recuperación) es válido, se emite el JWT como en el login normal.
     */
    public function twoFactorChallenge(Request $request)
    {
        $request->validate([
            'challenge_id' => 'required|string|uuid',
            'code' => 'required|string|min:6|max:21',
        ]);

        $userId = Cache::pull('2fa_challenge:'.$request->challenge_id);
        if (! $userId) {
            return response()->json(['error' => 'Challenge expirado o inválido. Inicia sesión nuevamente.'], 422);
        }

        /** @var User|null $user */
        $user = User::find($userId);
        // `activo`: si el admin la desactivó entre el primer paso y el código, no se emite el token.
        if (! $user || ! $user->activo || ! $user->hasTwoFactorEnabled()) {
            return response()->json(['error' => 'Usuario inválido.'], 422);
        }

        $g2fa = new Google2FA;
        $codeOk = $g2fa->verifyKey($user->two_factor_secret, $request->code);

        // Fallback: ¿es uno de los recovery codes? (de un solo uso)
        if (! $codeOk) {
            $codes = $user->two_factor_recovery_codes ?? [];
            if (in_array($request->code, $codes, true)) {
                $codeOk = true;
                $user->two_factor_recovery_codes = array_values(array_diff($codes, [$request->code]));
                $user->save();
                Audit::log('user.2fa_recovery_used', $user);
            }
        }

        if (! $codeOk) {
            Log::channel('security')->warning('2FA challenge failed', [
                'user_id' => $user->id,
                'ip' => $request->ip(),
            ]);

            return response()->json(['error' => 'Código inválido.'], 422);
        }

        $token = auth()->guard('api')->login($user);

        Log::channel('security')->info('Successful login (2FA)', [
            'user_id' => $user->id,
            'ip' => $request->ip(),
        ]);

        return $this->respondWithToken($token);
    }

    /**
     * @return JsonResponse
     */
    public function me()
    {
        $guard = auth()->guard('api');
        $user = $guard->user();
        $user->loadMissing('rol', 'empresa');

        return response()->json([
            'user' => $user,
            'expires_at' => $guard->payload()->get('exp'), // epoch seconds
            'two_factor_enabled' => $user->hasTwoFactorEnabled(),
        ]);
    }

    /**
     * @return JsonResponse
     */
    /**
     * Dominio, Secure y SameSite de la cookie comecyt_auth, iguales al emitirla y al expirarla. Salen de
     * config('comecyt.cookie') (nunca env() aquí: con config:cache devuelve null y la cookie perdería Secure).
     */
    private static function atributosCookie(): array
    {
        $c = config('comecyt.cookie');
        $secure = $c['secure'] ?? null;

        return [
            $c['domain'] ?? null,
            $secure === null || $secure === '' ? app()->environment('production') : filter_var($secure, FILTER_VALIDATE_BOOLEAN),
            (string) ($c['same_site'] ?? 'Strict'),
        ];
    }

    public function logout()
    {
        auth()->guard('api')->logout();

        // Limpiar cookie HttpOnly del JWT — debe usar el mismo dominio/secure/samesite que respondWithToken
        [$cookieDomain, $isSecure, $sameSite] = self::atributosCookie();
        $expiredCookie = cookie('comecyt_auth', '', -1, '/', $cookieDomain, $isSecure, true, false, $sameSite);

        return response()->json(['message' => 'Sesión cerrada exitosamente'])
            ->withCookie($expiredCookie);
    }

    /**
     * @return JsonResponse
     */
    public function refresh()
    {
        return $this->respondWithToken(auth()->guard('api')->refresh());
    }

    /**
     * @return JsonResponse
     */
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            // Misma política que el alta de usuarios (Password::defaults, AppServiceProvider). Antes solo min:8.
            'new_password' => ['required', 'string', 'confirmed', \Illuminate\Validation\Rules\Password::defaults()],
        ]);

        $user = auth('api')->user();

        if (! Hash::check($request->current_password, $user->password)) {
            return response()->json(['error' => 'La contraseña actual no es correcta.'], 422);
        }

        // El hook de User marca password_changed_at: los JWT anteriores (otros equipos) dejan de valer.
        if (Hash::check($request->new_password, $user->password)) {
            return response()->json(['error' => 'La nueva contraseña debe ser distinta de la actual.', 'errors' => ['new_password' => ['La nueva contraseña debe ser distinta de la actual.']]], 422);
        }
        $user->update(['password' => Hash::make($request->new_password)]);
        // E61: la contraseña que definió el líder de club ya no está en uso.
        if ($user->debe_cambiar_password) $user->forceFill(['debe_cambiar_password' => false])->save();
        Audit::log('user.password_changed', $user);

        // El token de ESTA sesión también es anterior al cambio: se invalida y se entrega uno nuevo en la cookie,
        // para que quien cambió la contraseña siga dentro.
        try {
            auth()->guard('api')->invalidate(true);
        } catch (\Throwable $e) {
            // ya inválido
        }
        $token = auth()->guard('api')->login($user->fresh());

        return $this->respondWithToken($token)->setData(['message' => 'Contraseña actualizada correctamente.']);
    }

    /**
     * Permite que el usuario autenticado actualice su propio perfil
     * (institución, teléfono, cargo, nombre). Usado por el onboarding
     * del solicitante en el primer login. NO permite cambiar rol ni email.
     *
     * @return JsonResponse
     */
    public function updateProfile(Request $request)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            // `instituciones` se renombró a `empresas` (E25): la regla anterior daba 500 siempre.
            'empresa_id' => 'sometimes|nullable|integer|exists:empresas,id',
            'telefono' => 'sometimes|nullable|string|max:20',
            'cargo' => 'sometimes|nullable|string|max:255',
        ]);

        $user = auth('api')->user();

        // SEGURIDAD (24/09/2026): la empresa se elige UNA vez (onboarding del solicitante). Después solo la cambia el
        // admin; si no, cualquiera podría declararse de otra empresa y saltarse la lista negra.
        if (array_key_exists('empresa_id', $data)) {
            $cambiaEmpresa = (int) ($data['empresa_id'] ?? 0) !== (int) ($user->empresa_id ?? 0);
            if ($cambiaEmpresa && $user->empresa_id) {
                return response()->json(['error' => 'Tu empresa ya está registrada. Para cambiarla, escribe al administrador.'], 422);
            }
            if ($cambiaEmpresa && ! empty($data['empresa_id'])
                && \Illuminate\Support\Facades\Schema::hasTable('lista_negra')
                && \Illuminate\Support\Facades\DB::table('lista_negra')->where('empresa_id', $data['empresa_id'])->exists()) {
                return response()->json(['error' => 'No es posible asociar tu cuenta a esa empresa. Escribe al administrador.'], 422);
            }
            if (! $cambiaEmpresa) {
                unset($data['empresa_id']);
            }
        }

        $user->update($data);
        $user->loadMissing('rol', 'empresa');

        Audit::log('user.profile_updated', $user, ['fields' => array_keys($data)]);

        return response()->json(['user' => $user]);
    }

    /**
     * @param  string  $token
     * @return JsonResponse
     */
    /**
     * Helper público para que otros controllers (SSO) emitan el mismo JWT cookie.
     */
    public function callRespondWithToken($token)
    {
        return $this->respondWithToken($token);
    }

    protected function respondWithToken($token)
    {
        $ttlSeconds = auth()->guard('api')->factory()->getTTL() * 60;

        // Cookie HttpOnly — invisible a JavaScript, protegida contra XSS.
        // En producción: COOKIE_SECURE=true, COOKIE_DOMAIN=.dominio.edomex.gob.mx, COOKIE_SAME_SITE=Strict.
        // En local dev sin HTTPS, COOKIE_SECURE=false para que el browser acepte la cookie.
        [$cookieDomain, $isSecure, $sameSite] = self::atributosCookie();

        $cookie = cookie(
            'comecyt_auth',     // nombre
            $token,             // valor
            $ttlSeconds / 60,   // minutos
            '/',                // path
            $cookieDomain,      // domain (null = host actual)
            $isSecure,          // secure
            true,               // httpOnly
            false,              // raw
            $sameSite           // sameSite
        );

        $body = [
            'token_type' => 'bearer',
            'expires_in' => $ttlSeconds,
            'expires_at' => time() + $ttlSeconds, // epoch seconds — usado por frontend para refresh proactivo
            'user' => auth()->guard('api')->user()->load('rol', 'empresa'),
        ];

        // Token en body solo en entorno local/dev — en producción solo viaja via cookie HttpOnly
        if (! app()->environment('production')) {
            $body['access_token'] = $token;
        }

        return response()->json($body)->withCookie($cookie);
    }
}
