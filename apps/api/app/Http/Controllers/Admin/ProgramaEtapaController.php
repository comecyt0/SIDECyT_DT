<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProgramaEtapa;
use App\Models\TipoPrograma;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ProgramaEtapaController extends Controller
{
    public function __construct()
    {

        // Laravel 11: middleware applied via routes

    }

    public function index(TipoPrograma $tipoPrograma)
    {
        $etapas = $tipoPrograma->etapas()->orderBy('numero_etapa')->get();

        return response()->json([
            'message' => 'OK',
            'data' => $etapas,
            'count' => $etapas->count(),
        ]);
    }

    public function store(Request $request, TipoPrograma $tipoPrograma)
    {
        $validated = $request->validate([
            'numero_etapa' => 'required|integer|min:1',
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'duracion_meses' => 'nullable|integer|min:1',
            'es_evaluacion_tecnica' => 'boolean',
            'activo' => 'boolean',
        ]);

        $validated['tipo_programa_id'] = $tipoPrograma->id;

        $etapa = ProgramaEtapa::create($validated);

        $this->clearProgramCache($tipoPrograma->id);

        return response()->json([
            'message' => 'Etapa creada exitosamente',
            'data' => $etapa,
        ], 201);
    }

    public function update(Request $request, TipoPrograma $tipoPrograma, ProgramaEtapa $etapa)
    {
        if ($etapa->tipo_programa_id != $tipoPrograma->id) {
            return response()->json(['message' => 'Etapa no pertenece a este programa'], 404);
        }

        $validated = $request->validate([
            'numero_etapa' => 'integer|min:1',
            'nombre' => 'string|max:255',
            'descripcion' => 'nullable|string',
            'duracion_meses' => 'nullable|integer|min:1',
            'es_evaluacion_tecnica' => 'boolean',
            'activo' => 'boolean',
        ]);

        $etapa->update($validated);

        $this->clearProgramCache($tipoPrograma->id);

        return response()->json([
            'message' => 'Etapa actualizada exitosamente',
            'data' => $etapa,
        ]);
    }

    public function destroy(TipoPrograma $tipoPrograma, ProgramaEtapa $etapa)
    {
        if ($etapa->tipo_programa_id != $tipoPrograma->id) {
            return response()->json(['message' => 'Etapa no pertenece a este programa'], 404);
        }

        $etapa->delete();

        $this->clearProgramCache($tipoPrograma->id);

        return response()->json([
            'message' => 'Etapa eliminada exitosamente',
        ]);
    }

    protected function clearProgramCache(int $programId)
    {
        Cache::forget("programa:{$programId}:etapas");
        Cache::forget("programa:{$programId}:full");
    }
}
