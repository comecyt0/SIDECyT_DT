<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * RateLimitMiddleware
 *
 * Aplica un límite global de peticiones por IP. Default: 300/min.
 * 100/min era muy bajo para una SPA admin que dispara ~15-20 requests por
 * página (stats, charts, notificaciones, etc.) — un usuario navegando
 * normalmente disparaba 429 después de 5-6 clicks.
 *
 * Override con RATE_LIMIT_MAX en .env. Para auth/login hay un middleware
 * dedicado más estricto (AuthLoginRateLimitMiddleware).
 */
class RateLimitMiddleware
{
    private const MAX_REQUESTS = 300;

    private const WINDOW_SECONDS = 60;

    public function handle(Request $request, Closure $next): Response
    {
        $ip = $request->ip();
        $cacheKey = "rate_limit:{$ip}";

        $attempts = (int) Cache::get($cacheKey, 0);
        // config/comecyt.php (security.*): nunca env() aquí — con config:cache devolvería null.
        $max = (int) config('comecyt.security.rate_limit_max', self::MAX_REQUESTS) ?: self::MAX_REQUESTS;
        $ventana = (int) config('comecyt.security.rate_limit_window', self::WINDOW_SECONDS) ?: self::WINDOW_SECONDS;

        if ($attempts >= $max) {
            return response()->json([
                'error' => 'Too Many Requests',
                'message' => 'Has excedido el límite de solicitudes. Intenta de nuevo en un minuto.',
                'code' => 429,
            ], 429, [
                'X-RateLimit-Limit' => $max,
                'X-RateLimit-Remaining' => 0,
                'Retry-After' => $ventana,
            ]);
        }

        $remaining = $max - ($attempts + 1);

        if ($attempts === 0) {
            Cache::put($cacheKey, 1, $ventana);
        } else {
            Cache::increment($cacheKey);
        }

        $response = $next($request);

        $response->headers->set('X-RateLimit-Limit', $max);
        $response->headers->set('X-RateLimit-Remaining', max(0, $remaining));

        return $response;
    }
}
