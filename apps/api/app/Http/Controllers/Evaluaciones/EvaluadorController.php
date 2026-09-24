<?php

namespace App\Http\Controllers\Evaluaciones;

use App\Http\Controllers\Controller;
use App\Models\AsignacionEvaluador;
use App\Models\Dictamen;
use App\Models\Ministracion;
use App\Models\NotificacionLog;
use App\Models\ProgramaCriterioEvaluacion;
use App\Models\Solicitud;
use App\Models\SolicitudCriterioEvaluacion;
use App\Models\User;
use App\Notifications\EvaluacionCompletada;
use App\Support\Alcance;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EvaluadorController extends Controller
{
    /**
     * Get solicitudes assigned to the authenticated evaluator
     */
    public function asignaciones(Request $request)
    {
        $evaluadorUser = $request->user();

        // E45: además de ser suyas, dentro de sus periodos (si el admin le asignó alguno).
        $asignaciones = Alcance::aplicarPorSolicitud(
            AsignacionEvaluador::with(['solicitud', 'solicitud.empresa', 'solicitud.user'])
                ->where('evaluador_id', $evaluadorUser->id)
                ->orderBy('estado', 'desc'), // asignado, evaluando, concluido
            $evaluadorUser
        )->get();

        return response()->json($asignaciones);
    }

    /**
     * E45 — Evaluadores que el admin o el admin de convocatoria pueden asignar: TODOS los activos (decisión del
     * usuario). Solo nombre y foto: el admin de convocatoria no ve los datos personales de los evaluadores.
     */
    public function disponibles()
    {
        return response()->json(
            User::where('rol_id', config('comecyt.roles.evaluador'))
                ->where('activo', true)
                ->orderBy('name')
                ->get(['id', 'name', 'avatar_path'])
                ->map(fn ($u) => ['id' => $u->id, 'name' => $u->name, 'avatar_url' => $u->avatar_url])
        );
    }

    /**
     * Get a single assignment detail with full solicitud relations
     */
    public function show(Request $request, AsignacionEvaluador $asignacion)
    {
        if ($asignacion->evaluador_id !== $request->user()->id) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $asignacion->load([
            'solicitud',
            'solicitud.empresa',
            'solicitud.convocatoria',
            'solicitud.convocatoria.tipoPrograma',
            'dictamen',
        ]);

        return response()->json($asignacion);
    }

    /**
     * Store the technical dictamen (Formato B) for a specific assignment.
     * Soporta criterios dinámicos (BD-driven) y fallback a legacy 4-field hardcoded.
     */
    public function saveDictamen(Request $request, AsignacionEvaluador $asignacion)
    {
        // Validate assignment belongs to user
        if ($asignacion->evaluador_id !== $request->user()->id) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        // Load solicitud with convocatoria.tipoPrograma
        $asignacion->load(['solicitud.convocatoria.tipoPrograma']);
        $solicitud = $asignacion->solicitud;
        $tipoPrograma = $solicitud->convocatoria?->tipoPrograma;

        // SEGURIDAD (24/09/2026): un dictamen solo se emite UNA vez, sobre una asignación abierta y una solicitud
        // que sigue en evaluación. Antes se podía volver a enviar después de concluido y reescribir el resultado
        // de una solicitud ya en convenio o cerrada.
        if (! in_array($asignacion->estado, ['asignado', 'evaluando'], true)
            || Dictamen::where('asignacion_id', $asignacion->id)->exists()) {
            return response()->json(['error' => 'Esta evaluación ya fue concluida.'], 422);
        }
        if (! $solicitud || $solicitud->estado !== 'en_evaluacion') {
            return response()->json(['error' => 'La solicitud ya no está en evaluación.'], 422);
        }

        // Determinar si el programa tiene criterios dinámicos
        $isDynamic = false;
        if ($tipoPrograma) {
            $criteriosDinamicos = ProgramaCriterioEvaluacion::where(
                'tipo_programa_id',
                $tipoPrograma->id
            )->exists();
            $isDynamic = $criteriosDinamicos;
        }

        // Validar según path
        if ($isDynamic) {
            // Path dinámico: array de criterios_puntajes
            $request->validate([
                'criterios_puntajes' => 'required|array|min:1',
                'criterios_puntajes.*.criterio_id' => 'required|integer|exists:programa_criterios_evaluacion,id',
                'criterios_puntajes.*.puntaje_obtenido' => 'required|numeric|min:0',
                'comentarios_justificacion' => 'nullable|string|max:2000',
                'carta_imparcialidad_aceptada' => 'required|boolean|accepted',
            ]);

            // SEGURIDAD (24/09/2026): cada criterio debe ser DE ESTE programa, sin repetirse, y cada puntaje no puede
            // pasar su máximo. Antes `puntaje_obtenido` solo tenía min:0: con 9999 en un criterio de cualquier programa
            // la solicitud quedaba aprobada.
            $criterios = ProgramaCriterioEvaluacion::where('tipo_programa_id', $tipoPrograma->id)
                ->get(['id', 'puntaje_maximo'])
                ->keyBy('id');
            $vistos = [];
            foreach ($request->criterios_puntajes as $cp) {
                $id = (int) $cp['criterio_id'];
                $criterio = $criterios->get($id);
                if (! $criterio || isset($vistos[$id])) {
                    return response()->json(['error' => 'Hay criterios que no pertenecen a este programa o están repetidos.'], 422);
                }
                $vistos[$id] = true;
                if ($criterio->puntaje_maximo !== null && (float) $cp['puntaje_obtenido'] > (float) $criterio->puntaje_maximo) {
                    return response()->json(['error' => 'Un puntaje supera el máximo de su criterio.'], 422);
                }
            }

            // Validar que no todos los puntajes sean 0
            $totalPuntaje = 0;
            foreach ($request->criterios_puntajes as $cp) {
                $totalPuntaje += $cp['puntaje_obtenido'];
            }
            if ($totalPuntaje === 0 || $totalPuntaje < 0) {
                return response()->json([
                    'error' => 'Debes calificar al menos un criterio. No puedes enviar un dictamen con todos los puntajes en 0.',
                    'validation_error' => 'total_puntaje_zero',
                ], 422);
            }
        } else {
            // Path legacy: 4 campos hardcodeados
            $request->validate([
                'criterio_1_puntaje' => 'required|numeric|min:0|max:25',
                'criterio_2_puntaje' => 'required|numeric|min:0|max:25',
                'criterio_3_puntaje' => 'required|numeric|min:0|max:25',
                'criterio_4_puntaje' => 'required|numeric|min:0|max:25',
                'comentarios_justificacion' => 'nullable|string|max:2000',
                'carta_imparcialidad_aceptada' => 'required|boolean|accepted',
            ]);

            // Validar que no todos los puntajes sean 0
            $totalPuntaje = (
                $request->criterio_1_puntaje +
                $request->criterio_2_puntaje +
                $request->criterio_3_puntaje +
                $request->criterio_4_puntaje
            );
            if ($totalPuntaje === 0 || $totalPuntaje < 0) {
                return response()->json([
                    'error' => 'Debes calificar al menos un criterio. No puedes enviar un dictamen con todos los puntajes en 0.',
                    'validation_error' => 'total_puntaje_zero',
                ], 422);
            }
        }

        DB::beginTransaction();
        try {
            // Bloquear el row de la solicitud para serializar a múltiples evaluadores
            // que concluyen su dictamen simultáneamente sobre la misma solicitud.
            // Esto previene la creación de ministraciones duplicadas en firstOrCreate.
            $solicitud = Solicitud::where('id', $solicitud->id)->lockForUpdate()->first();

            $dictamenData = [
                'asignacion_id' => $asignacion->id,
                'comentarios_justificacion' => $request->comentarios_justificacion,
            ];

            if ($isDynamic) {
                // Dynamic path: calcular puntaje_total desde array de criterios
                $puntajeTotal = 0;
                foreach ($request->criterios_puntajes as $cp) {
                    $puntajeTotal += $cp['puntaje_obtenido'];
                }
                $dictamenData['puntaje_total'] = $puntajeTotal;
            } else {
                // Legacy path: usa los 4 campos hardcodeados
                $dictamenData['criterio_1_puntaje'] = $request->criterio_1_puntaje;
                $dictamenData['criterio_2_puntaje'] = $request->criterio_2_puntaje;
                $dictamenData['criterio_3_puntaje'] = $request->criterio_3_puntaje;
                $dictamenData['criterio_4_puntaje'] = $request->criterio_4_puntaje;
                // puntaje_total se calcula en Model::boot()
            }

            $dictamen = Dictamen::create($dictamenData);

            // Si es dynamic path, guardar los criterios individuales
            if ($isDynamic) {
                foreach ($request->criterios_puntajes as $cp) {
                    SolicitudCriterioEvaluacion::create([
                        'dictamen_id' => $dictamen->id,
                        'criterio_id' => $cp['criterio_id'],
                        'puntaje_obtenido' => $cp['puntaje_obtenido'],
                    ]);
                }
            }

            // Update assignment status
            $asignacion->update([
                'estado' => 'concluido',
                'carta_imparcialidad_aceptada' => $request->carta_imparcialidad_aceptada ?? false,
            ]);

            // Actualizar estado de la solicitud
            // forceFill(), no update(): 'estado' está en Solicitud::$guarded (SEV-1) y update()
            // lo descartaba en silencio — ver E31 en CLAUDE.md.
            if ($dictamen->sujeto_apoyo) {
                $solicitud->forceFill([
                    'estado' => 'aprobada',
                ])->save();

                // CREACIÓN AUTOMÁTICA DE REGISTRO DE MINISTRACIÓN (tranche 1)
                Ministracion::firstOrCreate(
                    ['solicitud_id' => $solicitud->id, 'numero_tranche' => 1],
                    ['estado' => 'pendiente']
                );

                Audit::log('solicitud.aprobada_tecnica', $solicitud, [
                    'puntaje_total' => $dictamen->puntaje_total,
                    'dictamen_id' => $dictamen->id,
                ]);
            } else {
                $solicitud->forceFill(['estado' => 'rechazada'])->save();

                Audit::log('solicitud.rechazada_tecnica', $solicitud, [
                    'puntaje_total' => $dictamen->puntaje_total,
                    'dictamen_id' => $dictamen->id,
                ]);
            }

            // Notificar al solicitante con resultado de evaluación
            if ($solicitud->user) {
                $evaluador = $request->user();
                $solicitud->user->notify(new EvaluacionCompletada(
                    $solicitud,
                    $dictamen->puntaje_total,
                    $dictamen->sujeto_apoyo,
                    $dictamen->comentarios_justificacion,
                    $evaluador->name
                ));
            }

            DB::commit();

            return response()->json([
                'message' => 'Dictamen guardado exitosamente.',
                'dictamen' => $dictamen->load('asignacion'),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            // Detalle solo al log (antes se devolvía el mensaje de la excepción al navegador).
            \Illuminate\Support\Facades\Log::error('saveDictamen', ['asignacion' => $asignacion->id, 'error' => $e->getMessage()]);

            return response()->json(['error' => 'No se pudo guardar el dictamen. Intenta de nuevo.'], 500);
        }
    }

    /**
     * Cambiar estado de asignación a 'evaluando' cuando evaluador abre la rúbrica
     */
    public function startEvaluation(AsignacionEvaluador $asignacion)
    {
        if ($asignacion->evaluador_id !== auth('api')->user()->id) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        if ($asignacion->estado !== 'asignado') {
            return response()->json(['error' => 'La asignación no está en estado asignado'], 422);
        }

        $asignacion->update(['estado' => 'evaluando']);

        return response()->json([
            'message' => 'Evaluación iniciada',
            'asignacion' => $asignacion,
        ]);
    }

    /**
     * ADMIN: Asignar un evaluador a una solicitud.
     * Estado inicial: 'asignado' (coherente con startEvaluation que verifica este estado).
     */
    public function asignar(Request $request)
    {
        $validated = $request->validate([
            'solicitud_id' => 'required|exists:solicitudes,id',
            'evaluador_id' => 'required|exists:users,id',
            'fecha_limite' => 'required|date|after:today',
        ]);

        // E45: la solicitud viene en el cuerpo: el middleware `alcance` no la ve.
        Alcance::exigirSolicitud($request->user(), Solicitud::findOrFail($validated['solicitud_id']));

        $evaluador = User::findOrFail($validated['evaluador_id']);
        if ((int) $evaluador->rol_id !== (int) config('comecyt.roles.evaluador') || ! $evaluador->activo) {
            return response()->json(['message' => 'El usuario seleccionado no es un evaluador activo.'], 422);
        }

        $existente = AsignacionEvaluador::where('solicitud_id', $validated['solicitud_id'])
            ->where('evaluador_id', $validated['evaluador_id'])
            ->first();

        if ($existente) {
            return response()->json(['message' => 'Este evaluador ya está asignado a esta solicitud.'], 422);
        }

        $asignacion = AsignacionEvaluador::create([
            'solicitud_id' => $validated['solicitud_id'],
            'evaluador_id' => $validated['evaluador_id'],
            'fecha_limite' => $validated['fecha_limite'],
            'estado' => 'asignado', // Estado canónico inicial
        ]);

        // forceFill(), no update(): 'estado' está guardado — mismo motivo (E31 en CLAUDE.md).
        Solicitud::find($validated['solicitud_id'])->forceFill(['estado' => 'en_evaluacion'])->save();

        NotificacionLog::create([
            'user_id' => $validated['evaluador_id'],
            'solicitud_id' => $validated['solicitud_id'],
            'tipo' => 'nueva_asignacion',
            'asunto' => 'Nueva solicitud asignada para evaluación',
            'mensaje' => "Se te ha asignado una solicitud para dictaminación. Fecha límite: {$validated['fecha_limite']}",
            'correo_destino' => $evaluador->email,
            'enviado' => false,
        ]);

        return response()->json([
            'message' => 'Evaluador asignado correctamente.',
            'asignacion' => $asignacion->load(['evaluador', 'solicitud']),
        ], 201);
    }

    /**
     * ADMIN: Desasignar un evaluador de una solicitud.
     */
    public function desasignar(AsignacionEvaluador $asignacion)
    {
        if ($asignacion->estado === 'concluido') {
            return response()->json(['message' => 'No se puede desasignar una evaluación ya concluida.'], 422);
        }

        $asignacion->delete();

        return response()->json(['message' => 'Evaluador desasignado correctamente.']);
    }
}
