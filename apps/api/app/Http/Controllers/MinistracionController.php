<?php

namespace App\Http\Controllers;

use App\Models\Ministracion;
use App\Notifications\PagoLiberado;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MinistracionController extends Controller
{
    public function index()
    {
        return response()->json(Ministracion::with(['solicitud.user.institucion', 'solicitud.convocatoria', 'banco'])->orderBy('id', 'desc')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'solicitud_id' => 'required|exists:solicitudes,id',
            'banco_id' => 'nullable|exists:bancos,id',
            'cuenta_clabe' => 'nullable|string|max:18',
            'numero_cuenta' => 'nullable|string|max:50',
            'titular_cuenta' => 'nullable|string|max:255',
        ]);

        // Estado siempre inicia como 'pendiente' — no permitir forzarlo a 'pagada' en creación
        $validated['estado'] = 'pendiente';

        $ministracion = Ministracion::create($validated);

        return response()->json([
            'message' => 'Ministración creada con éxito',
            'ministracion' => $ministracion,
        ], 201);
    }

    public function show(Ministracion $ministracion)
    {
        return response()->json($ministracion->load(['solicitud', 'banco']));
    }

    public function update(Request $request, Ministracion $ministracion)
    {
        $validated = $request->validate([
            'estado' => 'in:pendiente,revision,autorizada,pagada,rechazada',
            'banco_id' => 'nullable|exists:bancos,id',
            'cuenta_clabe' => 'nullable|string|max:18',
            'numero_cuenta' => 'nullable|string|max:50',
            'observaciones' => 'nullable|string',
            'carta_compromiso_aprobada' => 'boolean',
        ]);

        // Capturar el estado anterior antes de actualizar
        $estadoAnterior = $ministracion->estado;
        $ministracion->update($validated);

        // Notificar si el estado cambió a 'pagada'
        if (($validated['estado'] ?? null) === 'pagada' && $estadoAnterior !== 'pagada') {
            try {
                $ministracion->load('solicitud.user');
                if ($ministracion->solicitud?->user) {
                    $ministracion->solicitud->user->notify(new PagoLiberado($ministracion));
                }
            } catch (\Throwable $e) {
                Log::warning('PagoLiberado notification failed', ['error' => $e->getMessage()]);
                // No revertir la actualización, el pago ya fue registrado
            }
        }

        return response()->json([
            'message' => 'Ministración actualizada con éxito',
            'ministracion' => $ministracion,
        ]);
    }

    public function destroy(Ministracion $ministracion)
    {
        if ($ministracion->estado !== 'pendiente') {
            return response()->json([
                'error' => 'Solo se pueden eliminar ministraciones en estado pendiente.',
            ], 422);
        }

        $ministracion->delete();

        return response()->json(['message' => 'Ministración eliminada.']);
    }
}
