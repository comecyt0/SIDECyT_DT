<?php

namespace App\Http\Controllers;

use App\Models\Convocatoria;
use App\Models\FolioPublicado;
use App\Models\Solicitud;
use App\Support\Alcance;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * E45 (punto 4) — Histórico, seguimiento y publicación de folios.
 *  - Aprobado = pasó el dictamen (Solicitud::ESTADOS_APROBADOS); no aprobado = rechazada/cancelada; el resto, en
 *    proceso (decisión del usuario: "por dictamen").
 *  - La landing muestra SOLO folios que un admin (o el admin de esa convocatoria) confirmó publicar: se guarda una
 *    instantánea en folios_publicados. Folios aprobados después requieren volver a publicar.
 */
class FolioController extends Controller
{
    private const CACHE_PUBLICO = 'public:folios-aprobados-v1';

    /** GET /admin/folios?grupo=aprobados|no_aprobados|en_proceso|todos&convocatoria_id=&periodo_id=&search=&page= */
    public function index(Request $request)
    {
        $data = $request->validate([
            'grupo' => ['nullable', 'in:aprobados,no_aprobados,en_proceso,todos'],
            'convocatoria_id' => ['nullable', 'integer'],
            'periodo_id' => ['nullable', 'integer'],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $q = Alcance::aplicar(Solicitud::query(), $request->user())
            ->with(['user', 'empresa:id,nombre', 'convocatoria:id,nombre,periodo_id,ejercicio_fiscal', 'convocatoria.periodo:id,nombre'])
            ->where('estado', '!=', 'borrador');

        match ($data['grupo'] ?? 'todos') {
            'aprobados' => $q->whereIn('estado', Solicitud::ESTADOS_APROBADOS),
            'no_aprobados' => $q->whereIn('estado', Solicitud::ESTADOS_NO_APROBADOS),
            'en_proceso' => $q->whereNotIn('estado', array_merge(Solicitud::ESTADOS_APROBADOS, Solicitud::ESTADOS_NO_APROBADOS)),
            default => null,
        };
        if (! empty($data['convocatoria_id'])) {
            $q->where('convocatoria_id', (int) $data['convocatoria_id']);
        }
        if (! empty($data['periodo_id'])) {
            $q->whereHas('convocatoria', fn ($c) => $c->where('periodo_id', (int) $data['periodo_id']));
        }
        if (! empty($data['search'])) {
            $like = '%'.addcslashes($data['search'], '%_\\').'%';
            $q->where(fn ($w) => $w->where('folio', 'ilike', $like)->orWhere('titulo_proyecto', 'ilike', $like));
        }

        // Conteos por grupo (mismo alcance y filtros de convocatoria/periodo), para las pestañas.
        $base = Alcance::aplicar(Solicitud::query(), $request->user())->where('estado', '!=', 'borrador');
        if (! empty($data['convocatoria_id'])) {
            $base->where('convocatoria_id', (int) $data['convocatoria_id']);
        }
        if (! empty($data['periodo_id'])) {
            $base->whereHas('convocatoria', fn ($c) => $c->where('periodo_id', (int) $data['periodo_id']));
        }
        $porEstado = (clone $base)->select('estado', DB::raw('count(*) as total'))->groupBy('estado')->pluck('total', 'estado');
        $suma = fn (array $estados) => (int) collect($estados)->sum(fn ($e) => (int) ($porEstado[$e] ?? 0));
        $aprob = $suma(Solicitud::ESTADOS_APROBADOS);
        $noAprob = $suma(Solicitud::ESTADOS_NO_APROBADOS);

        $pagina = $q->orderByDesc('updated_at')->paginate((int) ($data['per_page'] ?? 20));
        $publicados = FolioPublicado::whereIn('solicitud_id', collect($pagina->items())->pluck('id'))->pluck('solicitud_id')->all();
        $pagina->getCollection()->transform(function ($s) use ($publicados) {
            $s->setAttribute('publicado_en_landing', in_array($s->id, $publicados, true));

            return $s;
        });

        return response()->json([
            'folios' => $pagina,
            'conteos' => [
                'aprobados' => $aprob,
                'no_aprobados' => $noAprob,
                'en_proceso' => (int) $porEstado->sum() - $aprob - $noAprob,
                'todos' => (int) $porEstado->sum(),
            ],
        ]);
    }

    /** GET /admin/solicitudes/{solicitud}/historial — seguimiento (el middleware `alcance` ya validó el registro). */
    public function historial(Solicitud $solicitud)
    {
        return response()->json($solicitud->historial()->with('user:id,name,avatar_path,rol_id')->get());
    }

    /** GET /admin/convocatorias/{convocatoria}/folios-publicados — vista previa para confirmar. */
    public function publicacion(Convocatoria $convocatoria)
    {
        $aprobados = $convocatoria->solicitudes()->whereIn('estado', Solicitud::ESTADOS_APROBADOS)
            ->orderBy('folio')->get(['id', 'folio', 'estado']);
        $publicados = FolioPublicado::where('convocatoria_id', $convocatoria->id)->orderBy('folio')
            ->get(['solicitud_id', 'folio', 'publicado_at', 'publicado_por']);

        return response()->json([
            'convocatoria' => $convocatoria->only(['id', 'nombre']),
            'aprobados' => $aprobados,
            'publicados' => $publicados,
            'pendientes_de_publicar' => $aprobados->whereNotIn('id', $publicados->pluck('solicitud_id'))->values(),
            'publicado_at' => $publicados->max('publicado_at'),
        ]);
    }

    /** POST /admin/convocatorias/{convocatoria}/folios-publicados { confirmar: true } */
    public function publicar(Request $request, Convocatoria $convocatoria)
    {
        $request->validate(['confirmar' => ['required', 'accepted']], [
            'confirmar.*' => 'Confirma que revisaste la lista antes de publicar.',
        ]);

        $aprobados = $convocatoria->solicitudes()->whereIn('estado', Solicitud::ESTADOS_APROBADOS)->get(['id', 'folio']);
        if ($aprobados->isEmpty()) {
            return response()->json(['message' => 'Esta convocatoria no tiene folios aprobados.'], 422);
        }

        DB::transaction(function () use ($convocatoria, $aprobados, $request) {
            // Instantánea: se reemplaza por completo con lo aprobado HOY (quita los que dejaron de estarlo).
            FolioPublicado::where('convocatoria_id', $convocatoria->id)->delete();
            $ahora = now();
            foreach ($aprobados as $s) {
                FolioPublicado::create([
                    'convocatoria_id' => $convocatoria->id,
                    'solicitud_id' => $s->id,
                    'folio' => mb_substr((string) $s->folio, 0, 60),
                    'publicado_por' => $request->user()->id,
                    'publicado_at' => $ahora,
                ]);
            }
        });
        Cache::forget(self::CACHE_PUBLICO);
        Audit::log('folios.publicados', $convocatoria, ['total' => $aprobados->count()]);

        return response()->json(['message' => "Se publicaron {$aprobados->count()} folios aprobados en la página pública."]);
    }

    /** DELETE /admin/convocatorias/{convocatoria}/folios-publicados */
    public function despublicar(Convocatoria $convocatoria)
    {
        $total = FolioPublicado::where('convocatoria_id', $convocatoria->id)->delete();
        Cache::forget(self::CACHE_PUBLICO);
        Audit::log('folios.despublicados', $convocatoria, ['total' => $total]);

        return response()->json(['message' => 'Se retiraron los folios de la página pública.']);
    }

    /**
     * GET /api/folios-aprobados — PÚBLICO (landing). Lista blanca: nombre de convocatoria, ejercicio y folios.
     * Nada de empresas, proyectos, montos ni ids. Caché de 5 min, throttle 30/min en la ruta.
     */
    public function publicos()
    {
        $data = Cache::remember(self::CACHE_PUBLICO, 300, function () {
            return FolioPublicado::query()
                ->join('convocatorias', 'convocatorias.id', '=', 'folios_publicados.convocatoria_id')
                ->whereNull('convocatorias.deleted_at')
                ->orderByDesc('convocatorias.id')
                ->orderBy('folios_publicados.folio')
                ->get(['convocatorias.id as cid', 'convocatorias.nombre', 'convocatorias.ejercicio_fiscal', 'folios_publicados.folio', 'folios_publicados.publicado_at'])
                ->groupBy('cid')
                ->map(fn ($filas) => [
                    'convocatoria' => strip_tags((string) $filas->first()->nombre),
                    'ejercicio_fiscal' => (string) $filas->first()->ejercicio_fiscal,
                    'publicado' => optional($filas->max('publicado_at'))->toDateString() ?? substr((string) $filas->max('publicado_at'), 0, 10),
                    'folios' => $filas->pluck('folio')->map(fn ($f) => (string) $f)->values()->all(),
                ])
                ->values()
                ->all();
        });

        return response()->json(['grupos' => $data])
            ->header('Cache-Control', 'public, max-age=120');
    }
}
