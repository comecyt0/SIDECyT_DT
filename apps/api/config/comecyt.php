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

    'security' => [
        // Rate limiting
        'auth_login_rate_limit' => env('AUTH_LOGIN_RATE_LIMIT', 5),
        'auth_login_rate_window' => env('AUTH_LOGIN_RATE_WINDOW', 60),

        // JWT
        'jwt_ttl_minutes' => env('JWT_TTL', 1440),
        'jwt_algo' => env('JWT_ALGO', 'HS256'),
    ],

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ⏱️ TIMEOUTS Y TIEMPOS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    'timeouts' => [
        'cache_ttl_minutes' => 60,               // Minutos para cachear catálogos
        'session_timeout_minutes' => 120,        // Timeout de sesión (2 horas)
        'file_upload_timeout_seconds' => 300,    // Timeout para subir archivos (5 min)
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
    // 🌐 ESTADOS Y ENUM VALORES
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
    ],
];
