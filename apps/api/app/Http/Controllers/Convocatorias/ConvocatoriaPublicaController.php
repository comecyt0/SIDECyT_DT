<?php

namespace App\Http\Controllers\Convocatorias;

use App\Http\Controllers\Controller;
use App\Models\Convocatoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Convocatorias para la landing pública (/sigac), agrupadas por estado público. Sin autenticación.
 * GET /api/convocatorias/publicas (y /abiertas como alias de compatibilidad). E37 + E40.
 *
 * Seguridad:
 *  - Solo lectura (GET) y sin parámetros de entrada: no hay nada que inyectar ni filtrar desde fuera.
 *  - Lista blanca de campos armada a mano: nunca se serializa el modelo. Quedan fuera IDs, montos,
 *    porcentajes, fianzas, puntajes, motivo de prórroga y cualquier dato de solicitudes.
 *  - Nunca se publican borradores. Estado derivado de `estado` + fechas en zona de negocio (modelo).
 *  - `banner_url` solo sale si tiene la forma de un banner nuestro (/storage/banners/…) o un https de un
 *    dominio autorizado (config comecyt.banners.hosts = CSP img-src). Si no, null.
 *  - Límites: 12 abiertas, 12 próximas, 6 cerradas (cerradas en los últimos 180 días). Caché 5 min
 *    (->toArray(), regla 2) invalidada en los eventos del modelo. Throttle en la ruta.
 */
class ConvocatoriaPublicaController extends Controller
{
    private const CACHE_KEY = 'public:convocatorias-v2';

    private const CACHE_TTL = 300;

    private const MAX_DESC = 280;

    public function index(): JsonResponse
    {
        $data = Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
            $hoy = Convocatoria::hoy();
            $desdeCerradas = Carbon::parse($hoy)->subDays(180)->toDateString();

            $items = Convocatoria::query()
                ->with(['tipoPrograma:id,nombre,activo,banner_url'])
                ->whereIn('estado', ['activa', 'cerrada'])
                ->whereNull('deleted_at')
                ->whereNotNull('tipo_programa_id')
                ->whereHas('tipoPrograma', fn ($q) => $q->where('activo', true))
                ->whereRaw('COALESCE(fecha_prorroga, fecha_cierre) >= ?', [$desdeCerradas])
                ->orderByRaw('COALESCE(fecha_prorroga, fecha_cierre) asc')
                ->limit(60)
                ->get();

            $grupos = ['abiertas' => [], 'proximas' => [], 'cerradas' => []];
            foreach ($items as $c) {
                $estado = $c->estado_publico;
                $grupo = match ($estado) {
                    Convocatoria::PUBLICO_ABIERTA, Convocatoria::PUBLICO_PRORROGA => 'abiertas',
                    Convocatoria::PUBLICO_PROXIMA => 'proximas',
                    Convocatoria::PUBLICO_CERRADA => 'cerradas',
                    default => null,
                };
                if ($grupo) {
                    $grupos[$grupo][] = $this->present($c, $estado);
                }
            }

            // Próximas: la que abre antes, primero. Cerradas: la más reciente primero.
            usort($grupos['proximas'], fn ($a, $b) => strcmp($a['fecha_apertura'], $b['fecha_apertura']));
            $grupos['cerradas'] = array_reverse($grupos['cerradas']);

            return [
                'abiertas' => array_slice($grupos['abiertas'], 0, 12),
                'proximas' => array_slice($grupos['proximas'], 0, 12),
                'cerradas' => array_slice($grupos['cerradas'], 0, 6),
                'hoy' => $hoy,
            ];
        });

        return response()
            ->json($data)
            ->header('Cache-Control', 'public, max-age=120');
    }

    private function present(Convocatoria $c, string $estado): array
    {
        $limpia = fn (?string $s, int $max) => $s === null ? null
            : Str::limit(trim(preg_replace('/\s+/u', ' ', strip_tags($s))), $max, '…');

        return [
            'nombre' => $limpia($c->nombre, 200),
            'programa' => $c->tipoPrograma ? $limpia($c->tipoPrograma->nombre, 150) : null,
            'descripcion' => $c->descripcion ? $limpia($c->descripcion, self::MAX_DESC) : null,
            'ejercicio_fiscal' => (string) $c->ejercicio_fiscal,
            'estado' => $estado,
            'fecha_apertura' => substr((string) $c->fecha_apertura, 0, 10),
            'fecha_cierre' => substr((string) $c->fecha_cierre, 0, 10),
            'fecha_prorroga' => $c->fecha_prorroga ? substr((string) $c->fecha_prorroga, 0, 10) : null,
            'fecha_limite' => $c->fecha_cierre_efectiva,
            // Banner propio; si no tiene, el de su programa.
            'banner_url' => self::safeBanner($c->banner_url) ?? self::safeBanner($c->tipoPrograma?->banner_url),
        ];
    }

    /** Solo banners subidos por el panel o https de un dominio autorizado; cualquier otra cosa → null. */
    public static function safeBanner(?string $url): ?string
    {
        if (! $url) {
            return null;
        }
        if (preg_match('#^/storage/banners/(convocatorias|programas)/[a-z0-9]+\.(jpg|png|webp)$#', $url)) {
            return $url;
        }
        $p = parse_url($url);
        if ($p && strtolower($p['scheme'] ?? '') === 'https' && ! isset($p['user']) && ! isset($p['pass']) && ! isset($p['port'])
            && in_array(strtolower($p['host'] ?? ''), config('comecyt.banners.hosts', []), true)) {
            return $url;
        }

        return null;
    }

    /** Lo llaman los eventos saved/deleted de Convocatoria y los cambios de banner de programa. */
    public static function forgetCache(): void
    {
        Cache::forget(self::CACHE_KEY);
        Cache::forget('public:convocatorias-abiertas'); // clave de la versión anterior (E37)
    }
}
