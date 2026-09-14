<?php

use Illuminate\Support\Facades\Route;

// Esta es una API. La ruta `/` no sirve frontend — el Next.js corre en otro
// dominio (o sub-path detrás de Nginx). Cualquier visita aquí recibe metadata
// mínima, sin cargar recursos externos.
Route::get('/', function () {
    return response()->json([
        'service' => config('app.name'),
        'status' => 'ok',
        'docs' => '/api',
    ]);
});
