<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;

class ReverbStatusController extends Controller
{
    /**
     * GET /admin/reverb/status
     *
     * Devuelve si Reverb está configurado y si el puerto WebSocket responde a un
     * TCP-connect. No autentica al protocolo Pusher (eso requiere app secret) —
     * solo verifica que el proceso esté vivo. Útil para el admin para detectar
     * que el daemon se cayó.
     */
    public function status()
    {
        $configured = (bool) config('reverb.apps.apps.0.key', null) || env('REVERB_APP_KEY');
        $host = (string) config('reverb.servers.reverb.host', '127.0.0.1');
        $port = (int) config('reverb.servers.reverb.port', 8080);
        $publicHost = (string) env('REVERB_HOST', $host);
        $scheme = (string) env('REVERB_SCHEME', 'http');

        $reachable = false;
        $errMsg = null;
        $latencyMs = null;

        if ($host && $port) {
            $start = microtime(true);
            $errno = 0;
            $errstr = '';
            // Connect-only check, 1.5s timeout
            $fp = @fsockopen($host, $port, $errno, $errstr, 1.5);
            $latencyMs = (int) ((microtime(true) - $start) * 1000);
            if ($fp) {
                $reachable = true;
                fclose($fp);
            } else {
                $errMsg = $errstr ?: "errno {$errno}";
            }
        }

        return response()->json([
            'configured' => $configured,
            'host' => $publicHost,
            'port' => $port,
            'scheme' => $scheme,
            'reachable' => $reachable,
            'latency_ms' => $latencyMs,
            'error' => $errMsg,
            'broadcast_driver' => (string) config('broadcasting.default'),
            'hint' => $reachable
                ? 'Reverb está escuchando. Para revisar suscripciones activas, conectarse al Pusher HTTP API con REVERB_APP_KEY/SECRET.'
                : 'Reverb no responde. Verifica: `php artisan reverb:start` o el daemon de Supervisor/systemd. También revisa el firewall del puerto.',
        ]);
    }
}
