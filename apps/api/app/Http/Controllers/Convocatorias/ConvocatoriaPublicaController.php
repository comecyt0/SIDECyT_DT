<?php

namespace App\Http\Controllers\Convocatorias;

use App\Http\Controllers\Controller;
use App\Models\Convocatoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Convocatorias abiertas para la landing pública (/sigac). Sin autenticación.
 *
 * Seguridad (E37 en CLAUDE.md):
 *  - Solo lectura (GET) y sin parámetros de entrada: no hay nada que inyectar ni filtrar desde fuera.
 *  - Lista blanca de campos armada a mano: nunca se serializa el modelo completo, así que un campo nuevo
 *    en `convocatorias` o `tipo_programas` no puede filtrarse a Internet por accidente. Quedan fuera
 *    IDs internos, montos, porcentajes, fianzas, puntajes y cualquier dato de solicitudes.
 *  - Doble filtro de vigencia: `estado = 'activa'` **y** fechas vigentes hoy. Si el scheduler de cierre
 *    (convocatorias:close-expired) se atrasara, una convocatoria vencida no se anuncia igual.
 *  - Misma regla de visibilidad que ve el solicitante: requiere `tipo_programa_id` y programa activo.
 *  - `deleted_at` se filtra explícito (el modelo no usa el trait SoftDeletes aunque la columna existe).
 *  - Descripción sin HTML y recortada; el front además la pinta como texto (React escapa).
 *  - Máximo 12 resultados, caché de 5 minutos (con ->toArray(), regla 2) y throttle en la ruta.
 */
class ConvocatoriaPublicaController extends Controller
{
    private const CACHE_KEY = 'public:convocatorias-abiertas';

    private const CACHE_TTL = 300;

    private const MAX_ITEMS = 12;

    private const MAX_DESC = 280;

    public function index(): JsonResponse
    {
        $items = Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
            $hoy = now()->toDateString();

            return Convocatoria::query()
                ->with(['tipoPrograma:id,nombre,activo'])
                ->where('estado', 'activa')
                ->whereNull('deleted_at')
                ->whereNotNull('tipo_programa_id')
                ->whereDate('fecha_apertura', '<=', $hoy)
                ->whereDate('fecha_cierre', '>=', $hoy)
                ->whereHas('tipoPrograma', fn ($q) => $q->where('activo', true))
                ->orderBy('fecha_cierre')
                ->limit(self::MAX_ITEMS)
                ->get(['id', 'nombre', 'descripcion', 'ejercicio_fiscal', 'fecha_apertura', 'fecha_cierre', 'tipo_programa_id'])
                ->map(fn (Convocatoria $c) => [
                    'nombre' => Str::limit(trim(strip_tags((string) $c->nombre)), 200, '…'),
                    'programa' => $c->tipoPrograma ? Str::limit(strip_tags((string) $c->tipoPrograma->nombre), 150, '…') : null,
                    'descripcion' => $c->descripcion
                        ? Str::limit(trim(preg_replace('/\s+/u', ' ', strip_tags((string) $c->descripcion))), self::MAX_DESC, '…')
                        : null,
                    'ejercicio_fiscal' => (string) $c->ejercicio_fiscal,
                    'fecha_apertura' => substr((string) $c->fecha_apertura, 0, 10),
                    'fecha_cierre' => substr((string) $c->fecha_cierre, 0, 10),
                ])
                ->values()
                ->toArray();
        });

        return response()
            ->json(['data' => $items, 'total' => count($items)])
            ->header('Cache-Control', 'public, max-age=120');
    }

    /** Lo llaman los eventos saved/deleted del modelo Convocatoria, para que la landing no espere 5 min. */
    public static function forgetCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
