<?php

namespace App\Http\Controllers;

use App\Models\ContenidoSitio;
use App\Models\Convocatoria;
use Illuminate\Support\Str;
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
                ->with(['convocatorias' => fn ($q) => $q->whereIn('estado', ['activa', 'cerrada'])->whereNotNull('tipo_programa_id')
                    ->select('id', 'programa_publico_id', 'nombre', 'estado', 'fecha_apertura', 'fecha_cierre', 'fecha_prorroga')])
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
                    'convocatorias' => self::convocatoriasVigentes($p),
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

    /**
     * E54 — Convocatorias del programa que se anuncian en su tarjeta: abiertas, con prórroga o próximas (las cerradas no).
     * Lista blanca: nombre, estado público y fechas; nunca ids, montos ni datos internos. Máximo 3.
     */
    private static function convocatoriasVigentes(ProgramaPublico $p): array
    {
        $orden = [Convocatoria::PUBLICO_ABIERTA => 0, Convocatoria::PUBLICO_PRORROGA => 0, Convocatoria::PUBLICO_PROXIMA => 1];

        return $p->convocatorias
            ->map(fn (Convocatoria $c) => ['c' => $c, 'estado' => $c->estado_publico])
            ->filter(fn ($x) => isset($orden[$x['estado']]))
            ->sortBy(fn ($x) => [$orden[$x['estado']], $x['c']->fecha_cierre_efectiva])
            ->take(3)
            ->map(fn ($x) => [
                'nombre' => Str::limit(trim(strip_tags((string) $x['c']->nombre)), 200, '…'),
                'estado' => $x['estado'],
                'fecha_apertura' => substr((string) $x['c']->fecha_apertura, 0, 10),
                'fecha_limite' => $x['c']->fecha_cierre_efectiva,
            ])->values()->all();
    }
}
