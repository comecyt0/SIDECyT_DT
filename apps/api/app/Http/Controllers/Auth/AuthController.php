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

        if (! $token = auth()->guard('api')->attempt($credentials)) {
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
        if (! $user || ! $user->hasTwoFactorEnabled()) {
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
    public function logout()
    {
        auth()->guard('api')->logout();

        // Limpiar cookie HttpOnly del JWT — debe usar el mismo dominio/secure/samesite que respondWithToken
        $cookieDomain = env('COOKIE_DOMAIN');
        $isSecure = filter_var(env('COOKIE_SECURE', app()->environment('production')), FILTER_VALIDATE_BOOLEAN);
        $sameSite = (string) env('COOKIE_SAME_SITE', 'Strict');
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
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        $user = auth('api')->user();

        if (! Hash::check($request->current_password, $user->password)) {
            return response()->json(['error' => 'La contraseña actual no es correcta.'], 422);
        }

        $user->update(['password' => Hash::make($request->new_password)]);

        return response()->json(['message' => 'Contraseña actualizada correctamente.']);
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
            'empresa_id' => 'sometimes|nullable|exists:instituciones,id',
            'telefono' => 'sometimes|nullable|string|max:20',
            'cargo' => 'sometimes|nullable|string|max:255',
        ]);

        $user = auth('api')->user();
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
        $cookieDomain = env('COOKIE_DOMAIN'); // null en dev
        $isSecure = filter_var(env('COOKIE_SECURE', app()->environment('production')), FILTER_VALIDATE_BOOLEAN);
        $sameSite = (string) env('COOKIE_SAME_SITE', 'Strict');

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
