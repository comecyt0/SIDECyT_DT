<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * CircuitBreakerMiddleware
 *
 * Implementa el patrón Circuit Breaker a nivel de API.
 * Estados: CLOSED → OPEN → HALF-OPEN → CLOSED
 *
 * - CLOSED: funcionamiento normal
 * - OPEN: tras 5 errores 5xx consecutivos — rechaza todas las peticiones por 30s
 * - HALF-OPEN: permite una petición de prueba tras el timeout
 */
class CircuitBreakerMiddleware
{
    private const STATE_CLOSED = 'CLOSED';

    private const STATE_OPEN = 'OPEN';

    private const STATE_HALF_OPEN = 'HALF_OPEN';

    public function handle(Request $request, Closure $next): Response
    {
        $threshold = (int) env('CIRCUIT_BREAKER_THRESHOLD', 5);
        $timeout = (int) env('CIRCUIT_BREAKER_TIMEOUT', 30);

        // Scope per IP so one attacker cannot open the circuit for all users
        $ip = md5($request->ip());
        $keyState = "cb_state_{$ip}";
        $keyFailures = "cb_failures_{$ip}";
        $keyOpened = "cb_opened_{$ip}";

        $state = Cache::get($keyState, self::STATE_CLOSED);
        $failures = (int) Cache::get($keyFailures, 0);
        $openedAt = Cache::get($keyOpened);

        // Si está OPEN, verificar si pasó el timeout para pasar a HALF-OPEN
        if ($state === self::STATE_OPEN) {
            $elapsed = now()->timestamp - (int) $openedAt;

            if ($elapsed >= $timeout) {
                Cache::put($keyState, self::STATE_HALF_OPEN, 3600);
                $state = self::STATE_HALF_OPEN;
            } else {
                return response()->json([
                    'error' => 'Circuit Breaker Open',
                    'message' => 'El sistema está temporalmente en mantenimiento. Intenta en unos momentos.',
                    'code' => 503,
                    'retry_after' => $timeout - $elapsed,
                ], 503);
            }
        }

        $response = $next($request);
        $statusCode = $response->getStatusCode();

        // Only count genuine server-side failures (5xx excluding 503 from CB itself).
        // 4xx errors are client-induced and must not count toward the threshold —
        // otherwise an attacker could deliberately trigger CB for their own IP.
        if ($statusCode >= 500 && $statusCode !== 503) {
            $newFailures = $failures + 1;
            Cache::put($keyFailures, $newFailures, 3600);

            if ($newFailures >= $threshold || $state === self::STATE_HALF_OPEN) {
                Cache::put($keyState, self::STATE_OPEN, 3600);
                Cache::put($keyOpened, now()->timestamp, 3600);

                \Log::error('CIRCUIT BREAKER ABIERTO', [
                    'ip' => $request->ip(),
                    'failures' => $newFailures,
                    'threshold' => $threshold,
                    'state' => self::STATE_OPEN,
                ]);
            }
        } elseif ($statusCode < 500) {
            // Respuesta exitosa → resetear contadores
            if ($state === self::STATE_HALF_OPEN) {
                Cache::forget($keyState);
                Cache::forget($keyFailures);
                Cache::forget($keyOpened);
            } elseif ($failures > 0) {
                Cache::put($keyFailures, 0, 3600);
            }
        }

        return $response;
    }
}
