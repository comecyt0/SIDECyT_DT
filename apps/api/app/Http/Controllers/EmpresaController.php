<?php

namespace App\Http\Controllers;

use App\Models\Empresa;
use Illuminate\Http\Request;

class EmpresaController extends Controller
{
    public function index()
    {
        return response()->json(Empresa::orderBy('nombre')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:255|unique:instituciones,nombre',
            'acronimo' => 'nullable|string|max:20',
            'municipio_id' => 'nullable|exists:municipios,id',
            'activo' => 'boolean',
            'activa' => 'boolean', // Accept both activo and activa
        ]);

        // Map activa to activo if present
        if (isset($validated['activa']) && ! isset($validated['activo'])) {
            $validated['activo'] = $validated['activa'];
        }
        unset($validated['activa']);

        $inst = Empresa::create($validated);

        return response()->json(['message' => 'Institución creada', 'empresa' => $inst], 201);
    }

    public function show(Institucion $empresa)
    {
        return response()->json($empresa->load('municipio'));
    }

    public function update(Request $request, Institucion $empresa)
    {
        $validated = $request->validate([
            'nombre' => 'sometimes|string|max:255|unique:instituciones,nombre,'.$empresa->id,
            'acronimo' => 'nullable|string|max:20',
            'municipio_id' => 'nullable|exists:municipios,id',
            'activo' => 'boolean',
            'activa' => 'boolean', // Accept both activo and activa
        ]);

        // Map activa to activo if present
        if (isset($validated['activa']) && ! isset($validated['activo'])) {
            $validated['activo'] = $validated['activa'];
        }
        unset($validated['activa']);

        $empresa->update($validated);

        return response()->json(['message' => 'Institución actualizada', 'empresa' => $empresa]);
    }

    public function destroy(Institucion $empresa)
    {
        $empresa->delete();

        return response()->json(['message' => 'Institución eliminada']);
    }
}
