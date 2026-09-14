<?php

use App\Http\Controllers\Admin\AuditLogController;
use App\Http\Controllers\Admin\CarouselController;
use App\Http\Controllers\Admin\ConvenioController;
use App\Http\Controllers\Admin\ProgramaCampoController;
use App\Http\Controllers\Admin\ProgramaCriterioEvaluacionController;
use App\Http\Controllers\Admin\ProgramaDocumentoController;
use App\Http\Controllers\Admin\ProgramaEtapaController;
use App\Http\Controllers\Admin\ProgramaModalidadController;
use App\Http\Controllers\Admin\ProgramaRubroController;
use App\Http\Controllers\Admin\ReverbStatusController;
use App\Http\Controllers\Admin\TipoProgramaController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Auth\RegistroAccesoController;
use App\Http\Controllers\Auth\SsoController;
use App\Http\Controllers\Auth\TwoFactorController;
use App\Http\Controllers\Catalogos\CatalogoController;
use App\Http\Controllers\Catalogos\ProgramaCatalogController;
use App\Http\Controllers\Convocatorias\ConvocatoriaController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DocumentoController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\DocumentoUploadController;
use App\Http\Controllers\Evaluaciones\EvaluadorController;
use App\Http\Controllers\InformeController;
use App\Http\Controllers\EmpresaController;
use App\Http\Controllers\ListaNegraController;
use App\Http\Controllers\MinistracionController;
use App\Http\Controllers\NotificacionLogController;
use App\Http\Controllers\PushController;
use App\Http\Controllers\Solicitudes\RevisionController;
use App\Http\Controllers\Solicitudes\SolicitudController;
use App\Http\Controllers\UserPreferenceController;
use App\Http\Middleware\ApiGatewayMiddleware;
use App\Http\Middleware\CircuitBreakerMiddleware;
use App\Http\Middleware\RateLimitMiddleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// B4 — Endpoint de monitoreo externo. Fuera del ApiGateway/RateLimit para que
// el monitor pueda detectar caídas del propio gateway. Throttle suave 60/min para
// evitar abuso. Auth por X-Health-Token (shared secret timing-safe).
Route::get('health', [HealthController::class, 'check'])->middleware('throttle:60,1');

// Middleware Global de Seguridad para todas las APIS
Route::middleware([
    ApiGatewayMiddleware::class,
    CircuitBreakerMiddleware::class,
    RateLimitMiddleware::class,
])->group(function () {

    // === AUTH ===
    Route::group(['prefix' => 'auth'], function () {
        // ✅ SEGURIDAD: Strict rate limiting para /auth/login (5 intentos/minuto máximo)
        Route::post('login', [AuthController::class, 'login'])
            ->middleware('auth.login.ratelimit');
        // Route::post('register', [AuthController::class, 'register']);

        // Password Reset (public — no authentication required)
        Route::post('forgot-password', [PasswordResetController::class, 'sendResetLink'])->middleware('throttle:3,1');
        Route::post('reset-password', [PasswordResetController::class, 'reset'])->middleware('throttle:5,1');

        // 2FA challenge (public — segundo paso del login antes de tener JWT)
        Route::post('2fa/challenge', [AuthController::class, 'twoFactorChallenge'])->middleware('throttle:5,1');

        // SSO OIDC (público — flujo authorization-code con PKCE)
        Route::get('sso/login', [SsoController::class, 'login']);
        Route::get('sso/callback', [SsoController::class, 'callback']);
    });

    // === REGISTRO / SOLICITUD DE ACCESO (public) ===
    Route::post('auth/solicitar-acceso', [RegistroAccesoController::class, 'store'])->middleware('throttle:3,5');

    // === PUBLIC CATALOGS (No authentication required) ===
    Route::group(['prefix' => 'catalogs/programa'], function () {
        Route::get('{tipo_programa_id}/campos', [ProgramaCatalogController::class, 'campos']);
        Route::get('{tipo_programa_id}/documentos', [ProgramaCatalogController::class, 'documentos']);
        Route::get('{tipo_programa_id}/criterios', [ProgramaCatalogController::class, 'criterios']);
        Route::get('{tipo_programa_id}/rubros', [ProgramaCatalogController::class, 'rubros']);
        Route::get('{tipo_programa_id}/etapas', [ProgramaCatalogController::class, 'etapas']);
        Route::get('{tipo_programa_id}/modalidades', [ProgramaCatalogController::class, 'modalidades']);
        Route::get('{tipo_programa_id}', [ProgramaCatalogController::class, 'show']);
    });

    // Categorías de apoyo (Fomento, Talento, Otra) — público para listar
    Route::get('categorias-apoyo', function () {
        return \App\Models\CategoriaApoyo::where('activa', true)
            ->orderBy('orden')->orderBy('nombre')->get();
    });

    // Carousel público (login page) — no authentication required
    Route::get('carousel/slides', [CarouselController::class, 'publicIndex']);

    // === PROTECTED ROUTES ===
    Route::group(['middleware' => 'api.auth'], function () {

        Route::group(['prefix' => 'auth'], function () {
            Route::post('logout', [AuthController::class, 'logout']);
            Route::post('refresh', [AuthController::class, 'refresh']);
            Route::get('me', [AuthController::class, 'me']);
            Route::put('change-password', [AuthController::class, 'changePassword']);
            Route::put('profile', [AuthController::class, 'updateProfile']);

            // 2FA management (requiere sesión activa)
            Route::post('2fa/setup', [TwoFactorController::class, 'setup']);
            Route::post('2fa/confirm', [TwoFactorController::class, 'confirm']);
            Route::post('2fa/disable', [TwoFactorController::class, 'disable']);
            Route::post('2fa/recovery-codes', [TwoFactorController::class, 'regenerateRecoveryCodes']);
        });

        // Broadcasting auth — usado por Laravel Echo para autorizar canales privados
        // (Reverb hace POST a /api/broadcasting/auth con la cookie HttpOnly + JWT)
        Route::post('broadcasting/auth', function (Request $request) {
            return Broadcast::auth($request);
        });

        // Agrupación por Roles (Ejemplo inicial, los controllers completos se implementan en fase 2)

        // ADMIN COMECYT (1)
        Route::group(['prefix' => 'admin', 'middleware' => 'admin'], function () {
            Route::get('stats', [DashboardController::class, 'adminStats']);
            Route::get('activity', [DashboardController::class, 'adminActivity']);
            Route::get('alerts', [DashboardController::class, 'adminAlerts']);
            Route::get('charts', [DashboardController::class, 'adminCharts']);
            Route::get('search', [DashboardController::class, 'globalSearch']);

            // PROGRAMAS DINÁMICOS CRUD
            Route::get('programas', [TipoProgramaController::class, 'index']);
            Route::post('programas', [TipoProgramaController::class, 'store']);
            Route::put('programas/{tipoPrograma}', [TipoProgramaController::class, 'update']);
            Route::delete('programas/{tipoPrograma}', [TipoProgramaController::class, 'destroy']);

            // Campos dinámicos por programa
            Route::get('programas/{tipoPrograma}/campos', [ProgramaCampoController::class, 'index']);
            Route::post('programas/{tipoPrograma}/campos', [ProgramaCampoController::class, 'store']);
            Route::put('programas/{tipoPrograma}/campos/{campo}', [ProgramaCampoController::class, 'update']);
            Route::delete('programas/{tipoPrograma}/campos/{campo}', [ProgramaCampoController::class, 'destroy']);

            // Documentos por programa
            Route::get('programas/{tipoPrograma}/documentos', [ProgramaDocumentoController::class, 'index']);
            Route::post('programas/{tipoPrograma}/documentos', [ProgramaDocumentoController::class, 'store']);
            Route::put('programas/{tipoPrograma}/documentos/{documento}', [ProgramaDocumentoController::class, 'update']);
            Route::delete('programas/{tipoPrograma}/documentos/{documento}', [ProgramaDocumentoController::class, 'destroy']);

            // Rubros por programa
            Route::get('programas/{tipoPrograma}/rubros', [ProgramaRubroController::class, 'index']);
            Route::post('programas/{tipoPrograma}/rubros', [ProgramaRubroController::class, 'store']);
            Route::put('programas/{tipoPrograma}/rubros/{rubro}', [ProgramaRubroController::class, 'update']);
            Route::delete('programas/{tipoPrograma}/rubros/{rubro}', [ProgramaRubroController::class, 'destroy']);

            // Etapas por programa
            Route::get('programas/{tipoPrograma}/etapas', [ProgramaEtapaController::class, 'index']);
            Route::post('programas/{tipoPrograma}/etapas', [ProgramaEtapaController::class, 'store']);
            Route::put('programas/{tipoPrograma}/etapas/{etapa}', [ProgramaEtapaController::class, 'update']);
            Route::delete('programas/{tipoPrograma}/etapas/{etapa}', [ProgramaEtapaController::class, 'destroy']);

            // Modalidades por programa
            Route::get('programas/{tipoPrograma}/modalidades', [ProgramaModalidadController::class, 'index']);
            Route::post('programas/{tipoPrograma}/modalidades', [ProgramaModalidadController::class, 'store']);
            Route::put('programas/{tipoPrograma}/modalidades/{modalidad}', [ProgramaModalidadController::class, 'update']);
            Route::delete('programas/{tipoPrograma}/modalidades/{modalidad}', [ProgramaModalidadController::class, 'destroy']);

            // Criterios de evaluación por programa
            Route::get('programas/{tipoPrograma}/criterios', [ProgramaCriterioEvaluacionController::class, 'index']);
            Route::post('programas/{tipoPrograma}/criterios', [ProgramaCriterioEvaluacionController::class, 'store']);
            Route::put('programas/{tipoPrograma}/criterios/{criterio}', [ProgramaCriterioEvaluacionController::class, 'update']);
            Route::delete('programas/{tipoPrograma}/criterios/{criterio}', [ProgramaCriterioEvaluacionController::class, 'destroy']);

            Route::apiResource('convocatorias', ConvocatoriaController::class);
            Route::apiResource('usuarios', UserController::class)->parameters(['usuarios' => 'user']);
            Route::apiResource('convenios', ConvenioController::class);
            Route::apiResource('ministraciones', MinistracionController::class)->parameters(['ministraciones' => 'ministracion']);
            Route::apiResource('informes', InformeController::class)->parameters(['informes' => 'informe']);
            Route::apiResource('empresas', EmpresaController::class)->parameters(['empresas' => 'empresa']);
            Route::apiResource('categorias-apoyo', \App\Http\Controllers\Admin\CategoriaApoyoController::class)->parameters(['categorias-apoyo' => 'categoriasApoyo']);
            Route::apiResource('lista-negra', ListaNegraController::class);
            Route::apiResource('notificaciones', NotificacionLogController::class)->only(['index', 'show']);
            Route::post('notificaciones/{notificacion}/leer', [NotificacionLogController::class, 'marcarLeida']);
            Route::post('notificaciones/leer-todas', [NotificacionLogController::class, 'marcarTodasLeidas']);
            // Asignación de Evaluadores
            Route::post('asignaciones-evaluador', [EvaluadorController::class, 'asignar']);
            Route::delete('asignaciones-evaluador/{asignacion}', [EvaluadorController::class, 'desasignar']);

            // Carousel management
            Route::get('carousel', [CarouselController::class, 'index']);
            Route::post('carousel', [CarouselController::class, 'store']);
            Route::put('carousel/{carouselSlide}', [CarouselController::class, 'update']);
            Route::delete('carousel/{carouselSlide}', [CarouselController::class, 'destroy']);

            // Convenio generation from solicitud + state transitions
            Route::post('solicitudes/{solicitud}/generar-convenio', [ConvenioController::class, 'generate']);
            Route::post('solicitudes/{solicitud}/cerrar', [SolicitudController::class, 'cerrar']);
            Route::post('solicitudes/{solicitud}/seguimiento', [SolicitudController::class, 'iniciarSeguimiento']);
            Route::post('solicitudes/{solicitud}/rechazar', [SolicitudController::class, 'rechazar']);
            Route::post('solicitudes/{solicitud}/cancelar', [SolicitudController::class, 'cancelar']);
            Route::get('solicitudes', [SolicitudController::class, 'adminIndex']);
            // Admin puede ver TODA la documentación de cualquier solicitud
            Route::get('solicitudes/{solicitud}/full', [SolicitudController::class, 'adminShowFull']);

            // Solicitudes de Acceso (registro de nuevos usuarios)
            Route::get('solicitudes-acceso', [RegistroAccesoController::class, 'index']);
            Route::post('solicitudes-acceso/{solicitudAcceso}/aprobar', [RegistroAccesoController::class, 'aprobar']);
            Route::post('solicitudes-acceso/{solicitudAcceso}/rechazar', [RegistroAccesoController::class, 'rechazar']);

            // Solicitudes de Recuperación de Contraseña
            Route::get('reset-requests', [PasswordResetController::class, 'adminIndex']);
            Route::post('reset-requests/{resetRequest}/aprobar', [PasswordResetController::class, 'adminApprove']);
            Route::post('reset-requests/{resetRequest}/rechazar', [PasswordResetController::class, 'adminReject']);

            // Reportes — solo admin
            Route::get('reportes/excel', [DocumentoController::class, 'exportExcel']);

            // Audit log
            Route::get('audit-logs', [AuditLogController::class, 'index']);

            // Reverb health check
            Route::get('reverb/status', [ReverbStatusController::class, 'status']);
        });

        // REVISOR (2)
        Route::group(['prefix' => 'revisor', 'middleware' => 'revisor'], function () {
            Route::get('stats', [DashboardController::class, 'revisorStats']);
            Route::get('charts', [DashboardController::class, 'revisorCharts']);
            Route::get('search', [DashboardController::class, 'revisorSearch']);
            Route::get('solicitudes/pendientes', [RevisionController::class, 'pendientes']);
            Route::get('solicitudes/completadas', [RevisionController::class, 'completadas']);
            Route::get('solicitudes/observadas', [RevisionController::class, 'observadas']);
            Route::get('solicitudes/{solicitud}', [RevisionController::class, 'show']);
            Route::post('solicitudes/{solicitud}/aprobar', [RevisionController::class, 'approve']);
            Route::post('solicitudes/{solicitud}/observar', [RevisionController::class, 'observe']);
            Route::post('solicitudes/{solicitud}/aprobar-informe', [RevisionController::class, 'approveInforme']);
            Route::get('informes', [InformeController::class, 'index']);
            Route::put('informes/{informe}', [InformeController::class, 'update']);
        });

        // EVALUADOR (3)
        Route::group(['prefix' => 'evaluador', 'middleware' => 'evaluador'], function () {
            Route::get('stats', [DashboardController::class, 'evaluadorStats']);
            Route::get('charts', [DashboardController::class, 'evaluadorCharts']);
            Route::get('search', [DashboardController::class, 'evaluadorSearch']);
            Route::get('asignaciones', [EvaluadorController::class, 'asignaciones']);
            Route::get('asignaciones/{asignacion}', [EvaluadorController::class, 'show']);
            Route::put('asignaciones/{asignacion}/iniciar-evaluacion', [EvaluadorController::class, 'startEvaluation']);
            Route::post('asignaciones/{asignacion}/dictamen', [EvaluadorController::class, 'saveDictamen']);
        });

        // PREFERENCIAS DEL USUARIO (todos los roles autenticados)
        Route::get('mis-preferencias', [UserPreferenceController::class, 'index']);
        Route::post('mis-preferencias', [UserPreferenceController::class, 'store']);
        Route::delete('mis-preferencias/{preferencia}', [UserPreferenceController::class, 'destroy']);

        // PUSH NOTIFICATIONS (Web Push estándar; sending requiere minishlink/web-push)
        Route::get('push/vapid-public-key', [PushController::class, 'vapidPublicKey']);
        Route::post('push/subscribe', [PushController::class, 'subscribe']);
        Route::post('push/unsubscribe', [PushController::class, 'unsubscribe']);

        // CATALOGOS GENERALES (Todos los autenticados)
        Route::get('catalogos', [CatalogoController::class, 'index']);

        // NOTIFICACIONES DEL USUARIO AUTENTICADO (todos los roles)
        Route::get('mis-notificaciones', [NotificacionLogController::class, 'index']);
        Route::post('mis-notificaciones/{notificacion}/leer', [NotificacionLogController::class, 'marcarLeida']);
        Route::post('mis-notificaciones/leer-todas', [NotificacionLogController::class, 'marcarTodasLeidas']);

        // CATALOGS - Cache management (requires authentication/admin)
        Route::delete('catalogs/programa/{tipo_programa_id}/cache', [ProgramaCatalogController::class, 'clearCache']);

        // SOLICITANTE INSTITUCIONAL (4)
        Route::group(['prefix' => 'solicitudes'], function () {
            Route::get('/', [SolicitudController::class, 'index']);
            Route::post('/', [SolicitudController::class, 'store']);
            Route::get('convocatorias-activas', [SolicitudController::class, 'activeConvocatorias']);
            Route::get('{solicitud}', [SolicitudController::class, 'show']);
            Route::post('{solicitud}/enviar', [SolicitudController::class, 'enviar']);
            Route::post('{solicitud}/reenviar', [SolicitudController::class, 'reenviar']);
            Route::post('{solicitud}/informe', [SolicitudController::class, 'submitInforme']);
            Route::post('{solicitud}/documentos', [DocumentoUploadController::class, 'upload']);
            Route::delete('{solicitud}/documentos/{documento}', [DocumentoUploadController::class, 'destroy']);
            Route::put('{solicitud}/beneficiario', [SolicitudController::class, 'updateBeneficiario']);
        });

        // === DOCUMENTOS — access control enforced inside controller ===
        // dictamen: admin or the evaluador who authored it
        // convenio: admin or the solicitud owner
        Route::get('documentos/dictamen/{dictamen}', [DocumentoController::class, 'downloadDictamen']);
        Route::get('documentos/convenio/{solicitud}', [DocumentoController::class, 'downloadConvenio']);
    });
});
