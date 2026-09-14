<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProgramaRubro;
use App\Models\TipoPrograma;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ProgramaRubroController extends Controller
{
    public function __construct()
    {

        // Laravel 11: middleware applied via routes

    }

    public function index(TipoPrograma $tipoPrograma)
    {
        $rubros = $tipoPrograma->rubros()->get();

        return response()->json([
            'message' => 'OK',
            'data' => $rubros,
            'count' => $rubros->count(),
        ]);
    }

    public function store(Request $request, TipoPrograma $tipoPrograma)
    {
        $validated = $request->validate([
            'clave' => 'required|string|max:20',
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'monto_minimo' => 'nullable|numeric|min:0',
            'monto_maximo' => 'nullable|numeric|min:0',
            'activo' => 'boolean',
        ]);

        $validated['tipo_programa_id'] = $tipoPrograma->id;

        $rubro = ProgramaRubro::create($validated);

        $this->clearProgramCache($tipoPrograma->id);

        return response()->json([
            'message' => 'Rubro creado exitosamente',
            'data' => $rubro,
        ], 201);
    }

    public function update(Request $request, TipoPrograma $tipoPrograma, ProgramaRubro $rubro)
    {
        if ($rubro->tipo_programa_id != $tipoPrograma->id) {
            return response()->json(['message' => 'Rubro no pertenece a este programa'], 404);
        }

        $validated = $request->validate([
            'clave' => 'string|max:20',
            'nombre' => 'string|max:255',
            'descripcion' => 'nullable|string',
            'monto_minimo' => 'nullable|numeric|min:0',
            'monto_maximo' => 'nullable|numeric|min:0',
            'activo' => 'boolean',
        ]);

        $rubro->update($validated);

        $this->clearProgramCache($tipoPrograma->id);

        return response()->json([
            'message' => 'Rubro actualizado exitosamente',
            'data' => $rubro,
        ]);
    }

    public function destroy(TipoPrograma $tipoPrograma, ProgramaRubro $rubro)
    {
        if ($rubro->tipo_programa_id != $tipoPrograma->id) {
            return response()->json(['message' => 'Rubro no pertenece a este programa'], 404);
        }

        $rubro->delete();

        $this->clearProgramCache($tipoPrograma->id);

        return response()->json([
            'message' => 'Rubro eliminado exitosamente',
        ]);
    }

    protected function clearProgramCache(int $programId)
    {
        Cache::forget("programa:{$programId}:rubros");
        Cache::forget("programa:{$programId}:full");
    }
}
