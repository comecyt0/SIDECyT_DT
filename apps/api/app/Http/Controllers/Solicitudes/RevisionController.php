<?php

namespace App\Http\Controllers\Solicitudes;

use App\Http\Controllers\Controller;
use App\Models\Observacion;
use App\Models\Solicitud;
use App\Notifications\SolicitudEstadoActualizado;
use App\Notifications\SolicitudObservada;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RevisionController extends Controller
{
    /**
     * Get solicitudes pending review (estado: enviada o observada)
     * Nota: 'subsanada' es el estado previo, ahora es 'observada' cuando revisor devuelve para correcciones
     */
    public function pendientes()
    {
        $solicitudes = Solicitud::with(['user', 'empresa', 'convocatoria', 'areaConocimiento'])
            ->whereIn('estado', ['enviada', 'observada'])
            ->orderBy('updated_at', 'asc')
            ->get();

        return response()->json($solicitudes);
    }

    /**
     * Get completadas (solicitudes that have been evaluated and closed or moved forward)
     */
    public function completadas()
    {
        $solicitudes = Solicitud::with(['user', 'empresa', 'convocatoria'])
            ->whereIn('estado', ['en_evaluacion', 'aprobada', 'rechazada', 'convenio', 'ministracion', 'cerrada'])
            ->orderBy('updated_at', 'desc')
            ->get();

        return response()->json($solicitudes);
    }

    /**
     * Get observadas (solicitudes that need corrections from solicitante)
     */
    public function observadas()
    {
        $solicitudes = Solicitud::with(['user', 'empresa', 'convocatoria'])
            ->where('estado', 'observada')
            ->orderBy('updated_at', 'asc')
            ->get();

        return response()->json($solicitudes);
    }

    /**
     * Get specific solicitud details for review
     */
    public function show(Solicitud $solicitud)
    {
        $solicitud->load(['user', 'empresa', 'convocatoria', 'areaConocimiento', 'observaciones', 'documentos', 'asignaciones.dictamen', 'ministracion.banco']);

        return response()->json($solicitud);
    }

    /**
     * Approve documental review and pass to Evaluation stage
     */
    public function approve(Request $request, Solicitud $solicitud)
    {
        if (! in_array($solicitud->estado, ['enviada', 'observada'])) {
            return response()->json(['error' => 'Solo se pueden aprobar solicitudes en estado enviada u observada.'], 422);
        }

        DB::beginTransaction();
        try {
            $estadoPrevio = $solicitud->estado;
            // forceFill(), no update(): 'estado' está en Solicitud::$guarded a propósito (SEV-1,
            // ver Solicitud.php) para que nadie lo mande por mass-assignment desde afuera, pero eso
            // también bloqueaba esta escritura legítima del controlador — ver E31 en CLAUDE.md.
            $solicitud->forceFill([
                'estado' => 'en_evaluacion',
            ])->save();

            Audit::log('solicitud.aprobada_documentalmente', $solicitud, [
                'estado_previo' => $estadoPrevio,
            ]);

            // Notificar al solicitante
            if ($solicitud->user) {
                $solicitud->user->notify(new SolicitudEstadoActualizado($solicitud));
            }

            DB::commit();

            return response()->json([
                'message' => 'Solicitud aprobada documentalmente y turnada a Evaluación',
                'solicitud' => $solicitud,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['error' => 'Error al aprobar: '.$e->getMessage()], 500);
        }
    }

    /**
     * Reject or send observations back to Solicitante
     */
    public function observe(Request $request, Solicitud $solicitud)
    {
        if ($solicitud->estado !== 'enviada') {
            return response()->json(['error' => 'Solo se pueden observar solicitudes en estado enviada.'], 422);
        }

        $request->validate([
            'observaciones' => 'required|array|min:1',
            'observaciones.*.campo' => 'required|string|max:100',
            'observaciones.*.comentario' => 'required|string|min:10|max:1000',
            'observaciones.*.tipo' => 'nullable|string|in:documental,tecnica,financiera',
        ]);

        DB::beginTransaction();
        try {
            foreach ($request->observaciones as $obsData) {
                Observacion::create([
                    'solicitud_id' => $solicitud->id,
                    'user_id' => $request->user()->id,
                    'campo' => $obsData['campo'] ?? null,
                    'tipo' => $obsData['tipo'] ?? 'documental',
                    'comentario' => $obsData['comentario'],
                    'resuelta' => false,
                ]);
            }

            // forceFill(), no update() — mismo motivo de arriba (E31 en CLAUDE.md).
            $solicitud->forceFill([
                'estado' => 'observada',
            ])->save();

            // Notificar al solicitante con observaciones detalladas
            if ($solicitud->user) {
                // Compilar observaciones para el email
                $obsTexto = implode("\n\n", array_map(function ($obs) {
                    $tipo = $obs['tipo'] ?? 'general';

                    return "🔹 {$obs['campo']} ({$tipo}):\n{$obs['comentario']}";
                }, $request->observaciones));

                $solicitud->user->notify(new SolicitudObservada($solicitud, $obsTexto));
            }

            DB::commit();

            return response()->json([
                'message' => 'Solicitud enviada a subsanación institucional con '.count($request->observaciones).' observaciones.',
                'solicitud' => $solicitud->load('observaciones'),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['error' => 'Error al observar: '.$e->getMessage()], 500);
        }
    }

    /**
     * Approve final report and close project
     */
    public function approveInforme(Solicitud $solicitud)
    {
        if ($solicitud->estado_informe !== 'entregado') {
            return response()->json(['error' => 'Solo se pueden aprobar informes en estado entregado.'], 422);
        }

        // forceFill(), no update(): 'estado_informe' y 'estado' están guardados — mismo motivo (E31).
        $solicitud->forceFill([
            'estado_informe' => 'aprobado',
            'estado' => 'cerrada',
        ])->save();

        return response()->json(['message' => 'Informe final aprobado. El proyecto ha sido cerrado oficialmente.']);
    }
}
