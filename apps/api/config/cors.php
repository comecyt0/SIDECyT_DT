<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie', 'broadcasting/auth'],

    'allowed_methods' => ['*'],

    // SEV-2 — En producción NUNCA se incluyen orígenes locales. Sólo la lista CSV
    // declarada en CORS_ALLOWED_ORIGINS. Si la variable está vacía o contiene '*' /
    // 'localhost' en producción, el DeployCheck command falla antes de iniciar el servicio.
    //
    // En 'local'/'testing' se permiten los orígenes de desarrollo por defecto.
    'allowed_origins' => (function () {
        $env = env('APP_ENV', 'production');
        $csv = array_values(array_filter(array_map('trim', explode(',', (string) env('CORS_ALLOWED_ORIGINS', '')))));

        if (in_array($env, ['local', 'testing'], true)) {
            return array_values(array_unique(array_merge(
                ['http://localhost:3000', 'http://127.0.0.1:3000'],
                $csv
            )));
        }

        // Producción: lista estricta, sin defaults locales.
        return $csv;
    })(),

    // Patterns sólo en dev: puertos arbitrarios de localhost. En producción → [].
    'allowed_origins_patterns' => in_array(env('APP_ENV', 'production'), ['local', 'testing'], true)
        ? ['#^http://(localhost|127\.0\.0\.1)(:\d+)?$#']
        : [],

    'allowed_headers' => ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],

    'exposed_headers' => [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'Retry-After',
    ],

    'max_age' => 0,

    'supports_credentials' => true,

];
