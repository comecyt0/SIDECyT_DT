<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TipoPrograma;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class TipoProgramaController extends Controller
{
    public function __construct()
    {
        // Laravel 11: middleware should be applied via routes or attributes
        // See routes/api.php for middleware application
    }

    /**
     * Get all program types
     */
    public function index()
    {
        $programas = TipoPrograma::all();

        return response()->json([
            'message' => 'OK',
            'data' => $programas,
            'count' => $programas->count(),
        ]);
    }

    /**
     * Store a newly created program type
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'clave' => 'required|string|unique:tipo_programas|max:20',
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'tipo_apoyo' => 'required|in:reembolso,concurrente,honorarios,especie', // E52: especie = kits (sin dinero)
            'tiene_etapas' => 'boolean',
            'num_etapas' => 'nullable|integer|min:1|max:10',
            'requiere_evaluacion_tecnica' => 'boolean',
            'requiere_fianza' => 'boolean',
            'porcentaje_fianza' => 'nullable|numeric|min:0|max:100',
            'tiene_equipo' => 'boolean',
            'min_miembros_equipo' => 'nullable|integer|min:1',
            'max_miembros_equipo' => 'nullable|integer|min:1',
            'rango_edad_min' => 'nullable|integer|min:1|max:120',
            'rango_edad_max' => 'nullable|integer|min:1|max:120',
            'monto_maximo' => 'required_unless:tipo_apoyo,especie|nullable|numeric|min:0',
            'porcentaje_aportacion_solicitante' => 'nullable|numeric|min:0|max:100',
            'puntaje_minimo_aprobatorio' => 'nullable|numeric|min:0|max:100',
            'activo' => 'boolean',
        ]);

        // Validate age range if both provided
        if ($validated['rango_edad_min'] ?? null && $validated['rango_edad_max'] ?? null) {
            if ($validated['rango_edad_min'] > $validated['rango_edad_max']) {
                return response()->json(['message' => 'Rango de edad inválido'], 422);
            }
        }

        // Validate num_etapas matches tiene_etapas
        if (($validated['tiene_etapas'] ?? false) && ! ($validated['num_etapas'] ?? null)) {
            return response()->json(['message' => 'num_etapas requerido cuando tiene_etapas es true'], 422);
        }
        // E52: el mínimo de $1,000 sigue para los apoyos con dinero; "especie" (kits) no lleva monto.
        if ($validated['tipo_apoyo'] !== 'especie' && (float) ($validated['monto_maximo'] ?? 0) < 1000) {
            return response()->json(['message' => 'El monto máximo debe ser de al menos $1,000.', 'errors' => ['monto_maximo' => ['El monto máximo debe ser de al menos $1,000.']]], 422);
        }
        if ($validated['tipo_apoyo'] === 'especie') {
            $validated['monto_maximo'] = null;
        }

        $programa = TipoPrograma::create($validated);

        return response()->json([
            'message' => 'Programa creado exitosamente',
            'data' => $programa,
        ], 201);
    }

    /**
     * Update the specified program type
     */
    public function update(Request $request, TipoPrograma $tipoPrograma)
    {
        $validated = $request->validate([
            'clave' => 'string|unique:tipo_programas,clave,'.$tipoPrograma->id.'|max:20',
            'nombre' => 'string|max:255',
            'descripcion' => 'nullable|string',
            'tipo_apoyo' => 'in:reembolso,concurrente,honorarios,especie',
            'tiene_etapas' => 'boolean',
            'num_etapas' => 'nullable|integer|min:1|max:10',
            'requiere_evaluacion_tecnica' => 'boolean',
            'requiere_fianza' => 'boolean',
            'porcentaje_fianza' => 'nullable|numeric|min:0|max:100',
            'tiene_equipo' => 'boolean',
            'min_miembros_equipo' => 'nullable|integer|min:1',
            'max_miembros_equipo' => 'nullable|integer|min:1',
            'rango_edad_min' => 'nullable|integer|min:1|max:120',
            'rango_edad_max' => 'nullable|integer|min:1|max:120',
            'monto_maximo' => 'nullable|numeric|min:0',
            'porcentaje_aportacion_solicitante' => 'nullable|numeric|min:0|max:100',
            'puntaje_minimo_aprobatorio' => 'nullable|numeric|min:0|max:100',
            'activo' => 'boolean',
        ]);

        // Validate age range
        if (($validated['rango_edad_min'] ?? null) && ($validated['rango_edad_max'] ?? null)) {
            if ($validated['rango_edad_min'] > $validated['rango_edad_max']) {
                return response()->json(['message' => 'Rango de edad inválido'], 422);
            }
        }

        // Validate num_etapas matches tiene_etapas
        if (($validated['tiene_etapas'] ?? false) && ! ($validated['num_etapas'] ?? null)) {
            return response()->json(['message' => 'num_etapas requerido cuando tiene_etapas es true'], 422);
        }
        // E52: el mínimo de $1,000 sigue para los apoyos con dinero; "especie" (kits) no lleva monto. Cambiar de/hacia
        // "especie" con clubes o solicitudes registradas rompería su flujo: no se permite.
        $tipoFinal = $validated['tipo_apoyo'] ?? $tipoPrograma->tipo_apoyo;
        if (isset($validated['tipo_apoyo']) && $validated['tipo_apoyo'] !== $tipoPrograma->tipo_apoyo
            && ($validated['tipo_apoyo'] === 'especie' || $tipoPrograma->tipo_apoyo === 'especie')
            && \App\Models\Convocatoria::where('tipo_programa_id', $tipoPrograma->id)->where(fn ($q) => $q->whereHas('clubes')->orWhereHas('solicitudes'))->exists()) {
            return response()->json(['message' => 'No se puede cambiar a o desde «Apoyo en especie»: ya hay registros en sus convocatorias.'], 422);
        }
        if ($tipoFinal !== 'especie' && array_key_exists('monto_maximo', $validated) && (float) ($validated['monto_maximo'] ?? 0) < 1000) {
            return response()->json(['message' => 'El monto máximo debe ser de al menos $1,000.', 'errors' => ['monto_maximo' => ['El monto máximo debe ser de al menos $1,000.']]], 422);
        }

        $tipoPrograma->update($validated);

        // Clear cache for all program catalogs
        $this->clearProgramCache($tipoPrograma->id);

        return response()->json([
            'message' => 'Programa actualizado exitosamente',
            'data' => $tipoPrograma->refresh(),
        ]);
    }

    /**
     * Delete the specified program type
     */
    public function destroy(TipoPrograma $tipoPrograma)
    {
        // Check if program has solicitudes - prevent deletion
        if ($tipoPrograma->solicitudes()->exists()) {
            return response()->json([
                'message' => 'No se puede eliminar un programa con solicitudes asociadas',
            ], 409);
        }

        $tipoPrograma->delete();

        // Clear cache
        $this->clearProgramCache($tipoPrograma->id);

        return response()->json([
            'message' => 'Programa eliminado exitosamente',
        ]);
    }

    /**
     * Clear all cache keys for a program
     */
    protected function clearProgramCache(int $programId)
    {
        $keys = [
            "programa:{$programId}:full",
            "programa:{$programId}:campos",
            "programa:{$programId}:documentos",
            "programa:{$programId}:criterios",
            "programa:{$programId}:rubros",
            "programa:{$programId}:etapas",
            "programa:{$programId}:modalidades",
        ];

        foreach ($keys as $key) {
            Cache::forget($key);
        }
    }
}
