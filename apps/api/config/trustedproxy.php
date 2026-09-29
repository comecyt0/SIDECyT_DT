<?php

/*
 * Proxies de confianza para X-Forwarded-* (E22). Laravel lo lee en cada petición
 * (Illuminate\Http\Middleware\TrustProxies usa config('trustedproxy.proxies') cuando no se fijan en bootstrap).
 * 30/09/2026: antes se pasaba env('TRUSTED_PROXIES') en bootstrap/app.php, que se evalúa antes de cargar la
 * configuración: con `config:cache` habría quedado en 127.0.0.1 y se perdería la IP real de quien llega por el
 * balanceador (todos los límites por IP contarían al balanceador como un solo cliente).
 * Nunca '*': solo rangos conocidos (loopback, el ELB 100.64.0.0/10 y el propio servidor para serverFetch).
 */
return [
    'proxies' => env('TRUSTED_PROXIES', '127.0.0.1'),
];
