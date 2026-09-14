<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * B4 — Endpoint de salud para monitoreo externo (UptimeRobot, Zabbix, Prometheus blackbox).
 *
 * Seguridad:
 *   - Requiere header `X-Health-Token` que coincida con `HEALTH_TOKEN` en .env
 *     (allowlist por shared secret en vez de exponer estado a Internet abierta).
 *   - Comparación timing-safe con hash_equals.
 *   - Sin detalles de stack trace ni versiones en la respuesta (evita info disclosure).
 *   - Si el token no está configurado en .env, el endpoint rechaza por default
 *     (fail-secure, no fail-open).
 */
class HealthController extends Controller
{
    public function check(Request $request): JsonResponse
    {
        // ── Auth por shared secret (timing-safe) ─────────────────────
        $expected = (string) env('HEALTH_TOKEN', '');
        $provided = (string) $request->header('X-Health-Token', '');

        if ($expected === '' || ! hash_equals($expected, $provided)) {
            // No revelar si el token está mal o si no hay endpoint
            return response()->json(['status' => 'not_found'], 404);
        }

        $checks = [];
        $overallOk = true;

        // ── Database ────────────────────────────────────────────────
        try {
            DB::connection()->getPdo();
            $checks['database'] = ['ok' => true];
        } catch (\Throwable $e) {
            $checks['database'] = ['ok' => false, 'error' => 'unavailable'];
            $overallOk = false;
        }

        // ── Cache ───────────────────────────────────────────────────
        try {
            $probeKey = 'health_probe_'.bin2hex(random_bytes(8));
            Cache::put($probeKey, 1, 5);
            $value = Cache::get($probeKey);
            Cache::forget($probeKey);
            $checks['cache'] = ['ok' => $value === 1];
            $overallOk = $overallOk && $checks['cache']['ok'];
        } catch (\Throwable $e) {
            $checks['cache'] = ['ok' => false, 'error' => 'unavailable'];
            $overallOk = false;
        }

        // ── Storage ─────────────────────────────────────────────────
        try {
            $checks['storage'] = ['ok' => Storage::disk('public')->exists('') || is_writable(storage_path())];
            $overallOk = $overallOk && $checks['storage']['ok'];
        } catch (\Throwable $e) {
            $checks['storage'] = ['ok' => false];
            $overallOk = false;
        }

        $status = $overallOk ? 'ok' : 'degraded';
        $httpCode = $overallOk ? 200 : 503;

        // Devuelve mínimo de información: nada de versiones, paths, host names.
        return response()->json([
            'status' => $status,
            'checks' => $checks,
            'time' => now()->toIso8601String(),
        ], $httpCode);
    }
}
