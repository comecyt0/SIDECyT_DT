<?php

use App\Http\Controllers\Admin\AuditLogController;
use App\Http\Controllers\Admin\BannerController;
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
use App\Http\Controllers\Convocatorias\ConvocatoriaPublicaController;
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
use App\Http\Controllers\Admin\DocumentoFijoController;
use App\Http\Controllers\Admin\PeriodoController;
use App\Http\Controllers\BuzonController;
use App\Http\Controllers\FolioController;
use App\Http\Controllers\PerfilController;
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
    // throttle propio (24/09/2026): endpoints públicos sin límite de ruta; el global de 300/min era el único freno.
    Route::group(['prefix' => 'catalogs/programa', 'middleware' => 'throttle:60,1'], function () {
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

    // Convocatorias para la landing pública /sigae (E37, E40): solo lectura, lista blanca de campos,
    // agrupadas por estado público, caché de 5 min. 30/min por IP basta para una página que la pide una vez.
    // `/abiertas` queda como alias de la versión anterior (misma respuesta).
    Route::get('convocatorias/publicas', [ConvocatoriaPublicaController::class, 'index'])
        ->middleware('throttle:30,1');
    Route::get('convocatorias/abiertas', [ConvocatoriaPublicaController::class, 'index'])
        ->middleware('throttle:30,1');
    // E45: folios aprobados que el admin publicó (solo folio + convocatoria). Lista blanca, caché, throttle.
    Route::get('folios-aprobados', [FolioController::class, 'publicos'])->middleware('throttle:30,1');

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

        // ═══ ADMIN — E45 (24/09/2026): tres grupos (docs/IMPLEMENTACIONES_E45.md §4) ═══
        // (a) LECTURA con alcance: admin, admin de convocatoria y consulta (solo GET).
        Route::group(['prefix' => 'admin', 'middleware' => ['rol:admin,admin_convocatoria,consulta', 'alcance']], function () {
            Route::get('stats', [DashboardController::class, 'adminStats']);
            Route::get('alerts', [DashboardController::class, 'adminAlerts']);
            Route::get('charts', [DashboardController::class, 'adminCharts']);
            Route::get('search', [DashboardController::class, 'globalSearch']);
            Route::get('convocatorias', [ConvocatoriaController::class, 'index']);
            Route::get('convocatorias/{convocatoria}', [ConvocatoriaController::class, 'show']);
            Route::get('solicitudes', [SolicitudController::class, 'adminIndex']);
            Route::get('solicitudes/{solicitud}/full', [SolicitudController::class, 'adminShowFull']);
            Route::get('solicitudes/{solicitud}/historial', [FolioController::class, 'historial']);
            Route::get('folios', [FolioController::class, 'index']);
            Route::get('reportes/excel', [DocumentoController::class, 'exportExcel']);
            Route::get('periodos', [PeriodoController::class, 'index']);
        });

        // (b) OPERACIÓN con alcance: admin y admin de convocatoria.
        Route::group(['prefix' => 'admin', 'middleware' => ['rol:admin,admin_convocatoria', 'alcance']], function () {
            Route::apiResource('convenios', ConvenioController::class)->except(['store']);
            Route::apiResource('ministraciones', MinistracionController::class)->parameters(['ministraciones' => 'ministracion']);
            Route::apiResource('informes', InformeController::class)->parameters(['informes' => 'informe']);
            Route::get('evaluadores-disponibles', [EvaluadorController::class, 'disponibles']);
            Route::post('asignaciones-evaluador', [EvaluadorController::class, 'asignar']);
            Route::delete('asignaciones-evaluador/{asignacion}', [EvaluadorController::class, 'desasignar']);
            Route::post('solicitudes/{solicitud}/generar-convenio', [ConvenioController::class, 'generate']);
            Route::post('solicitudes/{solicitud}/cerrar', [SolicitudController::class, 'cerrar']);
            Route::post('solicitudes/{solicitud}/seguimiento', [SolicitudController::class, 'iniciarSeguimiento']);
            Route::post('solicitudes/{solicitud}/rechazar', [SolicitudController::class, 'rechazar']);
            Route::post('solicitudes/{solicitud}/cancelar', [SolicitudController::class, 'cancelar']);
            // Folios aprobados en la landing (E45): revisar, confirmar y despublicar.
            Route::get('convocatorias/{convocatoria}/folios-publicados', [FolioController::class, 'publicacion']);
            Route::post('convocatorias/{convocatoria}/folios-publicados', [FolioController::class, 'publicar'])->middleware('throttle:20,1');
            Route::delete('convocatorias/{convocatoria}/folios-publicados', [FolioController::class, 'despublicar'])->middleware('throttle:20,1');
        });

        // (c) SOLO ADMIN GENERAL.
        Route::group(['prefix' => 'admin', 'middleware' => 'admin'], function () {
            Route::get('activity', [DashboardController::class, 'adminActivity']);

            // PROGRAMAS DINÁMICOS CRUD
            Route::get('programas', [TipoProgramaController::class, 'index']);
            Route::post('programas', [TipoProgramaController::class, 'store']);
            Route::put('programas/{tipoPrograma}', [TipoProgramaController::class, 'update']);
            Route::delete('programas/{tipoPrograma}', [TipoProgramaController::class, 'destroy']);

            Route::get('programas/{tipoPrograma}/campos', [ProgramaCampoController::class, 'index']);
            Route::post('programas/{tipoPrograma}/campos', [ProgramaCampoController::class, 'store']);
            Route::put('programas/{tipoPrograma}/campos/{campo}', [ProgramaCampoController::class, 'update']);
            Route::delete('programas/{tipoPrograma}/campos/{campo}', [ProgramaCampoController::class, 'destroy']);

            Route::get('programas/{tipoPrograma}/documentos', [ProgramaDocumentoController::class, 'index']);
            Route::post('programas/{tipoPrograma}/documentos', [ProgramaDocumentoController::class, 'store']);
            Route::put('programas/{tipoPrograma}/documentos/{documento}', [ProgramaDocumentoController::class, 'update']);
            Route::delete('programas/{tipoPrograma}/documentos/{documento}', [ProgramaDocumentoController::class, 'destroy']);

            Route::get('programas/{tipoPrograma}/rubros', [ProgramaRubroController::class, 'index']);
            Route::post('programas/{tipoPrograma}/rubros', [ProgramaRubroController::class, 'store']);
            Route::put('programas/{tipoPrograma}/rubros/{rubro}', [ProgramaRubroController::class, 'update']);
            Route::delete('programas/{tipoPrograma}/rubros/{rubro}', [ProgramaRubroController::class, 'destroy']);

            Route::get('programas/{tipoPrograma}/etapas', [ProgramaEtapaController::class, 'index']);
            Route::post('programas/{tipoPrograma}/etapas', [ProgramaEtapaController::class, 'store']);
            Route::put('programas/{tipoPrograma}/etapas/{etapa}', [ProgramaEtapaController::class, 'update']);
            Route::delete('programas/{tipoPrograma}/etapas/{etapa}', [ProgramaEtapaController::class, 'destroy']);

            Route::get('programas/{tipoPrograma}/modalidades', [ProgramaModalidadController::class, 'index']);
            Route::post('programas/{tipoPrograma}/modalidades', [ProgramaModalidadController::class, 'store']);
            Route::put('programas/{tipoPrograma}/modalidades/{modalidad}', [ProgramaModalidadController::class, 'update']);
            Route::delete('programas/{tipoPrograma}/modalidades/{modalidad}', [ProgramaModalidadController::class, 'destroy']);

            Route::get('programas/{tipoPrograma}/criterios', [ProgramaCriterioEvaluacionController::class, 'index']);
            Route::post('programas/{tipoPrograma}/criterios', [ProgramaCriterioEvaluacionController::class, 'store']);
            Route::put('programas/{tipoPrograma}/criterios/{criterio}', [ProgramaCriterioEvaluacionController::class, 'update']);
            Route::delete('programas/{tipoPrograma}/criterios/{criterio}', [ProgramaCriterioEvaluacionController::class, 'destroy']);

            // Convocatorias: crear/editar/borrar solo el admin general (la lectura está en el grupo a).
            Route::post('convocatorias', [ConvocatoriaController::class, 'store']);
            Route::match(['put', 'patch'], 'convocatorias/{convocatoria}', [ConvocatoriaController::class, 'update']);
            // E47 — asistente: guardado atómico (todo o nada) y borradores por usuario (autoguardado).
            Route::post('asistente-convocatoria', [\App\Http\Controllers\Admin\AsistenteConvocatoriaController::class, 'crear'])->middleware('throttle:20,1,asistente');
            Route::get('asistente-convocatoria/borradores', [\App\Http\Controllers\Admin\AsistenteConvocatoriaController::class, 'borradores']);
            Route::get('asistente-convocatoria/borradores/{id}', [\App\Http\Controllers\Admin\AsistenteConvocatoriaController::class, 'borrador'])->whereNumber('id');
            Route::post('asistente-convocatoria/borradores', [\App\Http\Controllers\Admin\AsistenteConvocatoriaController::class, 'guardarBorrador'])->middleware('throttle:30,1,borrador-nuevo');
            Route::put('asistente-convocatoria/borradores/{id}', [\App\Http\Controllers\Admin\AsistenteConvocatoriaController::class, 'guardarBorrador'])->whereNumber('id')->middleware('throttle:120,1,borrador');
            Route::delete('asistente-convocatoria/borradores/{id}', [\App\Http\Controllers\Admin\AsistenteConvocatoriaController::class, 'eliminarBorrador'])->whereNumber('id');
            // E40 — prórroga y banner
            Route::post('convocatorias/{convocatoria}/prorroga', [ConvocatoriaController::class, 'prorroga'])->middleware('throttle:20,1');
            Route::post('convocatorias/{convocatoria}/banner', [BannerController::class, 'storeConvocatoria'])->middleware('throttle:20,1');
            Route::delete('convocatorias/{convocatoria}/banner', [BannerController::class, 'destroyConvocatoria'])->middleware('throttle:20,1');
            Route::post('programas/{tipoPrograma}/banner', [BannerController::class, 'storePrograma'])->middleware('throttle:20,1');
            Route::delete('programas/{tipoPrograma}/banner', [BannerController::class, 'destroyPrograma'])->middleware('throttle:20,1');
            Route::apiResource('usuarios', UserController::class)->parameters(['usuarios' => 'user']);
            Route::apiResource('empresas', EmpresaController::class)->parameters(['empresas' => 'empresa']);
            Route::apiResource('categorias-apoyo', \App\Http\Controllers\Admin\CategoriaApoyoController::class)->parameters(['categorias-apoyo' => 'categoriasApoyo']);
            Route::apiResource('lista-negra', ListaNegraController::class);
            Route::apiResource('notificaciones', NotificacionLogController::class)->only(['index', 'show']);
            Route::post('notificaciones/{notificacion}/leer', [NotificacionLogController::class, 'marcarLeida']);
            Route::post('notificaciones/leer-todas', [NotificacionLogController::class, 'marcarTodasLeidas']);

            // E45: periodos y límites de los documentos fijos.
            Route::post('periodos', [PeriodoController::class, 'store']);
            Route::put('periodos/{periodo}', [PeriodoController::class, 'update']);
            Route::delete('periodos/{periodo}', [PeriodoController::class, 'destroy']);
            Route::get('documentos-fijos', [DocumentoFijoController::class, 'index']);
            Route::put('documentos-fijos/{documentoFijo}', [DocumentoFijoController::class, 'update']);

            // Carousel management
            Route::get('carousel', [CarouselController::class, 'index']);
            Route::post('carousel/upload', [CarouselController::class, 'upload']);
            Route::post('carousel', [CarouselController::class, 'store']);
            Route::put('carousel/{carouselSlide}', [CarouselController::class, 'update']);
            Route::delete('carousel/{carouselSlide}', [CarouselController::class, 'destroy']);

            // Solicitudes de Acceso (registro de nuevos usuarios)
            Route::get('solicitudes-acceso', [RegistroAccesoController::class, 'index']);
            Route::post('solicitudes-acceso/{solicitudAcceso}/aprobar', [RegistroAccesoController::class, 'aprobar']);
            Route::post('solicitudes-acceso/{solicitudAcceso}/rechazar', [RegistroAccesoController::class, 'rechazar']);

            // Solicitudes de Recuperación de Contraseña
            Route::get('reset-requests', [PasswordResetController::class, 'adminIndex']);
            Route::post('reset-requests/{resetRequest}/aprobar', [PasswordResetController::class, 'adminApprove']);
            Route::post('reset-requests/{resetRequest}/rechazar', [PasswordResetController::class, 'adminReject']);

            // Audit log
            Route::get('audit-logs', [AuditLogController::class, 'index']);

            // Reverb health check
            Route::get('reverb/status', [ReverbStatusController::class, 'status']);
        });

        // ═══ BUZÓN con chat (E45): solicitantes, admin y admin de convocatoria. Participación revisada en el controlador. ═══
        Route::group(['prefix' => 'buzon', 'middleware' => 'rol:solicitante,admin,admin_convocatoria'], function () {
            Route::get('/', [BuzonController::class, 'index']);
            Route::get('convocatorias', [BuzonController::class, 'convocatoriasDisponibles']);
            Route::post('/', [BuzonController::class, 'store'])->middleware('throttle:10,1');
            Route::get('{conversacion}', [BuzonController::class, 'show']);
            Route::post('{conversacion}/mensajes', [BuzonController::class, 'mensaje'])->middleware('throttle:30,1');
            Route::post('{conversacion}/leer', [BuzonController::class, 'leer']);
            Route::post('{conversacion}/resolver', [BuzonController::class, 'resolver']);
            Route::post('{conversacion}/reabrir', [BuzonController::class, 'reabrir']);
        });

        // ═══ PERFIL (E45): todos los roles. ═══
        Route::get('mi-perfil', [PerfilController::class, 'show']);
        Route::put('mi-perfil', [PerfilController::class, 'update']);
        Route::post('mi-perfil/avatar', [PerfilController::class, 'subirAvatar'])->middleware('throttle:10,1');
        Route::delete('mi-perfil/avatar', [PerfilController::class, 'quitarAvatar']);
        Route::post('mi-perfil/banner', [PerfilController::class, 'subirBanner'])->middleware('throttle:10,1');
        Route::delete('mi-perfil/banner', [PerfilController::class, 'quitarBanner']);
        Route::get('media/perfil/{archivo}', [PerfilController::class, 'media'])
            ->where('archivo', '[A-Za-z0-9]{40}\.webp')->middleware('throttle:600,1');
        Route::get('perfiles/{user}', [PerfilController::class, 'ficha'])->middleware('throttle:120,1');

        // Límites de documentos fijos para mostrar en los formularios de subida (E45).
        Route::get('config/documentos-fijos', [DocumentoFijoController::class, 'publico']);

        // REVISOR (2)
        Route::group(['prefix' => 'revisor', 'middleware' => ['revisor', 'alcance']], function () {
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
        Route::group(['prefix' => 'evaluador', 'middleware' => ['evaluador', 'alcance']], function () {
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
        // SEGURIDAD (24/09/2026): antes cualquier usuario con sesión podía vaciar esta caché.
        Route::delete('catalogs/programa/{tipo_programa_id}/cache', [ProgramaCatalogController::class, 'clearCache'])->middleware('admin');

        // SOLICITANTE INSTITUCIONAL (4)
        Route::group(['prefix' => 'solicitudes', 'middleware' => 'alcance'], function () {
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
        Route::get('documentos/convenio/{solicitud}', [DocumentoController::class, 'downloadConvenio'])->middleware('alcance');

        // Archivos de solicitud en almacenamiento privado (24/09/2026): permiso por rol dentro del controlador
        // (admin, revisor, dueño, evaluador asignado). El nombre solo acepta el formato que genera el sistema.
        Route::get('archivos/solicitudes/{solicitud}/{archivo}', [\App\Http\Controllers\ArchivoSolicitudController::class, 'descargar'])
            ->where('archivo', \App\Http\Controllers\ArchivoSolicitudController::PATRON_NOMBRE)
            ->middleware('throttle:120,1');
    });
});
