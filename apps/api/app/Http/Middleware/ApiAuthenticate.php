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

            auth()->setUser($user);
        } catch (\Exception $e) {
            throw new AuthenticationException('Unauthenticated');
        }

        return $next($request);
    }
}
