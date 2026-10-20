<?php

namespace App\Http\Controllers\Evaluaciones;

use App\Http\Controllers\Controller;
use App\Models\AsignacionEvaluador;
use App\Models\Convocatoria;
use App\Models\Dictamen;
use App\Models\Ministracion;
use App\Models\Solicitud;
use App\Models\SolicitudCriterioEvaluacion;
use App\Models\User;
use App\Notifications\EvaluacionAsignada;
use App\Notifications\EvaluacionCompletada;
use App\Support\Alcance;
use App\Support\Audit;
use App\Support\ConflictosEvaluador;
use App\Support\RubricaSigae;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Evaluación técnica de SIGAE. E72 paso 5 (decisiones del usuario, docs/SICEI_BD_COMPARTIDA.md §6.4), mismas reglas que
 * SICEI para el panel compartido /evaluador:
 *  - El evaluador solo ve lo asignado (ajeno → 404) y un expediente SIN datos personales (sin correo, teléfono ni
 *    CURP), sin los demás evaluadores ni el promedio. Lista blanca armada a mano.
 *  - El dictamen se envía UNA vez y se cierra; vencida la fecha límite no se puede enviar (el admin la amplía).
 *  - NINGÚN dictamen decide la solicitud: el admin decide con el promedio en la ficha (decidir()).
 *  - Mínimo aprobatorio en % del máximo real de la rúbrica (RubricaSigae).
 *  - Conflictos de interés al asignar (ConflictosEvaluador): la autoevaluación y los bloqueos no se pueden saltar; el
 *    resto se avisa y el admin confirma o bloquea a la persona para la solicitud o la convocatoria.
 */
class EvaluadorController extends Controller
{
    /** Tipos de campo dinámico que nunca ve el evaluador. */
    private const CAMPOS_PRIVADOS = ['email', 'correo', 'telefono', 'tel', 'curp', 'clabe', 'rfc'];

    // ─────────────────────────────── Evaluador ───────────────────────────────

    public function asignaciones(Request $request)
    {
        $yo = $request->user();
        // E45: además de ser suyas, dentro de sus periodos (si el admin le asignó alguno).
        $lista = Alcance::aplicarPorSolicitud(
            AsignacionEvaluador::with(['solicitud:id,folio,titulo_proyecto,convocatoria_id,empresa_id,modalidad,estado',
                'solicitud.convocatoria:id,nombre,tipo_programa_id', 'solicitud.convocatoria.tipoPrograma:id,puntaje_minimo_aprobatorio',
                'solicitud.empresa:id,nombre', 'dictamen'])
                ->where('evaluador_id', $yo->id)
                ->orderByRaw("case estado when 'evaluando' then 0 when 'asignado' then 1 else 2 end")
                ->orderBy('fecha_limite'),
            $yo
        )->get();

        return response()->json([
            'sistema' => 'sigae',
            'datos' => $lista->map(fn (AsignacionEvaluador $a) => [
                'id' => $a->id,
                'folio' => $a->solicitud?->folio,
                'titulo' => $a->solicitud?->titulo_proyecto,
                'convocatoria' => $a->solicitud?->convocatoria?->nombre,
                'solicitante' => $a->solicitud?->empresa?->nombre,
                'modalidad' => $a->solicitud?->modalidad,
                'estado' => $a->estadoVisible(),
                'fecha_limite' => $a->fecha_limite?->toDateString(),
                'asignada_at' => $a->created_at?->toIso8601String(),
                'mi_dictamen' => $a->dictamen ? [
                    'id' => $a->dictamen->id,
                    'puntaje' => (float) $a->dictamen->puntaje_total,
                    'maximo' => $a->solicitud ? RubricaSigae::maximo($a->solicitud) : 100.0,
                    'enviado_at' => $a->dictamen->created_at?->toIso8601String(),
                ] : null,
            ])->values(),
        ]);
    }

    /**
     * E45 — Evaluadores que el admin o el admin de convocatoria pueden asignar: TODOS los activos (decisión del
     * usuario). Solo nombre y foto: el admin de convocatoria no ve los datos personales de los evaluadores.
     */
    public function disponibles()
    {
        return response()->json(
            self::evaluadores()
                ->orderBy('name')
                ->get(['id', 'name', 'avatar_path'])
                ->map(fn ($u) => ['id' => $u->id, 'name' => $u->name, 'avatar_url' => $u->avatar_url])
        );
    }

    public function show(Request $request, AsignacionEvaluador $asignacion)
    {
        $a = $this->mia($request, $asignacion);
        $s = $a->solicitud;
        $s->load(['camposDinamicos.campo:id,etiqueta,tipo_campo,nombre_campo,opciones_json', 'documentos:id,solicitud_id,tipo,nombre_original,url']);

        $respuestas = [['titulo' => 'Proyecto', 'campos' => array_values(array_filter([
            ['etiqueta' => 'Título del proyecto', 'valor' => $s->titulo_proyecto],
            ['etiqueta' => 'Descripción', 'valor' => $s->descripcion_proyecto],
            ['etiqueta' => 'Modalidad', 'valor' => $s->modalidad],
            ['etiqueta' => 'Monto solicitado', 'valor' => $s->monto_solicitado !== null ? '$'.number_format((float) $s->monto_solicitado, 2) : null],
            ['etiqueta' => 'Aportación concurrente', 'valor' => $s->aportacion_concurrente !== null ? '$'.number_format((float) $s->aportacion_concurrente, 2) : null],
        ], fn ($c) => $c['valor'] !== null && $c['valor'] !== ''))]];

        $dinamicos = $s->camposDinamicos
            ->filter(fn ($v) => $v->campo && ! $this->esPrivado($v->campo->tipo_campo, $v->campo->nombre_campo))
            ->map(fn ($v) => ['etiqueta' => (string) $v->campo->etiqueta, 'valor' => $this->valorDe($v)])
            ->filter(fn ($c) => $c['valor'] !== null && $c['valor'] !== '')->values()->all();
        if ($dinamicos !== []) {
            $respuestas[] = ['titulo' => 'Respuestas de la solicitud', 'campos' => $dinamicos];
        }

        return response()->json([
            'sistema' => 'sigae',
            'id' => $a->id,
            'folio' => $s->folio,
            'titulo' => $s->titulo_proyecto,
            'convocatoria' => $s->convocatoria?->nombre,
            'solicitante' => $s->empresa?->nombre,
            'modalidad' => $s->modalidad,
            'estado' => $a->estadoVisible(),
            'fecha_limite' => $a->fecha_limite?->toDateString(),
            'puede_enviar' => $a->estado !== 'concluido' && ! $a->vencida() && $s->estado === 'en_evaluacion',
            'respuestas' => $respuestas,
            // Solo archivos privados servidos con sesión y permiso (ArchivoSolicitudController::puedeVer)
            'documentos' => $s->documentos
                ->filter(fn ($d) => is_string($d->url) && preg_match('#^/api/archivos/solicitudes/'.$s->id.'/[A-Za-z0-9]{40}\.pdf$#', $d->url))
                ->map(fn ($d) => ['id' => $d->id, 'requisito' => (string) $d->tipo, 'nombre' => (string) $d->nombre_original, 'url' => $d->url])
                ->values(),
            'rubrica' => [
                'dinamica' => RubricaSigae::esDinamica($s),
                'criterios' => RubricaSigae::criterios($s),
                'maximo' => RubricaSigae::maximo($s),
                'minimo_aprobatorio' => RubricaSigae::minimoPorcentaje($s),
            ],
            'mi_dictamen' => $a->dictamen ? [
                'id' => $a->dictamen->id,
                'puntaje' => (float) $a->dictamen->puntaje_total,
                'comentario' => $a->dictamen->comentarios_justificacion,
                'criterios' => $this->criteriosDe($a->dictamen),
                'enviado_at' => $a->dictamen->created_at?->toIso8601String(),
            ] : null,
        ]);
    }

    public function startEvaluation(Request $request, AsignacionEvaluador $asignacion)
    {
        $a = $this->mia($request, $asignacion);
        if ($a->estado === 'asignado' && ! $a->vencida()) {
            $a->forceFill(['estado' => 'evaluando'])->save();
            Audit::log('evaluacion.iniciada', $a->solicitud);
        }

        return response()->json(['estado' => $a->estadoVisible()]);
    }

    public function saveDictamen(Request $request, AsignacionEvaluador $asignacion)
    {
        $a = $this->mia($request, $asignacion);
        $s = $a->solicitud;

        if ($a->estado === 'concluido' || Dictamen::where('asignacion_id', $a->id)->exists()) {
            return response()->json(['message' => 'Ya enviaste tu dictamen; no se puede modificar.'], 409);
        }
        if ($a->vencida()) {
            return response()->json(['message' => 'La fecha límite para evaluar ya venció. Pide al administrador que la amplíe.'], 422);
        }
        if ($s->estado !== 'en_evaluacion') {
            return response()->json(['message' => 'La solicitud ya no está en evaluación.'], 422);
        }

        $criterios = RubricaSigae::criterios($s);
        $dinamica = RubricaSigae::esDinamica($s);
        $reglas = [
            'comentarios_justificacion' => 'required|string|min:20|max:2000',
            'carta_imparcialidad_aceptada' => 'accepted',
        ];
        // Cada criterio ACTIVO de la rúbrica se califica (antes se podían omitir) y nunca pasa su máximo
        foreach ($criterios as $c) {
            $reglas['puntajes.'.$c['clave']] = 'required|numeric|min:0|max:'.$c['max'];
        }
        $datos = $request->validate($reglas, [], [
            'comentarios_justificacion' => 'justificación', 'carta_imparcialidad_aceptada' => 'carta de imparcialidad',
        ]);
        $puntajes = collect($criterios)->mapWithKeys(fn ($c) => [$c['clave'] => (float) $datos['puntajes'][$c['clave']]]);
        $total = (float) $puntajes->sum();

        $dictamen = DB::transaction(function () use ($a, $s, $criterios, $dinamica, $puntajes, $total, $datos) {
            $bloqueada = AsignacionEvaluador::whereKey($a->id)->lockForUpdate()->first();
            if ($bloqueada->estado === 'concluido') {
                abort(409, 'Ya enviaste tu dictamen.');
            }
            $campos = [
                'asignacion_id' => $a->id,
                'comentarios_justificacion' => $datos['comentarios_justificacion'],
                'puntaje_total' => $total,
                // Informativo: si ESTE dictamen alcanza el mínimo. La decisión es del admin con el promedio.
                'sujeto_apoyo' => RubricaSigae::alcanza($s, $total),
            ];
            if (! $dinamica) {
                foreach ($criterios as $c) {
                    $campos[$c['clave']] = $puntajes[$c['clave']];
                }
            }
            $dictamen = Dictamen::create($campos);
            if ($dinamica) {
                foreach ($criterios as $c) {
                    SolicitudCriterioEvaluacion::create([
                        'dictamen_id' => $dictamen->id, 'criterio_id' => $c['id'], 'puntaje_obtenido' => $puntajes[$c['clave']],
                    ]);
                }
            }
            $bloqueada->forceFill(['estado' => 'concluido', 'concluida_at' => now(), 'carta_imparcialidad_aceptada' => true])->save();

            return $dictamen;
        });
        Audit::log('evaluacion.dictamen_enviado', $s, ['puntaje_total' => $total, 'dictamen_id' => $dictamen->id]);

        return response()->json(['message' => 'Dictamen enviado. Gracias por tu evaluación.', 'dictamen_id' => $dictamen->id], 201);
    }

    // ───────────────────────────────── Admin ─────────────────────────────────

    /** Evaluadores activos con sus conflictos de interés para una solicitud (indicadores al asignar). */
    public function candidatos(Request $request, Solicitud $solicitud)
    {
        Alcance::exigirSolicitud($request->user(), $solicitud);
        $solicitud->loadMissing(['user', 'empresa']);
        $asignados = $solicitud->asignaciones()->pluck('evaluador_id')->flip();

        return response()->json(self::evaluadores()->orderBy('name')
            ->get()->map(function (User $u) use ($solicitud, $asignados) {
                $c = ConflictosEvaluador::detectar($u, $solicitud);

                return ['id' => $u->id, 'name' => $u->name, 'avatar_url' => $u->avatar_url, 'ya_asignado' => $asignados->has($u->id),
                    'bloqueante' => ConflictosEvaluador::hayBloqueante($c), 'conflictos' => $c];
            })->values());
    }

    public function asignar(Request $request)
    {
        $validated = $request->validate([
            'solicitud_id' => 'required|integer|exists:solicitudes,id',
            'evaluador_id' => 'required|integer|exists:users,id',
            // El día límite todavía cuenta (fecha de negocio, hora del centro)
            'fecha_limite' => 'required|date|after:'.Convocatoria::hoy(),
            'acepto_conflictos' => 'sometimes|boolean',
        ], [], ['fecha_limite' => 'fecha límite']);

        $solicitud = Solicitud::with(['user', 'empresa', 'convocatoria:id,nombre'])->findOrFail($validated['solicitud_id']);
        // E45: la solicitud viene en el cuerpo: el middleware `alcance` no la ve.
        Alcance::exigirSolicitud($request->user(), $solicitud);
        if ($solicitud->estado !== 'en_evaluacion') {
            return response()->json(['message' => 'Solo se asignan solicitudes que ya pasaron la revisión documental (en evaluación).'], 422);
        }

        $evaluador = User::findOrFail($validated['evaluador_id']);
        if (! self::evaluadores()->whereKey($evaluador->id)->exists()) {
            return response()->json(['message' => 'El usuario seleccionado no es un evaluador activo.'], 422);
        }
        if (AsignacionEvaluador::where('solicitud_id', $solicitud->id)->where('evaluador_id', $evaluador->id)->exists()) {
            return response()->json(['message' => 'Este evaluador ya está asignado a esta solicitud.'], 422);
        }

        $conflictos = ConflictosEvaluador::detectar($evaluador, $solicitud);
        if (ConflictosEvaluador::hayBloqueante($conflictos)) {
            return response()->json(['message' => 'No se puede asignar: '.collect($conflictos)->firstWhere('bloqueante', true)['detalle'], 'conflictos' => $conflictos], 422);
        }
        if ($conflictos !== [] && ! ($validated['acepto_conflictos'] ?? false)) {
            return response()->json(['message' => 'Hay posibles conflictos de interés. Revísalos y confirma si deseas asignar de todos modos.', 'conflictos' => $conflictos], 409);
        }

        $datosAsig = [
            'solicitud_id' => $solicitud->id,
            'evaluador_id' => $evaluador->id,
            'asignado_por' => $request->user()->id,
            'fecha_limite' => $validated['fecha_limite'],
            'estado' => 'asignado',
            'conflictos_aceptados' => $conflictos ?: null,
        ];
        // E85: si a esa persona se le había retirado esta solicitud, se reactiva la misma fila (única por solicitud y evaluador).
        $retirada = AsignacionEvaluador::withoutGlobalScope('vigentes')->where('solicitud_id', $solicitud->id)
            ->where('evaluador_id', $evaluador->id)->whereNotNull('retirada_at')->first();
        if ($retirada) {
            $retirada->forceFill($datosAsig + ['concluida_at' => null, 'aviso_previo_at' => null, 'aviso_vence_at' => null,
                'carta_imparcialidad_aceptada' => false, 'retirada_at' => null, 'retirada_por' => null])->save();
            $asignacion = $retirada;
        } else {
            $asignacion = AsignacionEvaluador::create($datosAsig);
        }
        Audit::log('evaluacion.asignada', $solicitud, [
            'evaluador_id' => $evaluador->id, 'fecha_limite' => $validated['fecha_limite'], 'conflictos_aceptados' => array_column($conflictos, 'tipo'),
        ]);
        $evaluador->notify(new EvaluacionAsignada($asignacion->load('solicitud.convocatoria')));

        return response()->json(['message' => 'Evaluador asignado correctamente.', 'asignacion' => ['id' => $asignacion->id]], 201);
    }

    /** El admin vio un conflicto y decide no asignar: bloquea a la persona para esta solicitud o toda la convocatoria. */
    public function bloquear(Request $request, Solicitud $solicitud)
    {
        Alcance::exigirSolicitud($request->user(), $solicitud);
        $d = $request->validate([
            'evaluador_id' => 'required|integer|exists:users,id',
            'alcance' => 'required|in:solicitud,convocatoria',
            'motivo' => 'required|string|min:5|max:500',
        ]);
        DB::table('bloqueos_conflicto')->insert([
            'evaluador_id' => $d['evaluador_id'], 'convocatoria_id' => $solicitud->convocatoria_id,
            'solicitud_id' => $d['alcance'] === 'solicitud' ? $solicitud->id : null, 'motivo' => $d['motivo'],
            'bloqueado_por' => $request->user()->id, 'created_at' => now(),
        ]);
        Audit::log('evaluacion.bloqueo_conflicto', $solicitud, $d);

        return response()->json(['message' => $d['alcance'] === 'solicitud'
            ? 'No se le asignará esta solicitud.' : 'No se le asignará ninguna solicitud de esta convocatoria.']);
    }

    public function desasignar(Request $request, AsignacionEvaluador $asignacion)
    {
        if ($asignacion->estado === 'concluido') {
            return response()->json(['message' => 'No se puede desasignar una evaluación ya concluida.'], 422);
        }
        // E85 (regla del usuario): solo el administrador elimina; el admin de convocatoria retira (se conserva la fila).
        if ($request->user()->tieneRol('admin')) {
            Audit::log('evaluacion.desasignada', $asignacion->solicitud, ['evaluador_id' => $asignacion->evaluador_id]);
            $asignacion->delete();

            return response()->json(['message' => 'Evaluador desasignado correctamente.']);
        }
        $asignacion->forceFill(['retirada_at' => now(), 'retirada_por' => $request->user()->id])->save();
        Audit::log('evaluacion.asignacion_retirada', $asignacion->solicitud, ['evaluador_id' => $asignacion->evaluador_id]);

        return response()->json(['message' => 'Asignación retirada (queda registrada; puedes volver a asignarla).']);
    }

    public function ampliarFecha(Request $request, AsignacionEvaluador $asignacion)
    {
        $d = $request->validate(['fecha_limite' => 'required|date|after:'.Convocatoria::hoy()], [], ['fecha_limite' => 'fecha límite']);
        if ($asignacion->estado === 'concluido') {
            return response()->json(['message' => 'Esta persona ya envió su dictamen.'], 422);
        }
        $antes = $asignacion->fecha_limite?->toDateString();
        $asignacion->forceFill(['fecha_limite' => $d['fecha_limite'], 'aviso_previo_at' => null, 'aviso_vence_at' => null])->save();
        Audit::log('evaluacion.fecha_ampliada', $asignacion->solicitud, ['evaluador_id' => $asignacion->evaluador_id, 'antes' => $antes, 'ahora' => $d['fecha_limite']]);

        return response()->json(['message' => 'Fecha límite actualizada.']);
    }

    /** El dictamen se cierra al enviarlo; solo el admin lo reabre (queda en bitácora lo que tenía). */
    public function reabrir(Request $request, AsignacionEvaluador $asignacion)
    {
        // E85 (regla del usuario): reabrir borra el dictamen enviado → solo el administrador.
        if (! $request->user()->tieneRol('admin')) {
            return response()->json(['message' => 'Solo el administrador puede reabrir un dictamen (se elimina el que se envió).'], 403);
        }
        $d = $request->validate(['motivo' => 'required|string|min:5|max:500']);
        $dictamen = $asignacion->dictamen;
        if (! $dictamen) {
            return response()->json(['message' => 'Esta asignación no tiene dictamen.'], 422);
        }
        if (in_array($asignacion->solicitud?->estado, ['aprobada', 'rechazada', 'convenio', 'ministracion', 'seguimiento', 'cerrada'], true)) {
            return response()->json(['message' => 'La solicitud ya tiene resultado; no se puede reabrir el dictamen.'], 422);
        }
        $anterior = ['puntaje_total' => (float) $dictamen->puntaje_total, 'criterios' => $this->criteriosDe($dictamen), 'comentario' => $dictamen->comentarios_justificacion];
        DB::transaction(function () use ($dictamen, $asignacion) {
            SolicitudCriterioEvaluacion::where('dictamen_id', $dictamen->id)->delete();
            $dictamen->delete();
            $asignacion->forceFill(['estado' => 'evaluando', 'concluida_at' => null])->save();
        });
        Audit::log('evaluacion.reabierta', $asignacion->solicitud, ['evaluador_id' => $asignacion->evaluador_id, 'motivo' => $d['motivo'], 'anterior' => $anterior]);

        return response()->json(['message' => 'Dictamen reabierto: la persona evaluadora puede enviarlo de nuevo.']);
    }

    /** Resultado de la evaluación para la ficha del admin: cada dictamen, promedio y mínimo. */
    public function resultado(Request $request, Solicitud $solicitud)
    {
        Alcance::exigirSolicitud($request->user(), $solicitud);
        $solicitud->load(['asignaciones.evaluador:id,name', 'asignaciones.dictamen.criterioDinamicos', 'convocatoria.tipoPrograma']);

        return response()->json([
            ...RubricaSigae::resumen($solicitud),
            'criterios' => RubricaSigae::criterios($solicitud),
            'puede_decidir' => $solicitud->estado === 'en_evaluacion',
            'asignaciones' => $solicitud->asignaciones->map(fn (AsignacionEvaluador $a) => [
                'id' => $a->id,
                'evaluador' => $a->evaluador?->name,
                'evaluador_id' => $a->evaluador_id,
                'estado' => $a->estadoVisible(),
                'fecha_limite' => $a->fecha_limite?->toDateString(),
                'conflictos_aceptados' => $a->conflictos_aceptados ?? [],
                'dictamen' => $a->dictamen ? [
                    'id' => $a->dictamen->id,
                    'puntaje' => (float) $a->dictamen->puntaje_total,
                    'criterios' => $this->criteriosDe($a->dictamen),
                    'comentario' => $a->dictamen->comentarios_justificacion,
                    'enviado_at' => $a->dictamen->created_at?->toIso8601String(),
                ] : null,
            ])->values(),
        ]);
    }

    /** El admin decide el resultado con el promedio (aprobar → crea la ministración 1; rechazar). */
    public function decidir(Request $request, Solicitud $solicitud)
    {
        Alcance::exigirSolicitud($request->user(), $solicitud);
        $d = $request->validate([
            'resultado' => 'required|in:aprobada,rechazada',
            'motivo' => 'required|string|min:10|max:1000',
        ]);
        $solicitud->load(['asignaciones.dictamen', 'convocatoria.tipoPrograma', 'user']);
        if ($solicitud->estado !== 'en_evaluacion') {
            return response()->json(['message' => 'La solicitud no está en evaluación.'], 422);
        }
        $resumen = RubricaSigae::resumen($solicitud);
        if (! $resumen['completa']) {
            return response()->json(['message' => 'Faltan dictámenes: espera a que todas las personas asignadas concluyan (o amplía/retira las vencidas).'], 422);
        }

        DB::transaction(function () use ($solicitud, $d) {
            $bloqueada = Solicitud::whereKey($solicitud->id)->lockForUpdate()->first();
            // forceFill(), no update(): 'estado' está en Solicitud::$guarded (SEV-1, E31).
            $bloqueada->forceFill(['estado' => $d['resultado']])->save();
            if ($d['resultado'] === 'aprobada') {
                Ministracion::firstOrCreate(['solicitud_id' => $solicitud->id, 'numero_tranche' => 1], ['estado' => 'pendiente']);
            }
        });
        Audit::log($d['resultado'] === 'aprobada' ? 'solicitud.aprobada_tecnica' : 'solicitud.rechazada_tecnica', $solicitud, [
            'promedio' => $resumen['promedio'], 'porcentaje' => $resumen['porcentaje'], 'minimo' => $resumen['minimo_aprobatorio'], 'motivo' => $d['motivo'],
        ]);
        $solicitud->user?->notify(new EvaluacionCompletada($solicitud->fresh(), $resumen['promedio'], $d['resultado'] === 'aprobada', $d['motivo'], 'Comité de evaluación'));

        return response()->json(['message' => $d['resultado'] === 'aprobada' ? 'Solicitud aprobada.' : 'Solicitud rechazada.']);
    }

    // ──────────────────────────────── Ayudas ─────────────────────────────────

    /**
     * Cuentas activas con el rol de evaluador: el activo o uno otorgado (usuario_roles). Quien tiene otro rol activo
     * cambia al de evaluador desde su panel para dictaminar (E72 paso 5).
     */
    private static function evaluadores(): \Illuminate\Database\Eloquent\Builder
    {
        $rol = (int) config('comecyt.roles.evaluador');

        return User::where('activo', true)->where(fn ($q) => $q->where('rol_id', $rol)
            ->orWhereIn('id', DB::table('usuario_roles')->select('user_id')->where('rol_id', $rol)));
    }

    /** La asignación debe ser de quien pregunta y no de su propia solicitud; si no, 404 (no confirma que exista). */
    private function mia(Request $request, AsignacionEvaluador $a): AsignacionEvaluador
    {
        $a->loadMissing(['solicitud.convocatoria.tipoPrograma', 'solicitud.empresa:id,nombre', 'dictamen']);
        abort_if((int) $a->evaluador_id !== (int) $request->user()->id || ! $a->solicitud
            || (int) $a->solicitud->user_id === (int) $request->user()->id, 404);

        return $a;
    }

    private function esPrivado(?string $tipo, ?string $nombre): bool
    {
        $t = strtolower((string) $tipo).' '.strtolower((string) $nombre);
        foreach (self::CAMPOS_PRIVADOS as $p) {
            if (str_contains($t, $p)) {
                return true;
            }
        }

        return false;
    }

    private function valorDe($v): ?string
    {
        if ($v->valor_texto !== null && $v->valor_texto !== '') {
            $opciones = collect(is_array($v->campo->opciones_json) ? $v->campo->opciones_json : (json_decode((string) $v->campo->opciones_json, true) ?: []));
            $etiqueta = $opciones->firstWhere('id', $v->valor_texto)['label'] ?? null;

            return mb_substr((string) ($etiqueta ?? $v->valor_texto), 0, 5000);
        }
        if ($v->valor_numero !== null) {
            return (string) $v->valor_numero;
        }
        if ($v->valor_fecha !== null) {
            return (string) (is_object($v->valor_fecha) ? $v->valor_fecha->toDateString() : $v->valor_fecha);
        }
        if ($v->valor_json !== null) {
            $j = is_array($v->valor_json) ? $v->valor_json : json_decode((string) $v->valor_json, true);

            return is_array($j) ? implode(', ', array_map(fn ($x) => is_scalar($x) ? (string) $x : '', $j)) : null;
        }

        return null;
    }

    /** {clave: puntaje} con las mismas claves que RubricaSigae::criterios(). */
    private function criteriosDe(Dictamen $d): array
    {
        return RubricaSigae::puntajesDe($d);
    }
}
