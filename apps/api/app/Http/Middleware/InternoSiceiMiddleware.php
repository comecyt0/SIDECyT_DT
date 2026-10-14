<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * E72 — Canal interno SIGAE ↔ SICEI (2FA único). Solo lo usa la API de SICEI desde el propio servidor.
 *
 * Tres candados, todos obligatorios; cualquier falla responde 404 vacío (no confirma que el canal exista):
 *  1. Origen: la IP de la conexión TCP (`REMOTE_ADDR` crudo, NUNCA `$request->ip()`, que confía en X-Forwarded-For)
 *     debe estar en `comecyt.interno_sicei.ips` (loopback y la IP propia del servidor). Lo que llega del balanceador
 *     (100.64.0.0/10) nunca pasa.
 *  2. Firma: X-Sidecyt-Firma = HMAC-SHA256(secreto, fecha \n MÉTODO \n ruta \n cuerpo), comparada en tiempo constante.
 *  3. Frescura y un solo uso: X-Sidecyt-Fecha a ±60 s y la misma firma no se acepta dos veces (caché 120 s).
 */
class InternoSiceiMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $secreto = (string) config('comecyt.interno_sicei.secreto');
        $ips = (array) config('comecyt.interno_sicei.ips');
        $origen = (string) $request->server('REMOTE_ADDR');

        $fecha = (string) $request->header('X-Sidecyt-Fecha', '');
        $firma = (string) $request->header('X-Sidecyt-Firma', '');

        $valido = strlen($secreto) >= 32
            && in_array($origen, $ips, true)
            && ctype_digit($fecha)
            && abs(time() - (int) $fecha) <= 60
            && preg_match('/^[a-f0-9]{64}$/', $firma) === 1
            && hash_equals(
                hash_hmac('sha256', $fecha."\n".$request->method()."\n/".ltrim($request->path(), '/')."\n".$request->getContent(), $secreto),
                $firma,
            )
            && Cache::add('interno-sicei:'.$firma, 1, 120);

        if (! $valido) {
            Log::channel(config('logging.default'))->warning('Canal interno SICEI: petición rechazada', ['origen' => $origen]);

            return response('', 404);
        }

        return $next($request);
    }
}
