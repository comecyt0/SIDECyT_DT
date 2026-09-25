<?php

namespace App\Http\Controllers;

use App\Models\ContenidoSitio;
use App\Models\ProgramaPublico;
use Illuminate\Support\Facades\Cache;

/**
 * E49 (25/09/2026) — Contenido público de una landing de SIDECyT: GET /api/sitio/{sigae|sicei}.
 * Sin autenticación: solo lectura, lista blanca de campos armada a mano, solo programas activos, caché 5 min
 * (se invalida al guardar en el panel), throttle en la ruta.
 */
class SitioPublicoController extends Controller
{
    public function show(string $sistema)
    {
        abort_unless(in_array($sistema, ProgramaPublico::SISTEMAS, true), 404);

        $datos = Cache::remember('public:sitio:'.$sistema, 300, function () use ($sistema) {
            $programas = ProgramaPublico::where('sistema', $sistema)->where('activo', true)
                ->orderBy('orden')->orderBy('id')->limit(40)->get()
                ->map(fn (ProgramaPublico $p) => [
                    'nombre' => $p->nombre,
                    'dirigido_a' => $p->dirigido_a,
                    'resumen' => $p->resumen,
                    'correo' => $p->correo,
                    'telefono' => $p->telefono,
                    'url_info' => $p->url_info,
                    'icono' => $p->icono,
                    'tono' => $p->tono,
                ])->values()->all();

            return [
                'programas' => $programas,
                'sectores' => $sistema === 'sigae' ? ContenidoSitio::valor('sigae.sectores') : [],
                'documentos' => $sistema === 'sigae' ? ContenidoSitio::valor('sigae.documentos') : [],
                'documentos_notas' => $sistema === 'sigae' ? ContenidoSitio::valor('sigae.documentos_notas') : [],
            ];
        });

        return response()->json($datos)->header('Cache-Control', 'public, max-age=120');
    }
}
