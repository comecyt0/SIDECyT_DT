<?php

/**
 * COMECYT System Configuration
 *
 * Centralized configuration for validation rules, limits, and constants
 * This prevents hardcoded magic numbers scattered throughout the codebase
 *
 * Last Updated: 2026-04-06
 */

return [
    // E79 (20/10/2026): titular del COMECYT al que se dirige el Formato A (carta de interés). Si cambia, se ajusta en .env.
    'director_general' => env('COMECYT_DIRECTOR_GENERAL', 'Dr. Víctor Daniel Ávila Akerberg'),

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 💰 MONTOS Y LÍMITES FINANCIEROS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    'montos' => [
        'monto_minimo_solicitud' => 1,           // Monto mínimo que puede solicitar
        'monto_maximo_solicitud' => 60000,       // Monto máximo por solicitud
        'porcentaje_aportacion_minima' => 0,     // % mínimo de aportación de institución
        'porcentaje_aportacion_maxima' => 100,   // % máximo de aportación
    ],

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📋 CAMPOS DE TEXTO Y VALIDACIÓN
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    'validation' => [
        // Títulos y nombres
        'titulo_proyecto_max_chars' => 255,
        'nombre_campo_max_chars' => 150,
        'nombre_documento_max_chars' => 255,
        'nombre_rubro_max_chars' => 200,
        'nombre_criterio_max_chars' => 255,

        // Descripciones
        'descripcion_solicitud_max_chars' => 2000,
        'descripcion_rubro_max_chars' => 500,
        'descripcion_criterio_max_chars' => 1000,
        'descripcion_documento_max_chars' => 500,
        'observaciones_max_chars' => 2000,
        'resultados_obtenidos_max_chars' => 2000,

        // Archivos
        'file_upload_max_mb' => 10,
        'file_upload_max_bytes' => 10 * 1024 * 1024,
        'documento_adjunto_max_mb' => 10,
        'documento_adjunto_max_bytes' => 10 * 1024 * 1024,
        'informe_final_max_mb' => 10,
        'informe_final_max_bytes' => 10 * 1024 * 1024,

        // Configuración de programas
        'clave_programa_max_chars' => 20,
        'clave_documento_max_chars' => 100,
        'clave_rubro_max_chars' => 100,
    ],

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📊 EVALUACIÓN Y PUNTUACIÓN
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    'evaluation' => [
        'puntaje_minimo_aprobatorio' => 80,      // Puntaje mínimo para aprobar (sobre 100)
        'puntaje_maximo_total' => 100,           // Puntaje máximo posible
        'puntaje_maximo_por_criterio' => 25,     // Default puntaje máximo por criterio
        'num_criterios_default' => 4,            // Número de criterios default si no hay BD

        // Criterios dinámicos (cuando hay en BD)
        'ponderacion_minima' => 0,
        'ponderacion_maxima' => 100,
        'ponderacion_total_requerida' => 100,    // Suma de todas las ponderaciones debe ser 100%
    ],

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 👥 EQUIPO Y PARTICIPANTES
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    'equipo' => [
        'min_miembros_equipo' => 1,
        'max_miembros_equipo' => 50,
        'edad_minima_miembro' => 18,
        'edad_maxima_miembro' => 100,
        'nombre_miembro_max_chars' => 255,
    ],

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔐 SEGURIDAD
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // 30/09/2026: todas las variables de entorno que usa el código se leen AQUÍ (regla E46: nunca env() fuera de
    // config/, porque con `config:cache` devuelve null). Los valores por defecto son los que tenía el código.
    'security' => [
        // Login: por IP y bloqueo por cuenta (AuthLoginRateLimitMiddleware)
        'auth_login_rate_limit' => (int) env('AUTH_LOGIN_RATE_LIMIT', 5),
        'auth_login_rate_window' => (int) env('AUTH_LOGIN_RATE_WINDOW', 60),
        'auth_account_lockout' => (int) env('AUTH_ACCOUNT_LOCKOUT', 10),
        'auth_lockout_minutes' => (int) env('AUTH_LOCKOUT_MINUTES', 15),
        'auth_account_lockout_global' => (int) env('AUTH_ACCOUNT_LOCKOUT_GLOBAL', 50),

        // Límite global de la API (RateLimitMiddleware), vigilancia de IPs (ApiGateway) y circuito (CircuitBreaker)
        'rate_limit_max' => (int) env('RATE_LIMIT_MAX', 300),
        'rate_limit_window' => (int) env('RATE_LIMIT_WINDOW', 60),
        'api_gateway_max_ips' => (int) env('API_GATEWAY_MAX_IPS', 1000),
        'circuit_breaker_threshold' => (int) env('CIRCUIT_BREAKER_THRESHOLD', 5),
        'circuit_breaker_timeout' => (int) env('CIRCUIT_BREAKER_TIMEOUT', 30),

        // Token del endpoint de salud (vacío = deshabilitado)
        'health_token' => (string) env('HEALTH_TOKEN', ''),

        // JWT
        'jwt_ttl_minutes' => env('JWT_TTL', 1440),
        'jwt_algo' => env('JWT_ALGO', 'HS256'),
    ],

    // Cookie de sesión comecyt_auth. `secure` null = solo en producción (AuthController decide).
    'cookie' => [
        'domain' => env('COOKIE_DOMAIN') ?: null,
        'secure' => env('COOKIE_SECURE'),
        'same_site' => (string) env('COOKIE_SAME_SITE', 'Strict'),
    ],

    // Notificaciones push (Web Push / VAPID)
    'push' => [
        'vapid_public_key' => env('VAPID_PUBLIC_KEY'),
        'vapid_private_key' => env('VAPID_PRIVATE_KEY'),
        'vapid_subject' => env('VAPID_SUBJECT', 'mailto:noreply@comecyt.gob.mx'),
    ],

    // Sello de tiempo (NOM-151) para la firma de documentos; sin URL no se sella
    'tsa' => [
        'url' => env('TSA_URL'),
        'hash_algorithm' => env('TSA_HASH_ALGORITHM', 'sha256'),
        'username' => env('TSA_USERNAME'),
        'password' => env('TSA_PASSWORD'),
    ],

    // Inicio de sesión institucional (OIDC); apagado salvo que todo esté configurado
    'oidc' => [
        'enabled' => filter_var(env('OIDC_ENABLED', false), FILTER_VALIDATE_BOOLEAN),
        'issuer' => env('OIDC_ISSUER'),
        'client_id' => env('OIDC_CLIENT_ID'),
        'client_secret' => env('OIDC_CLIENT_SECRET'),
        'redirect_uri' => env('OIDC_REDIRECT_URI'),
        'scopes' => env('OIDC_SCOPES', 'openid profile email'),
        'default_role_slug' => env('OIDC_DEFAULT_ROLE_SLUG', 'solicitante'),
    ],

    'institucion_nombre' => env('NEXT_PUBLIC_INSTITUTION_NAME', 'COMECYT'),

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ⏱️ TIMEOUTS Y TIEMPOS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    'timeouts' => [
        'cache_ttl_minutes' => 60,               // Minutos para cachear catálogos
        'session_timeout_minutes' => 120,        // Timeout de sesión (2 horas)
        'file_upload_timeout_seconds' => 300,    // Timeout para subir archivos (5 min)
    ],

    // Respaldo manual (`php artisan comecyt:backup-db`). El respaldo nocturno lo hace la tarea de Windows
    // COMECYT-Backup-Diario (backup.ps1). En Windows pg_dump no está en el PATH: se usa la instalación de C:\pgsql.
    'backup' => [
        'pg_dump' => env('PG_DUMP_PATH') ?: (PHP_OS_FAMILY === 'Windows' && is_file('C:\\pgsql\\bin\\pg_dump.exe') ? 'C:\\pgsql\\bin\\pg_dump.exe' : 'pg_dump'),
    ],

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📧 NOTIFICACIONES
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    'notifications' => [
        'enabled' => env('NOTIFICATIONS_ENABLED', false),
        'email_from' => env('MAIL_FROM_ADDRESS', 'noreply@comecyt.gob.mx'),
        'email_from_name' => env('MAIL_FROM_NAME', 'COMECYT'),
    ],

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🖼  BANNERS DE CONVOCATORIAS Y PROGRAMAS (E40, 24/09/2026)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // Zona horaria de NEGOCIO para fechas de apertura/cierre/prórroga (E40). La app corre en UTC
    // (config/app.php); sin esto, a partir de las 18:00 de Toluca el sistema ya "vive" en el día siguiente
    // y cerraría las convocatorias 6 horas antes. No se cambia app.timezone para no mover timestamps guardados.
    'timezone_negocio' => env('COMECYT_TIMEZONE_NEGOCIO', 'America/Mexico_City'),

    'banners' => [
        // Dominios desde los que se acepta un banner por URL. SOLO https y SOLO estos: deben coincidir con
        // IMG_ORIGINS de apps/web/next.config.ts (CSP img-src). Nunca comodines (*.dominio), hallazgo 7 del
        // pentest de agosto. Para cualquier otra imagen: subirla desde el panel.
        'hosts' => [
            'comecyt.edomex.gob.mx',
            'images.comecyt.gob.mx',
            'comecyt-sistemas.edomex.gob.mx',
            'sidecyt-comecyt.edomex.gob.mx',
        ],
        'max_kb' => 5120,
        'min_width' => 600,
        'min_height' => 200,
        'max_side' => 6000,
    ],

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🌐 ESTADOS Y ENUM VALORES
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // E72: canal interno con SICEI (2FA único). Secreto de al menos 32 caracteres, el mismo en el .env de SICEI
    // (SIGAE_INTERNO_SECRETO); IPs de la conexión TCP permitidas: loopback y la IP propia del servidor.
    'interno_sicei' => [
        'secreto' => env('SICEI_INTERNO_SECRETO'),
        'ips' => array_values(array_filter(array_map('trim', explode(',', (string) env('SICEI_INTERNO_IPS', '127.0.0.1,::1,10.250.36.241'))))),
    ],

    'estados' => [
        'solicitud' => ['borrador', 'enviada', 'observada', 'en_evaluacion', 'aprobada', 'rechazada', 'convenio', 'ministracion', 'seguimiento', 'cerrada', 'cancelada'],
        'convocatoria' => ['borrador', 'activa', 'cerrada'],
        'informe' => ['pendiente', 'entregado', 'observado', 'aprobado'],
        'ministracion' => ['pendiente', 'revision', 'autorizada', 'pagada', 'rechazada'],
    ],

    'roles' => [
        'admin' => 1,
        'revisor' => 2,
        'evaluador' => 3,
        'solicitante' => 4,
        // E45 (24/09/2026): opera solo sus convocatorias asignadas / solo lectura por periodos.
        'admin_convocatoria' => 5,
        'consulta' => 6,
        // E52 (29/09/2026): líder de un club escolar (Apoyo en especie).
        'lider_club' => 7,
        // E52 · F4: escanea el QR de los clubes en los eventos de sus convocatorias asignadas.
        'operador_evento' => 8,
        // E61 (02/10/2026): líder B o director de un club; el líder le da el acceso (no es autoservicio).
        'acompanante_club' => 9,
    ],

    /*
    | E52 · Registro general (docs/APOYO_EN_ESPECIE.md §10). Roles que una persona puede pedir por su cuenta desde el
    | registro o desde "Mis roles". Los demás (admin, revisor, admin de convocatoria, consulta) solo los otorga un admin.
    */
    'registro' => [
        'roles_autoservicio' => ['solicitante', 'lider_club', 'evaluador'],
        'grados_academicos' => ['licenciatura', 'especialidad', 'maestria', 'doctorado', 'posdoctorado'],
        'cv_max_mb' => 5,
        // Solo códigos postales del Estado de México (decisión del usuario, 29/09/2026).
        'estado_cp' => 'México',
    ],
];
