<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProgramaCampo;
use App\Models\TipoPrograma;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ProgramaCampoController extends Controller
{
    public function __construct()
    {

        // Laravel 11: middleware applied via routes

    }

    /**
     * Get all fields for a program
     */
    public function index(TipoPrograma $tipoPrograma)
    {
        $campos = $tipoPrograma->campos()->orderBy('orden')->get();

        return response()->json([
            'message' => 'OK',
            'data' => $campos,
            'count' => $campos->count(),
        ]);
    }

    /**
     * Store a new field for a program
     */
    public function store(Request $request, TipoPrograma $tipoPrograma)
    {
        $validated = $request->validate([
            'nombre_campo' => 'required|string|max:100',
            'etiqueta' => 'required|string|max:255',
            'tipo_campo' => 'required|in:text,number,textarea,date,select,checkbox,email',
            'descripcion' => 'nullable|string',
            'opciones' => 'nullable|array',
            'orden' => 'required|integer|min:1',
            'requerido' => 'boolean',
            'activo' => 'boolean',
            'etapa_id' => 'nullable|exists:programa_etapas,id',
        ]);

        $validated['tipo_programa_id'] = $tipoPrograma->id;

        $campo = ProgramaCampo::create($validated);

        $this->clearProgramCache($tipoPrograma->id);

        return response()->json([
            'message' => 'Campo creado exitosamente',
            'data' => $campo,
        ], 201);
    }

    /**
     * Update a field
     */
    public function update(Request $request, TipoPrograma $tipoPrograma, ProgramaCampo $campo)
    {
        if ($campo->tipo_programa_id != $tipoPrograma->id) {
            return response()->json(['message' => 'Campo no pertenece a este programa'], 404);
        }

        $validated = $request->validate([
            'nombre_campo' => 'string|max:100',
            'etiqueta' => 'string|max:255',
            'tipo_campo' => 'in:text,number,textarea,date,select,checkbox,email',
            'descripcion' => 'nullable|string',
            'opciones' => 'nullable|array',
            'orden' => 'integer|min:1',
            'requerido' => 'boolean',
            'activo' => 'boolean',
            'etapa_id' => 'nullable|exists:programa_etapas,id',
        ]);

        $campo->update($validated);

        $this->clearProgramCache($tipoPrograma->id);

        return response()->json([
            'message' => 'Campo actualizado exitosamente',
            'data' => $campo,
        ]);
    }

    /**
     * Delete a field
     */
    public function destroy(TipoPrograma $tipoPrograma, ProgramaCampo $campo)
    {
        if ($campo->tipo_programa_id != $tipoPrograma->id) {
            return response()->json(['message' => 'Campo no pertenece a este programa'], 404);
        }

        $campo->delete();

        $this->clearProgramCache($tipoPrograma->id);

        return response()->json([
            'message' => 'Campo eliminado exitosamente',
        ]);
    }

    protected function clearProgramCache(int $programId)
    {
        Cache::forget("programa:{$programId}:campos");
        Cache::forget("programa:{$programId}:full");
    }
}
