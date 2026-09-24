<?php

namespace App\Http\Controllers\Solicitudes;

use App\Enums\Message;
use App\Helpers\ConfigHelper;
use App\Http\Controllers\Controller;
use App\Http\Traits\ValidatesBinaryMimeTypes;
use App\Models\Convocatoria;
use App\Models\ListaNegra;
use App\Models\Ministracion;
use App\Models\Solicitud;
use App\Models\SolicitudCampoDinamico;
use App\Models\SolicitudMiembroEquipo;
use App\Models\SolicitudRubroPresupuesto;
use App\Notifications\SolicitudEnviada;
use App\Notifications\SolicitudEstadoActualizado;
use App\Support\Alcance;
use App\Support\Enmascarar;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SolicitudController extends Controller
{
    use ValidatesBinaryMimeTypes;

    /**
     * List user's solicitudes
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $solicitudes = Solicitud::where('user_id', $user->id)
            ->with(['ministracion', 'convenio', 'empresa'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($solicitudes);
    }

    /**
     * Admin: list all solicitudes with optional pagination, search, and estado filter
     */
    public function adminIndex(Request $request)
    {
        // E45: con alcance (admin de convocatoria / consulta / periodos) y filtros por convocatoria y periodo.
        $query = Alcance::aplicar(
            Solicitud::with(['user', 'empresa', 'convocatoria.periodo:id,nombre'])
                ->orderBy('created_at', 'desc'),
            $request->user()
        );
        if ($request->filled('convocatoria_id')) {
            $query->where('convocatoria_id', (int) $request->convocatoria_id);
        }
        if ($request->filled('periodo_id')) {
            $query->whereHas('convocatoria', fn ($q) => $q->where('periodo_id', (int) $request->periodo_id));
        }

        if ($request->filled('search')) {
            $search = addcslashes((string) $request->search, '%_\\');
            $query->where(function ($q) use ($search) {
                $q->where('folio', 'ilike', "%{$search}%")
                    ->orWhere('titulo_proyecto', 'ilike', "%{$search}%")
                    ->orWhereHas('empresa', fn ($qi) => $qi->where('nombre', 'ilike', "%{$search}%"));
            });
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        $perPage = min(100, (int) $request->get('per_page', 0));

        if ($perPage > 0) {
            return response()->json($query->paginate($perPage));
        }

        return response()->json($query->limit(500)->get());
    }

    /**
     * Create a new solicitud
     *
     * Uses ConfigHelper for validation limits and Message enum for error messages
     * This ensures consistency across the system and makes maintenance easier
     */
    public function store(Request $request)
    {
        // Get configured validation limits
        $maxTitle = ConfigHelper::val('validation.titulo_proyecto_max_chars');
        $maxDesc = ConfigHelper::val('validation.descripcion_solicitud_max_chars');
        $minMonto = ConfigHelper::val('montos.monto_minimo_solicitud');
        $maxMonto = ConfigHelper::val('montos.monto_maximo_solicitud');

        // Si la convocatoria tiene un TipoPrograma con monto_maximo propio, úsalo.
        // Esto permite convocatorias con límites diferentes al global de config.
        $convocatoriaPreload = Convocatoria::with('tipoPrograma')->find($request->convocatoria_id);
        $programaMaxMonto = $convocatoriaPreload?->tipoPrograma?->monto_maximo;
        if ($programaMaxMonto && $programaMaxMonto > 0) {
            $maxMonto = $programaMaxMonto;
        }

        $request->validate([
            'convocatoria_id' => 'required|exists:convocatorias,id',
            'titulo_proyecto' => "required|string|max:{$maxTitle}",
            'modalidad' => 'nullable|string',
            'area_conocimiento_id' => 'nullable|integer',
            'descripcion' => "required|string|max:{$maxDesc}",
            'monto_solicitado' => "required|numeric|min:{$minMonto}|max:{$maxMonto}",
        ]);

        $user = $request->user();

        // 🔴 0. Validar que el usuario tenga una institución asignada
        if (! $user->empresa_id) {
            return response()->json([
                'message' => ConfigHelper::msg(Message::AUTH_NO_INSTITUTION),
                'error' => 'sin_institucion',
            ], 403);
        }

        // 🔴 1. Validar que la institución del usuario NO esté en Lista Negra
        $enListaNegra = ListaNegra::where('empresa_id', $user->empresa_id)
            ->where('activa', true)
            ->exists();

        if ($enListaNegra) {
            return response()->json([
                'message' => ConfigHelper::msg(Message::AUTH_INSTITUTION_BLOCKED),
                'error' => 'institucion_bloqueada',
            ], 403);
        }

        // 🟢 2. Validar que la convocatoria reciba solicitudes HOY (E40): publicada, ya abrió y no pasó su
        // fecha límite efectiva (con prórroga). Antes solo miraba estado='activa', así que una convocatoria
        // "próxima a abrir" habría aceptado solicitudes antes de su apertura.
        $convocatoria = Convocatoria::findOrFail($request->convocatoria_id);
        if (! $convocatoria->aceptaSolicitudes()) {
            return response()->json(['message' => ConfigHelper::msg(Message::SOLICITUD_CONVOCATORIA_CERRADA)], 422);
        }

        DB::beginTransaction();
        try {
            // Generar folio único: COMECYT-YYYY-RANDOM6
            // El campo `folio` tiene unique constraint a nivel DB; el reintento
            // dentro del catch de QueryException protege contra el race que existía
            // entre el check exists() y el INSERT en concurrencia.
            $year = date('Y');
            $solicitud = null;
            $maxRetries = 5;

            for ($attempt = 0; $attempt < $maxRetries; $attempt++) {
                $folio = 'COMECYT-'.$year.'-'.strtoupper(Str::random(6));
                try {
                    // forceFill, NO create(): `folio` y `estado` están en Solicitud::$guarded (SEV-1). create() los
                    // descartaba en silencio y el INSERT fallaba por `folio` NOT NULL → NINGUNA solicitud se podía
                    // crear (500). Encontrado el 24/09/2026 (E45) — mismo patrón que E30/E31. Aquí son valores que
                    // arma el servidor, no el cliente; el resto viene validado arriba.
                    $solicitud = new Solicitud;
                    $solicitud->forceFill([
                        'folio' => $folio,
                        'user_id' => $user->id,
                        'empresa_id' => $user->empresa_id,
                        'convocatoria_id' => $request->convocatoria_id,
                        'titulo_proyecto' => $request->titulo_proyecto,
                        'modalidad' => $request->modalidad,
                        'descripcion_proyecto' => $request->descripcion,
                        'monto_solicitado' => $request->monto_solicitado,
                        'area_conocimiento_id' => $request->area_conocimiento_id,
                        'estado' => 'borrador',
                    ])->save();
                    break;
                } catch (QueryException $e) {
                    // 23505 = unique_violation en PostgreSQL, 23000 = integrity en MySQL
                    if (! in_array($e->getCode(), ['23505', '23000'], true)) {
                        throw $e;
                    }
                    if ($attempt === $maxRetries - 1) {
                        throw $e;
                    }
                }
            }

            // Guardar campos dinámicos
            if ($request->has('campos_dinamicos')) {
                foreach ($request->campos_dinamicos as $campo) {
                    SolicitudCampoDinamico::create([
                        'solicitud_id' => $solicitud->id,
                        'programa_campo_id' => $campo['campo_id'],
                        'valor_texto' => $campo['valor'],
                    ]);
                }
            }

            // Guardar rubros presupuestales
            if ($request->has('rubros')) {
                foreach ($request->rubros as $rubro) {
                    if (($rubro['monto'] ?? 0) > 0) {
                        SolicitudRubroPresupuesto::create([
                            'solicitud_id' => $solicitud->id,
                            'rubro_id' => $rubro['rubro_id'],
                            'monto_solicitado' => $rubro['monto'],
                        ]);
                    }
                }
            }

            // Guardar miembros de equipo (EMP)
            if ($request->has('miembros_equipo')) {
                foreach ($request->miembros_equipo as $i => $miembro) {
                    SolicitudMiembroEquipo::create([
                        'solicitud_id' => $solicitud->id,
                        'nombre_completo' => $miembro['nombre'],
                        'edad' => $miembro['edad'] ?? null,
                        'rol_en_equipo' => $miembro['rol'],
                        'correo' => $miembro['email'] ?? null,
                        'es_lider' => $i === 0,
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => ConfigHelper::msg(Message::SUCCESS_SOLICITUD_CREADA),
                'solicitud' => $solicitud,
            ], 201);

        } catch (ValidationException $e) {
            DB::rollBack();
            throw $e;
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('SolicitudController::store failed', [
                'user_id' => auth()->id(),
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => ConfigHelper::msg(Message::ERROR_DATABASE),
            ], 500);
        }
    }

    /**
     * Show a single solicitud with relations (must belong to the authenticated user)
     */
    public function show(Request $request, Solicitud $solicitud)
    {
        if ($solicitud->user_id !== $request->user()->id) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $solicitud->load([
            'convocatoria.tipoPrograma',
            'empresa',
            'areaConocimiento',
            'observaciones',
            'documentos',
            'asignaciones.dictamen',
            'ministracion.banco',
            // E45: seguimiento del folio (quién movió el estado, con su foto y el motivo).
            'historial.user:id,name,avatar_path',
        ]);

        return response()->json($solicitud);
    }

    /**
     * Admin-only: ver TODA la documentación de cualquier solicitud sin restricción.
     * Útil para auditoría y supervisión. Carga TODAS las relaciones relevantes:
     * convocatoria + programa, empresa, área, observaciones, documentos del solicitante,
     * asignaciones con dictamen, ministración con banco + factura/carta, convenio,
     * usuario propietario completo.
     */
    public function adminShowFull(Solicitud $solicitud)
    {
        $solicitud->load([
            'user.empresa',
            'user.rol',
            'convocatoria.tipoPrograma.campos',
            'convocatoria.tipoPrograma.documentos',
            'convocatoria.tipoPrograma.rubros',
            'convocatoria.tipoPrograma.criterios', // antes criteriosEvaluacion: esa relación no existe (500 con datos reales)
            'empresa',
            'areaConocimiento',
            'observaciones',
            'documentos',
            'asignaciones.dictamen',
            'asignaciones.evaluador',
            'ministracion.banco',
            'convenio',
            'informe',
            'historial.user:id,name,avatar_path',
        ]);

        // E45: datos bancarios completos solo para admin y admin de convocatoria.
        $data = $solicitud->toArray();
        if (! Enmascarar::veBancarios(request()->user())) {
            $data['ministracion'] = Enmascarar::ministracion($data['ministracion'] ?? null);
        }

        return response()->json($data);
    }

    /**
     * Transition a solicitud from borrador → enviada
     */
    public function enviar(Request $request, Solicitud $solicitud)
    {
        if ($solicitud->user_id !== $request->user()->id) {
            return response()->json(['error' => ConfigHelper::msg(Message::AUTH_UNAUTHORIZED)], 403);
        }

        if ($solicitud->estado !== 'borrador') {
            return response()->json(['error' => ConfigHelper::msg(Message::SOLICITUD_NO_EDITABLES)], 422);
        }

        // Validar que todos los documentos obligatorios hayan sido subidos
        $solicitud->load(['documentos', 'convocatoria.tipoPrograma.documentos']);

        // E40: un borrador solo se envía mientras la convocatoria recibe solicitudes (abierta o con prórroga).
        // Antes no se revisaba: un borrador podía enviarse después del cierre.
        if (! $solicitud->convocatoria || ! $solicitud->convocatoria->aceptaSolicitudes()) {
            return response()->json(['error' => ConfigHelper::msg(Message::SOLICITUD_CONVOCATORIA_CERRADA)], 422);
        }

        $tipoPrograma = $solicitud->convocatoria?->tipoPrograma;
        if ($tipoPrograma) {
            $docsObligatorios = $tipoPrograma->documentos()
                ->where('obligatorio', true)
                ->where('activo', true)
                ->pluck('clave')
                ->toArray();

            $docsSubidos = $solicitud->documentos->pluck('tipo')->toArray();
            $docsFaltantes = array_diff($docsObligatorios, $docsSubidos);

            if (! empty($docsFaltantes)) {
                return response()->json([
                    'error' => ConfigHelper::msg(Message::SOLICITUD_DOCUMENTOS_FALTANTES),
                    'documentos_faltantes' => array_values($docsFaltantes),
                ], 422);
            }
        }

        // forceFill(), no update(): 'estado' está en Solicitud::$guarded (SEV-1) y update() lo
        // descartaba en silencio — la solicitud se quedaba en "borrador" para siempre aunque la
        // respuesta dijera "enviada". Ver E31 en CLAUDE.md.
        $solicitud->forceFill([
            'estado' => 'enviada',
        ])->save();

        // Notificar al solicitante con template profesional
        $solicitud->user->notify(new SolicitudEnviada($solicitud));

        return response()->json(['message' => ConfigHelper::msg(Message::SUCCESS_SOLICITUD_ENVIADA), 'solicitud' => $solicitud]);
    }

    /**
     * Re-send a solicitud from observada back to enviada state
     * Used when solicitant corrects observations and resubmits
     */
    public function reenviar(Request $request, Solicitud $solicitud)
    {
        if ($solicitud->user_id !== $request->user()->id) {
            return response()->json(['error' => ConfigHelper::msg(Message::AUTH_UNAUTHORIZED)], 403);
        }

        if ($solicitud->estado !== 'observada') {
            return response()->json(['error' => ConfigHelper::msg(Message::SOLICITUD_NO_EDITABLES)], 422);
        }

        // forceFill(), no update() — mismo motivo de arriba (E31 en CLAUDE.md).
        $solicitud->forceFill([
            'estado' => 'enviada',
        ])->save();

        // Notificar al revisor que hay una nueva versión
        $solicitud->user->notify(new SolicitudEstadoActualizado($solicitud));

        return response()->json(['message' => 'Solicitud reenviada exitosamente para re-revisión.', 'solicitud' => $solicitud]);
    }

    /**
     * Solicitante actualiza sus datos bancarios (beneficiario) en la ministración
     */
    public function updateBeneficiario(Request $request, Solicitud $solicitud)
    {
        if ($solicitud->user_id !== $request->user()->id) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $allowedStates = ['aprobada', 'convenio', 'ministracion'];
        if (! in_array($solicitud->estado, $allowedStates)) {
            return response()->json(['error' => 'Solo puedes actualizar datos bancarios cuando la solicitud esté aprobada o en proceso de ministración.'], 422);
        }

        $validated = $request->validate([
            'banco_id' => 'nullable|integer|exists:bancos,id',
            'cuenta_clabe' => 'nullable|string|max:18',
            'numero_cuenta' => 'nullable|string|max:50',
            'titular_cuenta' => 'nullable|string|max:255',
        ]);

        $ministracion = Ministracion::firstOrCreate(
            ['solicitud_id' => $solicitud->id],
            ['estado' => 'pendiente']
        );

        $ministracion->update($validated);
        $ministracion->load('banco');

        return response()->json([
            'message' => 'Datos bancarios actualizados correctamente.',
            'ministracion' => $ministracion,
        ]);
    }

    /**
     * Submit final report for a project in execution/ministration
     */
    public function submitInforme(Request $request, Solicitud $solicitud)
    {
        if ($solicitud->user_id !== $request->user()->id) {
            return response()->json(['error' => ConfigHelper::msg(Message::AUTH_UNAUTHORIZED)], 403);
        }

        // SEGURIDAD (24/09/2026): el informe final solo se entrega con el proyecto en ejecución.
        if (! in_array($solicitud->estado, ['ministracion', 'seguimiento'], true)) {
            return response()->json(['error' => 'El informe final solo se entrega cuando el proyecto está en ministración o seguimiento.'], 422);
        }

        // Validar que la solicitud no haya superado la fecha límite para informe
        if ($solicitud->fecha_limite_informe && now() > $solicitud->fecha_limite_informe) {
            return response()->json([
                'error' => ConfigHelper::msg(Message::EVALUACION_INFORME_FALTANTE),
                'fecha_limite' => $solicitud->fecha_limite_informe->format('d/m/Y'),
            ], 422);
        }

        // E45: tipo y tamaño del informe final los configura el admin (documentos fijos).
        $maxResultados = ConfigHelper::val('validation.resultados_obtenidos_max_chars');
        $fijo = \App\Models\DocumentoFijoConfig::where('clave', 'informe_final')->first();

        $request->validate([
            'archivo_informe' => 'required|file|max:'.(\App\Support\TiposArchivo::TAMANO_MAX_MB * 1024),
            'resultados_obtenidos' => "nullable|string|max:{$maxResultados}",
        ]);

        $file = $request->file('archivo_informe');
        // Contenido real contra tipos y tamaño configurados (lanza 422 con mensaje claro).
        $extension = \App\Support\TiposArchivo::validar(
            $file,
            \App\Support\TiposArchivo::normalizar($fijo?->formatos ?? 'pdf'),
            (int) ($fijo?->tamano_maximo_mb ?? ConfigHelper::val('validation.informe_final_max_mb')),
            'archivo_informe'
        );

        try {
            // SEGURIDAD (24/09/2026): almacenamiento privado + descarga autenticada (antes disco `public`, sin sesión).
            $url = \App\Http\Controllers\ArchivoSolicitudController::guardar($file, $solicitud, $extension);
            \App\Http\Controllers\ArchivoSolicitudController::borrarPorUrl($solicitud->informe_final_url, $solicitud);

            // forceFill: `estado_informe` está en $guarded (E31) — con update() se descartaba en silencio.
            $solicitud->forceFill([
                'informe_final_url' => $url,
                'estado_informe' => 'entregado',
                'fecha_entrega_informe' => now(),
                'resultados_obtenidos' => $request->resultados_obtenidos,
            ])->save();

            return response()->json([
                'message' => ConfigHelper::msg(Message::SUCCESS_INFORME_ENTREGADO),
                'solicitud' => $solicitud,
            ]);
        } catch (\Throwable $e) {
            // El detalle va al log, nunca al cliente (revela rutas internas).
            \Illuminate\Support\Facades\Log::error('submitInforme: '.$e->getMessage(), ['solicitud' => $solicitud->id]);

            return response()->json([
                'error' => ConfigHelper::msg(Message::ERROR_STORAGE),
            ], 500);
        }
    }

    /**
     * Admin: iniciar seguimiento (ministracion → seguimiento)
     */
    public function iniciarSeguimiento(Solicitud $solicitud)
    {
        if ($solicitud->estado !== 'ministracion') {
            return response()->json([
                'error' => 'Solo se puede iniciar seguimiento en solicitudes en estado ministracion.',
            ], 422);
        }

        // forceFill(), no update(): 'estado' está en Solicitud::$guarded — ver E31 en CLAUDE.md.
        $solicitud->forceFill(['estado' => 'seguimiento'])->save();

        return response()->json([
            'message' => 'Seguimiento iniciado correctamente.',
            'solicitud' => $solicitud,
        ]);
    }

    /**
     * Admin: rechazar una solicitud (enviada|en_evaluacion → rechazada)
     */
    public function rechazar(Request $request, Solicitud $solicitud)
    {
        if (! in_array($solicitud->estado, ['enviada', 'en_evaluacion', 'aprobada'])) {
            return response()->json([
                'error' => 'Solo se puede rechazar una solicitud en estado enviada, en_evaluacion o aprobada.',
            ], 422);
        }

        $validated = $request->validate([
            'motivo' => 'nullable|string|max:1000',
        ]);

        // forceFill(), no update(): 'estado' está en Solicitud::$guarded — ver E31 en CLAUDE.md.
        $solicitud->forceFill([
            'estado' => 'rechazada',
            'observaciones_informe' => $validated['motivo'] ?? null,
        ])->save();

        return response()->json([
            'message' => 'Solicitud rechazada.',
            'solicitud' => $solicitud,
        ]);
    }

    /**
     * Admin: cancelar una solicitud (borrador|enviada|observada → cancelada)
     */
    public function cancelar(Request $request, Solicitud $solicitud)
    {
        if (! in_array($solicitud->estado, ['borrador', 'enviada', 'observada', 'en_evaluacion'])) {
            return response()->json([
                'error' => 'Solo se puede cancelar una solicitud en estado borrador, enviada, observada o en_evaluacion.',
            ], 422);
        }

        $validated = $request->validate([
            'motivo' => 'nullable|string|max:1000',
        ]);

        // forceFill(), no update(): 'estado' está en Solicitud::$guarded — ver E31 en CLAUDE.md.
        $solicitud->forceFill([
            'estado' => 'cancelada',
            'observaciones_informe' => $validated['motivo'] ?? null,
        ])->save();

        return response()->json([
            'message' => 'Solicitud cancelada.',
            'solicitud' => $solicitud,
        ]);
    }

    /**
     * Admin: close a project (ministracion|seguimiento → cerrada)
     */
    public function cerrar(Solicitud $solicitud)
    {
        if (! in_array($solicitud->estado, ['ministracion', 'seguimiento'])) {
            return response()->json([
                'error' => 'Solo se puede cerrar una solicitud en estado ministracion o seguimiento.',
            ], 422);
        }

        // forceFill(), no update(): 'estado' está en Solicitud::$guarded — ver E31 en CLAUDE.md.
        $solicitud->forceFill(['estado' => 'cerrada'])->save();

        return response()->json([
            'message' => 'Proyecto cerrado exitosamente.',
            'solicitud' => $solicitud,
        ]);
    }

    /**
     * Fetch active convocatorias for the form
     */
    public function activeConvocatorias()
    {
        // E40: solo las que reciben solicitudes hoy (no las "próximas a abrir" ni las vencidas).
        $convocatorias = Convocatoria::with('tipoPrograma')
            ->aceptandoSolicitudes()
            ->get();

        return response()->json($convocatorias);
    }
}
