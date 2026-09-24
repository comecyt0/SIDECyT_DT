<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * ApiGatewayMiddleware — MONITOREO de tráfico (ya no bloquea).
 *
 * SEGURIDAD (24/09/2026): antes, al ver >= 1000 IPs distintas en 60 s, apagaba TODA la API para TODOS durante
 * 5 minutos (503). Eso convertía cualquier botnet —o el tráfico legítimo del día de cierre de una convocatoria—
 * en una caída total del servicio: una denegación de servicio que el propio sistema se hacía. Ahora solo registra
 * la anomalía (una vez por ventana) en el canal `security`. La protección contra abuso la dan los límites por IP y
 * por ruta (RateLimitMiddleware, `throttle:*`, AuthLoginRateLimitMiddleware), que castigan al que abusa sin tirar
 * a los demás.
 */
class ApiGatewayMiddleware
{
    private const MAX_DISTINCT_IPS = 1000;

    private const IP_WINDOW_SECONDS = 60;

    private const IPS_SET_KEY = 'api_gateway_ips';

    public function handle(Request $request, Closure $next): Response
    {
        $ip = (string) $request->ip();
        $maxIps = (int) env('API_GATEWAY_MAX_IPS', self::MAX_DISTINCT_IPS);
        $ahora = now()->timestamp;

        $ips = Cache::get(self::IPS_SET_KEY, []);
        // Solo se escribe si la IP es nueva o su marca tiene más de 10 s: menos escrituras en la caché (BD).
        if (! isset($ips[$ip]) || $ahora - $ips[$ip] > 10) {
            $ips[$ip] = $ahora;
            $cutoff = $ahora - self::IP_WINDOW_SECONDS;
            $ips = array_filter($ips, fn ($ts) => $ts >= $cutoff);
            Cache::put(self::IPS_SET_KEY, $ips, self::IP_WINDOW_SECONDS + 10);

            if (count($ips) >= $maxIps && Cache::add('api_gateway_alerta', true, self::IP_WINDOW_SECONDS)) {
                Log::channel('security')->critical('Tráfico inusual: muchas IPs distintas en 60 s', [
                    'distinct_ips' => count($ips),
                    'threshold' => $maxIps,
                ]);
            }
        }

        return $next($request);
    }
}
