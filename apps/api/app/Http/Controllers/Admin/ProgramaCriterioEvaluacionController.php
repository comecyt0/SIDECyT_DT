<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProgramaCriterioEvaluacion;
use App\Models\TipoPrograma;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ProgramaCriterioEvaluacionController extends Controller
{
    public function __construct()
    {

        // Laravel 11: middleware applied via routes

    }

    public function index(TipoPrograma $tipoPrograma)
    {
        // E56: `en_uso` = ya hay dictámenes que lo calificaron.
        $criterios = \App\Support\EstructuraPrograma::marcarEnUso('criterios', $tipoPrograma->id, $tipoPrograma->criterios()->orderBy('orden')->orderBy('id')->get());

        return response()->json([
            'message' => 'OK',
            'data' => $criterios,
            'count' => $criterios->count(),
            // Los pesos de los criterios visibles deben sumar 100: el panel avisa si no.
            'suma_ponderacion' => round((float) $criterios->where('activo', true)->sum('ponderacion'), 2),
        ]);
    }

    public function store(Request $request, TipoPrograma $tipoPrograma)
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'puntaje_maximo' => 'required|numeric|min:1|max:100',
            'ponderacion' => 'required|numeric|min:0|max:100',
            'etapa_id' => 'nullable|exists:programa_etapas,id',
            'activo' => 'boolean',
        ]);

        $validated['tipo_programa_id'] = $tipoPrograma->id;

        $criterio = ProgramaCriterioEvaluacion::create($validated);

        $this->clearProgramCache($tipoPrograma->id);

        return response()->json([
            'message' => 'Criterio creado exitosamente',
            'data' => $criterio,
        ], 201);
    }

    public function update(Request $request, TipoPrograma $tipoPrograma, ProgramaCriterioEvaluacion $criterio)
    {
        if ($criterio->tipo_programa_id != $tipoPrograma->id) {
            return response()->json(['message' => 'Criterio no pertenece a este programa'], 404);
        }

        $validated = $request->validate([
            'nombre' => 'string|max:255',
            'descripcion' => 'nullable|string',
            'puntaje_maximo' => 'numeric|min:1|max:100',
            'ponderacion' => 'numeric|min:0|max:100',
            'etapa_id' => 'nullable|exists:programa_etapas,id',
            'activo' => 'boolean',
        ]);

        $criterio->update($validated);

        $this->clearProgramCache($tipoPrograma->id);

        return response()->json([
            'message' => 'Criterio actualizado exitosamente',
            'data' => $criterio,
        ]);
    }

    public function destroy(TipoPrograma $tipoPrograma, ProgramaCriterioEvaluacion $criterio)
    {
        if ($criterio->tipo_programa_id != $tipoPrograma->id) {
            return response()->json(['message' => 'Criterio no pertenece a este programa'], 404);
        }

        // E56: antes se borraba siempre y en cascada se perdían las calificaciones de los dictámenes; ahora se oculta si
        // ya se calificó y solo se elimina si nadie lo usó.
        $resultado = \App\Support\EstructuraPrograma::quitar('criterios', $criterio);

        $this->clearProgramCache($tipoPrograma->id);

        return response()->json([
            'message' => \App\Support\EstructuraPrograma::mensaje($resultado, 'el criterio'),
            'resultado' => $resultado,
        ]);
    }

    protected function clearProgramCache(int $programId)
    {
        Cache::forget("programa:{$programId}:criterios");
        Cache::forget("programa:{$programId}:full");
    }
}
