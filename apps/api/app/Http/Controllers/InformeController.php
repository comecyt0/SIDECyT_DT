<?php

namespace App\Http\Controllers;

use App\Models\Informe;
use Illuminate\Http\Request;

class InformeController extends Controller
{
    public function index()
    {
        return response()->json(Informe::with('solicitud.convocatoria')->orderBy('id', 'desc')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'solicitud_id' => 'required|exists:solicitudes,id',
            'tipo' => 'nullable|in:intermedio,final',
            'fecha_limite_entrega' => 'required|date',
            'estado' => 'nullable|in:pendiente,en_revision,aprobado,rechazado',
        ]);

        $informe = Informe::create($validated);

        return response()->json([
            'message' => 'Seguimiento de Informe creado con éxito',
            'informe' => $informe,
        ], 201);
    }

    public function show(Informe $informe)
    {
        return response()->json($informe->load('solicitud'));
    }

    public function update(Request $request, Informe $informe)
    {
        $validated = $request->validate([
            'estado' => 'in:pendiente,en_revision,aprobado,rechazado',
            'fecha_entregado' => 'nullable|date',
            'resultados_obtenidos' => 'nullable|string',
            'observaciones' => 'nullable|string',
        ]);

        $informe->update($validated);

        return response()->json([
            'message' => 'Informe actualizado con éxito',
            'informe' => $informe,
        ]);
    }

    public function destroy(Informe $informe)
    {
        if ($informe->estado !== 'pendiente') {
            return response()->json([
                'error' => 'Solo se pueden eliminar informes en estado pendiente.',
            ], 422);
        }

        $informe->delete();

        return response()->json(['message' => 'Informe eliminado.']);
    }
}
