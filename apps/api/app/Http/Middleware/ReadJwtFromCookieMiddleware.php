<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * ReadJwtFromCookieMiddleware
 *
 * Si la request no lleva Authorization header pero sí la cookie
 * HttpOnly 'comecyt_auth', inyecta el token como Bearer header
 * para que el guard JWT de tymon/jwt-auth lo procese normalmente.
 *
 * Esto permite mantener la lógica JWT existente intacta mientras
 * el token viaja en cookie HttpOnly (invisible a JavaScript).
 */
class ReadJwtFromCookieMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->bearerToken() && $request->hasCookie('comecyt_auth')) {
            $token = $request->cookie('comecyt_auth');
            $request->headers->set('Authorization', 'Bearer '.$token);
        }

        return $next($request);
    }
}
