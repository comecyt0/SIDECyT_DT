<?php

namespace App\Http\Controllers;

use App\Models\UserPreference;
use Illuminate\Http\Request;

class UserPreferenceController extends Controller
{
    /**
     * GET /mis-preferencias?scope=admin.solicitudes
     */
    public function index(Request $request)
    {
        $request->validate([
            'scope' => 'nullable|string|max:80',
        ]);

        $query = UserPreference::where('user_id', $request->user()->id)
            ->orderByDesc('predeterminado')
            ->orderBy('nombre');

        if ($scope = $request->query('scope')) {
            $query->where('scope', $scope);
        }

        return response()->json($query->get());
    }

    /**
     * POST /mis-preferencias
     * { scope, nombre, filtros, predeterminado? }
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'scope' => 'required|string|max:80',
            'nombre' => 'required|string|max:120',
            'filtros' => 'required|array',
            'predeterminado' => 'nullable|boolean',
        ]);

        $userId = $request->user()->id;

        // Si llega predeterminado=true, limpiamos cualquier otro predeterminado del mismo scope
        if (! empty($data['predeterminado'])) {
            UserPreference::where('user_id', $userId)
                ->where('scope', $data['scope'])
                ->update(['predeterminado' => false]);
        }

        $pref = UserPreference::updateOrCreate(
            ['user_id' => $userId, 'scope' => $data['scope'], 'nombre' => $data['nombre']],
            [
                'filtros' => $data['filtros'],
                'predeterminado' => (bool) ($data['predeterminado'] ?? false),
            ],
        );

        return response()->json($pref, 201);
    }

    /**
     * DELETE /mis-preferencias/{id}
     */
    public function destroy(Request $request, UserPreference $preferencia)
    {
        if ($preferencia->user_id !== $request->user()->id) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $preferencia->delete();

        return response()->json(['message' => 'Filtro eliminado']);
    }
}
