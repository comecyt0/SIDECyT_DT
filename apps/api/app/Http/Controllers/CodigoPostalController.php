<?php

namespace App\Http\Controllers;

use App\Models\CodigoPostal;
use Illuminate\Support\Facades\Cache;

/**
 * E52 — Autollenado de domicilio por código postal (solo Estado de México, catálogo oficial SEPOMEX).
 * Público (lo usa el registro), solo lectura, throttle propio, lista blanca de campos y una sola consulta por código:
 * nunca devuelve el catálogo completo (la licencia de Correos de México prohíbe redistribuirlo).
 */
class CodigoPostalController extends Controller
{
    public function show(string $cp)
    {
        if (! preg_match('/^\d{5}$/', $cp)) {
            return response()->json(['message' => 'El código postal debe tener 5 dígitos.'], 422);
        }

        $datos = Cache::remember("cp:{$cp}", 86400, function () use ($cp) {
            $filas = CodigoPostal::where('cp', $cp)->orderBy('asentamiento')->get(['asentamiento', 'tipo_asentamiento', 'municipio']);
            if ($filas->isEmpty()) {
                return null;
            }

            return [
                'cp' => $cp,
                'estado' => (string) config('comecyt.registro.estado_cp'),
                'municipio' => $filas->first()->municipio,
                'colonias' => $filas->map(fn ($f) => ['nombre' => $f->asentamiento, 'tipo' => $f->tipo_asentamiento])->values()->all(),
            ];
        });

        if ($datos === null) {
            return response()->json(['message' => 'Ese código postal no pertenece al Estado de México.'], 404);
        }

        return response()->json($datos)->header('Cache-Control', 'public, max-age=86400');
    }
}
