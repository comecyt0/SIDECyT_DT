<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class RevisorMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response|RedirectResponse)  $next
     * @return Response|RedirectResponse
     */
    public function handle(Request $request, Closure $next)
    {
        if (! auth('api')->check()) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $user = auth('api')->user();

        // Check if user has revisor role (rol_id = 2)
        if ($user->rol_id !== config('comecyt.roles.revisor')) {
            return response()->json([
                'message' => 'Unauthorized - Revisor access required',
                'error' => 'insufficient_permissions',
            ], 403);
        }

        return $next($request);
    }
}
