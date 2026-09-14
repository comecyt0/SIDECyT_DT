<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CategoriaApoyo;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * CRUD admin para Categorías de Apoyo (Fomento, Talento, Otra...).
 * Admin las puede crear/editar/desactivar libremente.
 */
class CategoriaApoyoController extends Controller
{
    public function index()
    {
        return response()->json(
            CategoriaApoyo::orderBy('orden')->orderBy('nombre')->get()
        );
    }

    public function show(CategoriaApoyo $categoriasApoyo)
    {
        return response()->json($categoriasApoyo);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'clave' => ['required', 'string', 'max:50', Rule::unique('categorias_apoyo', 'clave')],
            'nombre' => 'required|string|max:100',
            'descripcion' => 'nullable|string|max:500',
            'color' => 'nullable|string|max:20',
            'reembolsable' => 'boolean',
            'activa' => 'boolean',
            'orden' => 'nullable|integer',
        ]);

        $cat = CategoriaApoyo::create($validated);
        return response()->json($cat, 201);
    }

    public function update(Request $request, CategoriaApoyo $categoriasApoyo)
    {
        $validated = $request->validate([
            'clave' => ['sometimes', 'string', 'max:50', Rule::unique('categorias_apoyo', 'clave')->ignore($categoriasApoyo->id)],
            'nombre' => 'sometimes|string|max:100',
            'descripcion' => 'nullable|string|max:500',
            'color' => 'nullable|string|max:20',
            'reembolsable' => 'sometimes|boolean',
            'activa' => 'sometimes|boolean',
            'orden' => 'sometimes|integer',
        ]);

        $categoriasApoyo->update($validated);
        return response()->json($categoriasApoyo);
    }

    public function destroy(CategoriaApoyo $categoriasApoyo)
    {
        // Soft check: si tiene convocatorias asociadas, no permitir hard-delete; desactivar
        if ($categoriasApoyo->convocatorias()->exists()) {
            $categoriasApoyo->update(['activa' => false]);
            return response()->json(['message' => 'Categoría desactivada (tiene convocatorias asociadas).']);
        }
        $categoriasApoyo->delete();
        return response()->json(['message' => 'Categoría eliminada.']);
    }
}
