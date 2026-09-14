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
        $criterios = $tipoPrograma->criterios()->get();

        return response()->json([
            'message' => 'OK',
            'data' => $criterios,
            'count' => $criterios->count(),
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

        $criterio->delete();

        $this->clearProgramCache($tipoPrograma->id);

        return response()->json([
            'message' => 'Criterio eliminado exitosamente',
        ]);
    }

    protected function clearProgramCache(int $programId)
    {
        Cache::forget("programa:{$programId}:criterios");
        Cache::forget("programa:{$programId}:full");
    }
}
