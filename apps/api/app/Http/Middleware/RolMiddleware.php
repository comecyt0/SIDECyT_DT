<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * E45 — `rol:admin,admin_convocatoria,consulta`: deja pasar solo a los roles listados (slugs de config/comecyt.php).
 * El alcance por convocatoria/periodo lo aplica aparte `alcance` + App\Support\Alcance.
 */
class RolMiddleware
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = auth('api')->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        if (! $user->tieneRol(...$roles)) {
            return response()->json([
                'message' => 'No tienes permiso para esta acción.',
                'error' => 'insufficient_permissions',
            ], 403);
        }

        return $next($request);
    }
}
