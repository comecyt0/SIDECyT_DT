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

// E72 — Canal interno con SICEI (2FA único). Fuera del ApiGateway: solo lo llama la API de SICEI desde el propio
// servidor, con firma HMAC, fecha a ±60 s y sin repetir (InternoSiceiMiddleware). Cualquier otra petición recibe 404.
Route::prefix('interno/sicei/2fa')
    ->middleware([\App\Http\Middleware\InternoSiceiMiddleware::class, 'throttle:120,1,interno-sicei'])
    ->group(function () {
        Route::post('verificar', [\App\Http\Controllers\Interno\DosFactoresSiceiController::class, 'verificar']);
        Route::post('configurar', [\App\Http\Controllers\Interno\DosFactoresSiceiController::class, 'configurar']);
        Route::post('confirmar', [\App\Http\Controllers\Interno\DosFactoresSiceiController::class, 'confirmar']);
        // Otros métodos: 404 (un 405 confirmaría que la ruta existe)
        Route::match(['get', 'put', 'patch', 'delete'], '{accion}', fn () => response('', 404))
            ->where('accion', 'verificar|configurar|confirmar');
    });

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
// E52 · Registro general (elige rol: participante, líder de club o evaluador). Público: throttle con prefijo propio,
// lista blanca de campos, CV verificado por contenido, duplicados con respuesta idéntica (sin enumeración).
Route::post('auth/registro', [\App\Http\Controllers\Auth\RegistroGeneralController::class, 'registrar'])->middleware('throttle:10,10,registro'); // 10 cada 10 min por IP: escuelas e instituciones salen por una sola IP
Route::get('registro/opciones', [\App\Http\Controllers\Auth\RegistroGeneralController::class, 'opciones'])->middleware('throttle:30,1,registro-opciones');
// E52 · Autollenado por código postal (solo Estado de México). Una consulta por código; nunca el catálogo completo.
Route::get('codigos-postales/{cp}', [\App\Http\Controllers\CodigoPostalController::class, 'show'])
    ->where('cp', '[0-9]{5}')->middleware('throttle:60,1,cp');

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
    Route::get('carousel/slides', [CarouselController::class, 'publicIndex'])->middleware('throttle:60,1,carrusel');

    // Convocatorias para la landing pública /sigae (E37, E40): solo lectura, lista blanca de campos,
    // agrupadas por estado público, caché de 5 min. 30/min por IP basta para una página que la pide una vez.
    // `/abiertas` queda como alias de la versión anterior (misma respuesta).
    Route::get('convocatorias/publicas', [ConvocatoriaPublicaController::class, 'index'])
        ->middleware('throttle:30,1');
    Route::get('convocatorias/abiertas', [ConvocatoriaPublicaController::class, 'index'])
        ->middleware('throttle:30,1');
    // E45: folios aprobados que el admin publicó (solo folio + convocatoria). Lista blanca, caché, throttle.
    Route::get('folios-aprobados', [FolioController::class, 'publicos'])->middleware('throttle:30,1');
    // E49: contenido de las landings de SIDECyT (programas, sectores, documentos), administrable en /admin/sitio.
    Route::get('sitio/{sistema}', [\App\Http\Controllers\SitioPublicoController::class, 'show'])
        ->whereIn('sistema', ['sigae', 'sicei'])->middleware('throttle:30,1,sitio');

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
        // E81: exportación (antes que la ficha para no chocar con {tipo}) y vista previa de un folio.
        Route::get('folios/exportar', [FolioController::class, 'exportar'])->middleware('throttle:20,1,folios-exportar');
        Route::get('folios/{tipo}/{id}/ficha', [FolioController::class, 'ficha'])->where(['tipo' => 'solicitud|club', 'id' => '[0-9]+'])->middleware('throttle:120,1,folios-ficha');
            Route::get('reportes/excel', [DocumentoController::class, 'exportExcel']);
            Route::get('periodos', [PeriodoController::class, 'index']);
            // E52 · Apoyo en especie: clubes registrados (lectura con alcance; la revisión llega en F2).
            Route::get('especie/convocatorias', [\App\Http\Controllers\Admin\ClubAdminController::class, 'convocatorias']);
            Route::get('convocatorias/{convocatoria}/clubes', [\App\Http\Controllers\Admin\ClubAdminController::class, 'index']);
            Route::get('clubes/{club}', [\App\Http\Controllers\Admin\ClubAdminController::class, 'show']);
            // Configuración (clubes y kit): la ven los tres roles dentro de su alcance; solo el admin la cambia (abajo).
            Route::get('convocatorias/{convocatoria}/especie', [\App\Http\Controllers\Admin\EspecieConfigController::class, 'show']);
        });

        // (b) OPERACIÓN con alcance: admin y admin de convocatoria.
        Route::group(['prefix' => 'admin', 'middleware' => ['rol:admin,admin_convocatoria', 'alcance']], function () {
            Route::apiResource('convenios', ConvenioController::class)->except(['store']);
            Route::apiResource('ministraciones', MinistracionController::class)->parameters(['ministraciones' => 'ministracion']);
            Route::apiResource('informes', InformeController::class)->parameters(['informes' => 'informe']);
            Route::get('evaluadores-disponibles', [EvaluadorController::class, 'disponibles']);
            Route::post('asignaciones-evaluador', [EvaluadorController::class, 'asignar']);
            Route::delete('asignaciones-evaluador/{asignacion}', [EvaluadorController::class, 'desasignar']);
            // E72 paso 5: conflictos de interés, fecha límite, reabrir dictamen y decisión del admin con el promedio
            Route::get('solicitudes/{solicitud}/candidatos-evaluador', [EvaluadorController::class, 'candidatos']);
            Route::post('solicitudes/{solicitud}/bloquear-evaluador', [EvaluadorController::class, 'bloquear']);
            Route::put('asignaciones-evaluador/{asignacion}/fecha', [EvaluadorController::class, 'ampliarFecha']);
            Route::post('asignaciones-evaluador/{asignacion}/reabrir', [EvaluadorController::class, 'reabrir']);
            Route::get('solicitudes/{solicitud}/evaluacion', [EvaluadorController::class, 'resultado']);
            Route::post('solicitudes/{solicitud}/evaluacion/decidir', [EvaluadorController::class, 'decidir']);
            Route::post('solicitudes/{solicitud}/generar-convenio', [ConvenioController::class, 'generate']);
            Route::post('solicitudes/{solicitud}/cerrar', [SolicitudController::class, 'cerrar']);
            Route::post('solicitudes/{solicitud}/seguimiento', [SolicitudController::class, 'iniciarSeguimiento']);
            Route::post('solicitudes/{solicitud}/rechazar', [SolicitudController::class, 'rechazar']);
            Route::post('solicitudes/{solicitud}/cancelar', [SolicitudController::class, 'cancelar']);
            // Folios aprobados en la landing (E45): revisar, confirmar y despublicar.
            Route::get('convocatorias/{convocatoria}/folios-publicados', [FolioController::class, 'publicacion']);
            Route::post('convocatorias/{convocatoria}/folios-publicados', [FolioController::class, 'publicar'])->middleware('throttle:20,1');
            Route::delete('convocatorias/{convocatoria}/folios-publicados', [FolioController::class, 'despublicar'])->middleware('throttle:20,1');
            // E55 — solicitudes de registro de escuela (admin y admin de convocatoria; alcance revisado en el controlador).
            $es = \App\Http\Controllers\Club\EscuelaSolicitudController::class;
            Route::get('escuelas/solicitudes', [$es, 'index']);
            Route::post('escuelas/solicitudes/{solicitud}/aceptar', [$es, 'aceptar'])->whereNumber('solicitud')->middleware('throttle:60,1,escuela-solicitud-admin');
            Route::post('escuelas/solicitudes/{solicitud}/rechazar', [$es, 'rechazar'])->whereNumber('solicitud')->middleware('throttle:60,1,escuela-solicitud-admin');
        });

        // (c) SOLO ADMIN GENERAL.
        Route::group(['prefix' => 'admin', 'middleware' => 'admin'], function () {
            Route::get('activity', [DashboardController::class, 'adminActivity']);

            // E52 · F1: catálogo de escuelas y configuración de Apoyo en especie por convocatoria.
            Route::get('escuelas/plantilla', [\App\Http\Controllers\Admin\EscuelaController::class, 'plantilla']);
            Route::post('escuelas/importar', [\App\Http\Controllers\Admin\EscuelaController::class, 'importar'])->middleware('throttle:10,1,escuelas-importar');
            Route::get('escuelas', [\App\Http\Controllers\Admin\EscuelaController::class, 'index']);
            Route::post('escuelas', [\App\Http\Controllers\Admin\EscuelaController::class, 'store']);
            Route::put('escuelas/{escuela}', [\App\Http\Controllers\Admin\EscuelaController::class, 'update']);
            Route::put('convocatorias/{convocatoria}/especie', [\App\Http\Controllers\Admin\EspecieConfigController::class, 'update']);
            // E70: personas que se pueden asignar a una fase de revisión (id, nombre, rol).
            Route::get('especie/revisores-candidatos', fn () => response()->json(\App\Support\EtapasEspecie::candidatos()));

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
            // E49 — contenido público de las landings (solo admin general).
            Route::get('programas-publicos', [\App\Http\Controllers\Admin\ContenidoSitioController::class, 'programas']);
            Route::post('programas-publicos', [\App\Http\Controllers\Admin\ContenidoSitioController::class, 'guardarPrograma'])->middleware('throttle:60,1,sitio-admin');
            Route::post('programas-publicos/orden', [\App\Http\Controllers\Admin\ContenidoSitioController::class, 'ordenar'])->middleware('throttle:60,1,sitio-admin');
            Route::put('programas-publicos/{programa}', [\App\Http\Controllers\Admin\ContenidoSitioController::class, 'guardarPrograma'])->whereNumber('programa')->middleware('throttle:60,1,sitio-admin');
            Route::delete('programas-publicos/{programa}', [\App\Http\Controllers\Admin\ContenidoSitioController::class, 'eliminarPrograma'])->whereNumber('programa')->middleware('throttle:60,1,sitio-admin');
            Route::get('contenido-sitio/{clave}', [\App\Http\Controllers\Admin\ContenidoSitioController::class, 'contenido'])->where('clave', '[a-z_.]{3,60}');
            Route::put('contenido-sitio/{clave}', [\App\Http\Controllers\Admin\ContenidoSitioController::class, 'guardarContenido'])->where('clave', '[a-z_.]{3,60}')->middleware('throttle:60,1,sitio-admin');
            // E47 — asistente: guardado atómico (todo o nada) y borradores por usuario (autoguardado).
            Route::post('asistente-convocatoria', [\App\Http\Controllers\Admin\AsistenteConvocatoriaController::class, 'crear'])->middleware('throttle:20,1,asistente');
            Route::get('asistente-convocatoria/borradores', [\App\Http\Controllers\Admin\AsistenteConvocatoriaController::class, 'borradores']);
            Route::get('asistente-convocatoria/borradores/{id}', [\App\Http\Controllers\Admin\AsistenteConvocatoriaController::class, 'borrador'])->whereNumber('id');
            Route::post('asistente-convocatoria/borradores', [\App\Http\Controllers\Admin\AsistenteConvocatoriaController::class, 'guardarBorrador'])->middleware('throttle:30,1,borrador-nuevo');
            Route::put('asistente-convocatoria/borradores/{id}', [\App\Http\Controllers\Admin\AsistenteConvocatoriaController::class, 'guardarBorrador'])->whereNumber('id')->middleware('throttle:120,1,borrador');
            Route::delete('asistente-convocatoria/borradores/{id}', [\App\Http\Controllers\Admin\AsistenteConvocatoriaController::class, 'eliminarBorrador'])->whereNumber('id');
            // E40 — prórroga y banner
            Route::post('convocatorias/{convocatoria}/prorroga', [ConvocatoriaController::class, 'prorroga'])->middleware('throttle:20,1');
            // E54 — programa al que pertenece la convocatoria (solo admin)
            Route::put('convocatorias/{convocatoria}/programa', [ConvocatoriaController::class, 'cambiarPrograma'])->middleware('throttle:30,1,convocatoria-programa');
            Route::post('convocatorias/{convocatoria}/banner', [BannerController::class, 'storeConvocatoria'])->middleware('throttle:20,1');
            Route::delete('convocatorias/{convocatoria}/banner', [BannerController::class, 'destroyConvocatoria'])->middleware('throttle:20,1');
            Route::post('programas/{tipoPrograma}/banner', [BannerController::class, 'storePrograma'])->middleware('throttle:20,1');
            Route::delete('programas/{tipoPrograma}/banner', [BannerController::class, 'destroyPrograma'])->middleware('throttle:20,1');
            Route::apiResource('usuarios', UserController::class)->parameters(['usuarios' => 'user']);
            Route::apiResource('empresas', EmpresaController::class)->parameters(['empresas' => 'empresa']);
            Route::apiResource('categorias-apoyo', \App\Http\Controllers\Admin\CategoriaApoyoController::class)->parameters(['categorias-apoyo' => 'categoriasApoyo']);
            // E85: sin «destroy» (el controlador no lo tiene; «Levantar» la desactiva).
            Route::apiResource('lista-negra', ListaNegraController::class)->except(['destroy']);
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
        // E52: CV del registro de evaluador, solicitudes de rol de cuentas existentes y roles otorgados por cuenta.
        Route::get('solicitudes-acceso/{solicitudAcceso}/cv', [RegistroAccesoController::class, 'cv'])->middleware('throttle:60,1,cv');
        Route::get('solicitudes-rol', [\App\Http\Controllers\Admin\SolicitudRolController::class, 'index']);
        Route::post('solicitudes-rol/{solicitudRol}/aprobar', [\App\Http\Controllers\Admin\SolicitudRolController::class, 'aprobar']);
        Route::post('solicitudes-rol/{solicitudRol}/rechazar', [\App\Http\Controllers\Admin\SolicitudRolController::class, 'rechazar']);
        Route::get('solicitudes-rol/{solicitudRol}/cv', [\App\Http\Controllers\Admin\SolicitudRolController::class, 'cv'])->middleware('throttle:60,1,cv');
        Route::get('usuarios/{user}/roles', [\App\Http\Controllers\Admin\SolicitudRolController::class, 'rolesDeUsuario']);
        Route::delete('usuarios/{user}/roles/{rol}', [\App\Http\Controllers\Admin\SolicitudRolController::class, 'revocar']);

            // E68 (08/10/2026): /admin/reset-requests retirado; la recuperación de contraseña es automática por correo.

            // Audit log
            Route::get('audit-logs', [AuditLogController::class, 'index']);
        Route::get('audit-logs/exportar', [AuditLogController::class, 'exportar'])->middleware('throttle:20,1,bitacora-exportar'); // E82

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

        // ═══ E52 · F1 — PANEL DEL LÍDER DE CLUB (Apoyo en especie). Propiedad del club revisada en el controlador. ═══
        // E61: también el «Acompañante de club» (líder B / director); qué puede ver u operar lo decide Club::accesoDe().
        Route::group(['prefix' => 'club', 'middleware' => 'rol:lider_club,acompanante_club'], function () {
            $c = \App\Http\Controllers\Club\ClubController::class;
            // E61 — acompañantes del club (solo el líder)
            $ac = \App\Http\Controllers\Club\ClubAccesoController::class;
            Route::get('clubes/{club}/accesos', [$ac, 'index']);
            Route::post('clubes/{club}/accesos', [$ac, 'store'])->middleware('throttle:10,10,club-accesos');
            Route::delete('clubes/{club}/accesos/{tipo}', [$ac, 'destroy'])->where('tipo', 'lider_a|lider_b|director')->middleware('throttle:20,10,club-accesos-baja');
            Route::put('clubes/{club}/accesos/director/colider', [$ac, 'colider'])->middleware('throttle:20,10,club-colider');
            // 08/10/2026: compartir el permiso de operar y ceder el lugar (cadena director → líder A → líder B).
            Route::put('clubes/{club}/accesos/{tipo}/compartir', [$ac, 'compartir'])->where('tipo', 'lider_a|lider_b|director')->middleware('throttle:20,10,club-colider');
            Route::post('clubes/{club}/ceder', [$ac, 'ceder'])->middleware('throttle:10,10,club-ceder');
            Route::get('convocatorias', [$c, 'convocatorias']);
            Route::get('escuelas', [$c, 'escuelas'])->middleware('throttle:60,1,escuelas-buscar');
            // E55 — solicitar el registro de una escuela que no está en el catálogo
            Route::get('escuelas/solicitudes', [\App\Http\Controllers\Club\EscuelaSolicitudController::class, 'misSolicitudes']);
            Route::post('escuelas/solicitudes', [\App\Http\Controllers\Club\EscuelaSolicitudController::class, 'store'])->middleware('throttle:5,10,escuela-solicitud');
            Route::post('clubes', [$c, 'store'])->middleware('throttle:10,1,club-crear');
            Route::get('clubes/{club}', [$c, 'show']);
            Route::put('clubes/{club}', [$c, 'update']);
            Route::post('clubes/{club}/logo', [$c, 'subirLogo'])->middleware('throttle:30,1,club-subidas');
            Route::delete('clubes/{club}/logo', [$c, 'quitarLogo']);
            Route::post('clubes/{club}/integrantes', [$c, 'agregarIntegrante']);
            Route::put('clubes/{club}/integrantes/{integrante}', [$c, 'actualizarIntegrante']);
            Route::delete('clubes/{club}/integrantes/{integrante}', [$c, 'quitarIntegrante']);
            Route::post('clubes/{club}/integrantes/{integrante}/foto', [$c, 'subirFoto'])->middleware('throttle:30,1,club-subidas');
            Route::delete('clubes/{club}/integrantes/{integrante}/foto', [$c, 'quitarFoto']);
            Route::post('clubes/{club}/documentos', [$c, 'subirDocumento'])->middleware('throttle:30,1,club-subidas');
            Route::delete('clubes/{club}/documentos/{clave}', [$c, 'quitarDocumento'])->where('clave', '[a-z0-9_]+');
            Route::get('clubes/{club}/carta-escuela', [$c, 'cartaEscuela'])->middleware('throttle:20,1,club-carta');
            // E79: formatos institucionales llenos (PDF sin edición) y permiso de uso de imagen de cada integrante.
            Route::get('clubes/{club}/formatos/{formato}', [$c, 'formato'])->where('formato', 'carta_escuela|formato_a|formato_b|formato_c')->middleware('throttle:30,1,club-carta');
            Route::get('clubes/{club}/integrantes/{integrante}/uso-imagen', [$c, 'usoImagen'])->middleware('throttle:60,1,club-carta');
            Route::post('clubes/{club}/enviar', [$c, 'enviar'])->middleware('throttle:10,1,club-enviar');
            // E52 · F3 — logística del club aceptado
            $l = \App\Http\Controllers\Club\LogisticaClubController::class;
            Route::post('clubes/{club}/logistica', [$l, 'solicitar'])->middleware('throttle:30,1,club-logistica');
            Route::delete('clubes/{club}/logistica/{logistica}', [$l, 'cancelar'])->middleware('throttle:30,1,club-logistica');
            Route::get('clubes/{club}/logistica/{logistica}/formato', [$l, 'formato'])->middleware('throttle:20,1,club-carta');
            Route::get('clubes/{club}/resguardo', [$l, 'resguardo'])->middleware('throttle:20,1,club-carta');
            Route::post('clubes/{club}/firmados', [$l, 'subirFirmado'])->middleware('throttle:30,1,club-subidas');
            // E52 · F4 — QR y credencial (solo con el QR habilitado; 404 si no)
            $q = \App\Http\Controllers\Club\QrClubController::class;
            Route::get('clubes/{club}/qr', [$q, 'imagen'])->middleware('throttle:60,1,club-qr');
            Route::get('clubes/{club}/credencial', [$q, 'credencial'])->middleware('throttle:20,1,club-carta');
        });
        // ═══ E52 · F4 — QR (habilitar / revocar) y reportes: admin y admin de convocatoria con alcance. ═══
        Route::group(['prefix' => 'revision', 'middleware' => 'rol:admin,admin_convocatoria'], function () {
            $q = \App\Http\Controllers\Club\QrClubController::class;
            Route::post('qr/habilitar', [$q, 'habilitar'])->middleware('throttle:20,1,club-qr-admin');
            Route::post('clubes/{club}/qr/revocar', [$q, 'revocar'])->middleware('throttle:30,1,club-qr-admin');
            Route::get('convocatorias/{convocatoria}/reporte', [\App\Http\Controllers\Club\LogisticaAdminController::class, 'reporte'])
                ->middleware('throttle:10,1,club-reporte');
        });
        // ═══ E52 · F4 — ESCANEO EN EVENTOS (admin, admin de convocatoria, operador de evento; alcance en el controlador). ═══
        Route::group(['prefix' => 'escaneo', 'middleware' => 'rol:admin,admin_convocatoria,operador_evento'], function () {
            $e = \App\Http\Controllers\Club\EscaneoController::class;
            Route::get('eventos', [$e, 'eventos']);
            Route::post('qr', [$e, 'qr'])->middleware('throttle:120,1,escaneo-qr');
            Route::get('buscar', [$e, 'buscar'])->middleware('throttle:60,1,escaneo-buscar');
            Route::get('clubes/{club}', [$e, 'ficha'])->middleware('throttle:120,1,escaneo-ficha');
            Route::post('registrar', [$e, 'registrar'])->middleware('throttle:120,1,escaneo-registrar');
        });
        // ═══ E52 · F2 — REVISIÓN DE CLUBES (admin, admin de convocatoria, revisor; alcance revisado en el controlador). ═══
        Route::group(['prefix' => 'revision', 'middleware' => 'rol:admin,admin_convocatoria,revisor'], function () {
            $r = \App\Http\Controllers\Club\RevisionClubController::class;
            Route::get('clubes', [$r, 'index']);
            Route::get('clubes/{club}', [$r, 'show']);
            Route::post('clubes/{club}/resolver', [$r, 'resolver'])->middleware('throttle:60,1,club-revision');
            Route::post('clubes/{club}/integrantes/{integrante}/curp', [$r, 'revisarCurp'])->middleware('throttle:60,1,club-revision'); // E76
            Route::post('clubes/{club}/kit-perfil', [$r, 'kitPerfil'])->middleware('throttle:60,1,club-revision'); // E86
            Route::post('clubes/{club}/documentos/{clave}/revision', [$r, 'revisarDocumento'])->where('clave', '[a-z0-9_]+')->middleware('throttle:120,1,club-revision'); // E79
            Route::post('clubes/{club}/prorroga', [$r, 'prorroga'])->middleware('throttle:30,1,club-revision');
            Route::post('clubes/{club}/visto-bueno', [$r, 'vistoBueno'])->middleware('throttle:60,1,club-revision');
            Route::post('clubes/{club}/comite', [$r, 'comite'])->middleware('throttle:60,1,club-revision');
            Route::post('convocatorias/{convocatoria}/acta', [$r, 'subirActa'])->middleware('throttle:10,1,club-acta');
            // E52 · F3 — logística (admin y admin de convocatoria; el controlador lo exige)
            $g = \App\Http\Controllers\Club\LogisticaAdminController::class;
            Route::get('convocatorias/{convocatoria}/logistica', [$g, 'show']);
            Route::put('convocatorias/{convocatoria}/logistica', [$g, 'update'])->middleware('throttle:30,1,club-logistica-cfg');
            Route::post('firmados/{firmado}/revisar', [$g, 'revisarFirmado'])->middleware('throttle:60,1,club-revision');
            Route::post('kit/asignar', [$g, 'asignarKit'])->middleware('throttle:20,1,club-kit');
            Route::post('clubes/{club}/kit-entregado', [$g, 'entregarKit'])->middleware('throttle:60,1,club-kit');
        });
        // Acta del comité: la descargan también los de consulta con alcance.
        Route::get('revision/convocatorias/{convocatoria}/acta', [\App\Http\Controllers\Club\RevisionClubController::class, 'descargarActa'])
            ->middleware(['rol:admin,admin_convocatoria,revisor,consulta', 'throttle:30,1,club-acta-ver']);
        // Archivos de clubes: líder dueño o personal con alcance (404 a los demás).
        Route::get('media/club/{archivo}', [\App\Http\Controllers\Club\ClubArchivoController::class, 'media'])
            ->where('archivo', '[A-Za-z0-9]{40}\.webp')->middleware('throttle:600,1,club-media');
        Route::get('clubes/{club}/firmados/{firmado}', [\App\Http\Controllers\Club\ClubArchivoController::class, 'firmado'])
            ->whereNumber('firmado')->middleware('throttle:120,1,club-docs');
        Route::get('clubes/{club}/documentos/{clave}', [\App\Http\Controllers\Club\ClubArchivoController::class, 'documento'])
            ->where('clave', '[a-z0-9_]+')->middleware('throttle:120,1,club-docs');

        // ═══ PERFIL (E45): todos los roles. ═══
        // E52: mis roles (ver, cambiar de rol activo, pedir otro rol con aprobación de admin).
        Route::get('mis-roles', [\App\Http\Controllers\MisRolesController::class, 'index']);
        Route::post('mis-roles/solicitar', [\App\Http\Controllers\MisRolesController::class, 'solicitar'])->middleware('throttle:5,10,rol-solicitar');
        Route::post('mis-roles/cambiar', [\App\Http\Controllers\MisRolesController::class, 'cambiar'])->middleware('throttle:20,1,rol-cambiar');
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
