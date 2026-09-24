<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class ApiAuthenticate
{
    /**
     * Handle an incoming request.
     *
     * SEGURIDAD (24/09/2026), además de validar firma y vigencia del JWT:
     *  - la cuenta debe seguir activa (antes, desactivar a alguien no le cortaba la sesión ni el login);
     *  - el token debe ser posterior al último cambio de contraseña (ver User::tokenAnteriorAlCambioDeClave).
     *
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        try {
            if (! $token = JWTAuth::getToken()) {
                throw new AuthenticationException('Token not provided');
            }

            if (! $user = JWTAuth::authenticate($token)) {
                throw new AuthenticationException('Invalid token');
            }

            if ($user->activo === false) {
                throw new AuthenticationException('Inactive user');
            }

            $iat = JWTAuth::getPayload($token)->get('iat');
            if ($user->tokenAnteriorAlCambioDeClave(is_numeric($iat) ? (int) $iat : null)) {
                throw new AuthenticationException('Token issued before password change');
            }

            auth()->setUser($user);
            // E45: `$request->user()` debe devolver al usuario del JWT. Sin esto, `throttle:*` no lo reconocía y
            // contaba por IP: todos los usuarios detrás de una misma IP (NAT institucional, o el propio servidor en
            // serverFetch) compartían un solo contador entre todas las rutas limitadas.
            $request->setUserResolver(fn () => $user);
            // E45: la caché de alcance es por petición (los workers de cola son procesos largos).
            \App\Support\Alcance::olvidar();
        } catch (\Exception $e) {
            throw new AuthenticationException('Unauthenticated');
        }

        return $next($request);
    }
}
