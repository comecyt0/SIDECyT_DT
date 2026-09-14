<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class EvaluadorMiddleware
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

        // Check if user has evaluador role (rol_id = 3)
        if ($user->rol_id !== config('comecyt.roles.evaluador')) {
            return response()->json([
                'message' => 'Unauthorized - Evaluador access required',
                'error' => 'insufficient_permissions',
            ], 403);
        }

        return $next($request);
    }
}
