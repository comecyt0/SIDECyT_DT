<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * ApiGatewayMiddleware
 *
 * Analiza patrones de tráfico completos.
 * Si se detectan >= 1000 IPs distintas en una ventana de 60 segundos,
 * activa modo "lockdown" durante 5 minutos bloqueando todo el tráfico.
 */
class ApiGatewayMiddleware
{
    private const MAX_DISTINCT_IPS = 1000;

    private const IP_WINDOW_SECONDS = 60;

    private const LOCKDOWN_CACHE_KEY = 'api_gateway_lockdown';

    private const IPS_SET_KEY = 'api_gateway_ips';

    public function handle(Request $request, Closure $next): Response
    {
        // Verificar si hay lockdown activo
        if (Cache::has(self::LOCKDOWN_CACHE_KEY)) {
            $ttl = Cache::get(self::LOCKDOWN_CACHE_KEY.'_ttl', 0);

            return response()->json([
                'error' => 'Service Unavailable',
                'message' => 'El sistema está temporalmente no disponible por actividad inusual. Intenta más tarde.',
                'code' => 503,
            ], 503, [
                'Retry-After' => $ttl,
            ]);
        }

        $ip = $request->ip();
        $ipsKey = self::IPS_SET_KEY;
        $maxIps = (int) env('API_GATEWAY_MAX_IPS', self::MAX_DISTINCT_IPS);
        $lockdownMinutes = (int) env('API_GATEWAY_LOCKDOWN_MINUTES', 5);

        // Registrar IP única en ventana de tiempo
        $ips = Cache::get($ipsKey, []);
        $ips[$ip] = now()->timestamp;

        // Purgar IPs fuera de la ventana de tiempo
        $cutoff = now()->timestamp - self::IP_WINDOW_SECONDS;
        $ips = array_filter($ips, fn ($ts) => $ts >= $cutoff);

        Cache::put($ipsKey, $ips, self::IP_WINDOW_SECONDS + 10);

        $distinctIpCount = count($ips);

        // Activar lockdown si se superan el umbral
        if ($distinctIpCount >= $maxIps) {
            $lockdownSeconds = $lockdownMinutes * 60;
            Cache::put(self::LOCKDOWN_CACHE_KEY, true, $lockdownSeconds);
            Cache::put(self::LOCKDOWN_CACHE_KEY.'_ttl', $lockdownSeconds, $lockdownSeconds);

            \Log::critical('API GATEWAY LOCKDOWN ACTIVADO', [
                'distinct_ips' => $distinctIpCount,
                'threshold' => $maxIps,
                'lockdown_min' => $lockdownMinutes,
            ]);

            return response()->json([
                'error' => 'Service Unavailable',
                'message' => 'El sistema detectó actividad anormal y está en modo de protección.',
                'code' => 503,
            ], 503);
        }

        return $next($request);
    }
}
