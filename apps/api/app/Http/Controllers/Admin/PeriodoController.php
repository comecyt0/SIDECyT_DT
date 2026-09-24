<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Periodo;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * E45 — Catálogo de periodos. Cada convocatoria pertenece a un periodo (se elige en el alta) y a los usuarios con
 * alcance por periodo (admin de convocatoria, revisor, evaluador, consulta) se les asignan periodos.
 * Lectura: admin, admin de convocatoria y consulta (para filtros). Escritura: solo admin (rutas).
 */
class PeriodoController extends Controller
{
    public function index()
    {
        return response()->json(
            Periodo::withCount('convocatorias')->orderByDesc('fecha_inicio')->orderBy('nombre')->get()
        );
    }

    public function store(Request $request)
    {
        $data = $this->validar($request);
        $periodo = Periodo::create($data);
        Audit::log('periodo.creado', $periodo, ['nombre' => $periodo->nombre]);

        return response()->json(['message' => 'Periodo creado.', 'periodo' => $periodo], 201);
    }

    public function update(Request $request, Periodo $periodo)
    {
        $data = $this->validar($request, $periodo);
        $periodo->update($data);
        Audit::log('periodo.actualizado', $periodo, $data);

        return response()->json(['message' => 'Periodo actualizado.', 'periodo' => $periodo]);
    }

    public function destroy(Periodo $periodo)
    {
        if ($periodo->convocatorias()->exists()) {
            return response()->json([
                'message' => 'Este periodo tiene convocatorias. Desactívalo en lugar de borrarlo.',
            ], 422);
        }
        Audit::log('periodo.eliminado', $periodo, ['nombre' => $periodo->nombre]);
        $periodo->delete();

        return response()->json(['message' => 'Periodo eliminado.']);
    }

    private function validar(Request $request, ?Periodo $periodo = null): array
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:120', Rule::unique('periodos', 'nombre')->ignore($periodo?->id)],
            'fecha_inicio' => ['nullable', 'date_format:Y-m-d'],
            'fecha_fin' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:fecha_inicio'],
            'activo' => ['sometimes', 'boolean'],
        ]);
        $data['nombre'] = trim(strip_tags($data['nombre']));

        return $data;
    }
}
