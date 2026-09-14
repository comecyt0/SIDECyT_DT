<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProgramaModalidad;
use App\Models\TipoPrograma;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ProgramaModalidadController extends Controller
{
    public function __construct()
    {

        // Laravel 11: middleware applied via routes

    }

    public function index(TipoPrograma $tipoPrograma)
    {
        $modalidades = $tipoPrograma->modalidades()->get();

        return response()->json([
            'message' => 'OK',
            'data' => $modalidades,
            'count' => $modalidades->count(),
        ]);
    }

    public function store(Request $request, TipoPrograma $tipoPrograma)
    {
        $validated = $request->validate([
            'clave' => 'required|string|max:20',
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'activo' => 'boolean',
        ]);

        $validated['tipo_programa_id'] = $tipoPrograma->id;

        $modalidad = ProgramaModalidad::create($validated);

        $this->clearProgramCache($tipoPrograma->id);

        return response()->json([
            'message' => 'Modalidad creada exitosamente',
            'data' => $modalidad,
        ], 201);
    }

    public function update(Request $request, TipoPrograma $tipoPrograma, ProgramaModalidad $modalidad)
    {
        if ($modalidad->tipo_programa_id != $tipoPrograma->id) {
            return response()->json(['message' => 'Modalidad no pertenece a este programa'], 404);
        }

        $validated = $request->validate([
            'clave' => 'string|max:20',
            'nombre' => 'string|max:255',
            'descripcion' => 'nullable|string',
            'activo' => 'boolean',
        ]);

        $modalidad->update($validated);

        $this->clearProgramCache($tipoPrograma->id);

        return response()->json([
            'message' => 'Modalidad actualizada exitosamente',
            'data' => $modalidad,
        ]);
    }

    public function destroy(TipoPrograma $tipoPrograma, ProgramaModalidad $modalidad)
    {
        if ($modalidad->tipo_programa_id != $tipoPrograma->id) {
            return response()->json(['message' => 'Modalidad no pertenece a este programa'], 404);
        }

        $modalidad->delete();

        $this->clearProgramCache($tipoPrograma->id);

        return response()->json([
            'message' => 'Modalidad eliminada exitosamente',
        ]);
    }

    protected function clearProgramCache(int $programId)
    {
        Cache::forget("programa:{$programId}:modalidades");
        Cache::forget("programa:{$programId}:full");
    }
}
