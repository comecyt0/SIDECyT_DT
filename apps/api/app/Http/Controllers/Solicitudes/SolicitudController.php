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
        $query = Solicitud::with(['user', 'empresa', 'convocatoria'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('folio', 'ilike', "%{$search}%")
                    ->orWhere('titulo_proyecto', 'ilike', "%{$search}%")
                    ->orWhereHas('empresa', fn ($qi) => $qi->where('nombre', 'ilike', "%{$search}%"));
            });
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        $perPage = (int) $request->get('per_page', 0);

        if ($perPage > 0) {
            return response()->json($query->paginate($perPage));
        }

        return response()->json($query->get());
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

        // 🟢 2. Validar que la convocatoria esté activa
        $convocatoria = Convocatoria::findOrFail($request->convocatoria_id);
        if ($convocatoria->estado !== 'activa') {
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
                    $solicitud = Solicitud::create([
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
                    ]);
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
            'convocatoria.tipoPrograma.criteriosEvaluacion',
            'empresa',
            'areaConocimiento',
            'observaciones',
            'documentos',
            'asignaciones.dictamen',
            'asignaciones.evaluador',
            'ministracion.banco',
            'convenio',
            'informe',
        ]);

        return response()->json($solicitud);
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

        $solicitud->update([
            'estado' => 'enviada',
        ]);

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

        $solicitud->update([
            'estado' => 'enviada',
        ]);

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

        // Validar que la solicitud no haya superado la fecha límite para informe
        if ($solicitud->fecha_limite_informe && now() > $solicitud->fecha_limite_informe) {
            return response()->json([
                'error' => ConfigHelper::msg(Message::EVALUACION_INFORME_FALTANTE),
                'fecha_limite' => $solicitud->fecha_limite_informe->format('d/m/Y'),
            ], 422);
        }

        // Get configured limits
        $maxFileSize = ConfigHelper::val('validation.informe_final_max_mb') * 1024;  // Convert to KB
        $maxResultados = ConfigHelper::val('validation.resultados_obtenidos_max_chars');

        $request->validate([
            'archivo_informe' => "required|file|mimes:pdf|max:{$maxFileSize}",
            'resultados_obtenidos' => "nullable|string|max:{$maxResultados}",
        ]);

        $file = $request->file('archivo_informe');

        // ✅ SEGURIDAD: Validar MIME type binario (no solo extensión)
        try {
            $this->validateBinaryMimeType($file->getRealPath());
        } catch (ValidationException $e) {
            return response()->json([
                'error' => ConfigHelper::msg(Message::DOCUMENTO_MIME_INVALIDO),
                'message' => ConfigHelper::msg(Message::DOCUMENTO_CORRUPTO),
            ], 422);
        }

        $filename = "{$solicitud->folio}_informe_final_".time().'.pdf';

        try {
            // Store in public disk: storage/app/public/documentos/{solicitud_id}
            Storage::disk('public')->putFileAs("documentos/{$solicitud->id}", $file, $filename);
            $publicUrl = Storage::disk('public')->url("documentos/{$solicitud->id}/{$filename}");

            $solicitud->update([
                'informe_final_url' => $publicUrl,
                'estado_informe' => 'entregado',
                'fecha_entrega_informe' => now(),
                'resultados_obtenidos' => $request->resultados_obtenidos,
            ]);

            return response()->json([
                'message' => ConfigHelper::msg(Message::SUCCESS_INFORME_ENTREGADO),
                'solicitud' => $solicitud,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => ConfigHelper::msg(Message::ERROR_STORAGE),
                'detail' => $e->getMessage(),
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

        $solicitud->update(['estado' => 'seguimiento']);

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

        $solicitud->update([
            'estado' => 'rechazada',
            'observaciones_informe' => $validated['motivo'] ?? null,
        ]);

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

        $solicitud->update([
            'estado' => 'cancelada',
            'observaciones_informe' => $validated['motivo'] ?? null,
        ]);

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

        $solicitud->update(['estado' => 'cerrada']);

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
        $convocatorias = Convocatoria::with('tipoPrograma')
            ->where('estado', 'activa')
            ->get();

        return response()->json($convocatorias);
    }
}
