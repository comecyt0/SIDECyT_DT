<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AdminMiddleware
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

        // Check if user has admin role (rol_id = 1)
        if ($user->rol_id !== config('comecyt.roles.admin')) {
            return response()->json([
                'message' => 'Unauthorized - Admin access required',
                'error' => 'insufficient_permissions',
            ], 403);
        }

        return $next($request);
    }
}
