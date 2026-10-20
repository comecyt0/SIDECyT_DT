<?php

namespace App\Http\Controllers;

use App\Models\Club;
use App\Models\Convocatoria;
use App\Models\FolioPublicado;
use App\Models\Solicitud;
use App\Support\Alcance;
use App\Support\Audit;
use App\Support\FoliosReporte;
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

    /** Filtros comunes de la lista y de las exportaciones. */
    private function filtros(Request $request): array
    {
        return $request->validate([
            'grupo' => ['nullable', 'in:aprobados,no_aprobados,en_proceso,todos'],
            'convocatoria_id' => ['nullable', 'integer'],
            'periodo_id' => ['nullable', 'integer'],
            'escuela_id' => ['nullable', 'integer'], // E84: desde Escuelas
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
    }

    /**
     * GET /admin/folios?grupo=aprobados|no_aprobados|en_proceso|todos&convocatoria_id=&periodo_id=&search=&page=
     * E80 (20/10/2026): solicitudes y clubes de Apoyo en especie (también en captura), paginados juntos.
     */
    public function index(Request $request)
    {
        $data = $this->filtros($request);
        $items = FoliosReporte::items($request->user(), $data, $data['grupo'] ?? 'todos');
        $porPagina = (int) ($data['per_page'] ?? 20);
        $paginaActual = max(1, (int) $request->input('page', 1));

        return response()->json([
            'folios' => new \Illuminate\Pagination\LengthAwarePaginator($items->forPage($paginaActual, $porPagina)->values(), $items->count(), $porPagina, $paginaActual),
            'conteos' => FoliosReporte::conteos($request->user(), $data),
        ]);
    }

    /** E81 — GET /admin/folios/{tipo}/{id}/ficha: vista previa con todos sus datos y etiquetas (404 fuera del alcance). */
    public function ficha(Request $request, string $tipo, int $id)
    {
        abort_unless(in_array($tipo, ['solicitud', 'club'], true), 404);
        $ficha = FoliosReporte::ficha($request->user(), $tipo, $id);
        abort_unless($ficha !== null, 404);

        return response()->json($ficha);
    }

    /**
     * E81 — GET /admin/folios/exportar?formato=pdf|xlsx&modo=completo|parcial|individual&ids[]=club-3&(filtros)
     * Completo: todo lo que muestran los filtros. Parcial: los folios marcados. Individual: un folio con su ficha completa.
     * Con la franja institucional; Excel con defensa contra fórmulas.
     */
    public function exportar(Request $request)
    {
        $data = $this->filtros($request);
        $v = $request->validate([
            'formato' => ['required', 'in:pdf,xlsx'],
            'modo' => ['required', 'in:completo,parcial,individual'],
            'ids' => ['required_unless:modo,completo', 'array', 'max:500'],
            'ids.*' => ['string', 'regex:/^(solicitud|club)-\d{1,10}$/'],
        ], ['ids.required_unless' => 'Marca al menos un folio.']);
        $u = $request->user();
        $fecha = now('America/Mexico_City');
        Audit::log('folios.exportados', null, ['formato' => $v['formato'], 'modo' => $v['modo'], 'total' => $v['modo'] === 'completo' ? null : count($v['ids'])]);

        if ($v['modo'] === 'individual') {
            [$tipo, $id] = explode('-', $v['ids'][0]);
            $ficha = FoliosReporte::ficha($u, $tipo, (int) $id);
            abort_unless($ficha !== null, 404);
            $nombre = 'folio-'.preg_replace('/[^A-Za-z0-9\-]/', '', (string) $ficha['folio']);
            if ($v['formato'] === 'pdf') {
                return \Barryvdh\DomPDF\Facade\Pdf::loadView('pdfs.folios.ficha', ['fichas' => [$ficha], 'fecha' => $fecha, 'franja' => \App\Support\FormatosClub::franja()])
                    ->setPaper('letter')->download($nombre.'.pdf');
            }

            return \Maatwebsite\Excel\Facades\Excel::download(new \App\Exports\FichaFolioExport($ficha, $fecha), $nombre.'.xlsx');
        }

        $items = FoliosReporte::items($u, $data, $data['grupo'] ?? 'todos', $v['modo'] === 'parcial' ? $v['ids'] : null);
        abort_if($items->isEmpty(), 422, 'No hay folios para exportar con esos filtros.');
        $nombre = 'folios-'.$v['modo'].'-'.$fecha->format('Y-m-d');
        $titulo = 'Folios · '.($v['modo'] === 'completo' ? 'reporte completo' : 'selección de '.$items->count());
        $filtrosTexto = collect([
            ($data['grupo'] ?? 'todos') !== 'todos' ? ['aprobados' => 'Aprobados', 'no_aprobados' => 'No aprobados', 'en_proceso' => 'En proceso'][$data['grupo']] : null,
            ! empty($data['convocatoria_id']) ? Convocatoria::find($data['convocatoria_id'])?->nombre : null,
            ! empty($data['periodo_id']) ? \App\Models\Periodo::find($data['periodo_id'])?->nombre : null,
            ! empty($data['search']) ? 'Búsqueda: «'.$data['search'].'»' : null,
        ])->filter()->implode(' · ');
        if ($v['formato'] === 'pdf') {
            return \Barryvdh\DomPDF\Facade\Pdf::loadView('pdfs.folios.lista', ['items' => $items, 'titulo' => $titulo, 'filtros' => $filtrosTexto, 'fecha' => $fecha, 'franja' => \App\Support\FormatosClub::franja()])
                ->setPaper('letter', 'landscape')->download($nombre.'.pdf');
        }
        $s = fn ($x) => \App\Exports\SolicitudesExport::celda($x === null ? '' : (string) $x);
        $filas = $items->map(fn ($x) => [
            $s($x['folio']), $x['tipo'] === 'club' ? 'Club' : 'Solicitud', $s($x['convocatoria']['nombre'] ?? ''), $s($x['convocatoria']['periodo']['nombre'] ?? ''),
            $s($x['user']['name'] ?? ''), $s($x['titulo_proyecto']), $s($x['empresa']['nombre'] ?? ''),
            $x['escuela_nueva'] === null ? '' : ($x['escuela_nueva'] ? 'Nueva escuela' : 'Ya participó'), $x['integrantes'] ?? '',
            $s($x['estado_texto']), $x['publicado_en_landing'] ? 'Sí' : 'No', $x['updated_at'] ? \Carbon\Carbon::parse($x['updated_at'])->setTimezone('America/Mexico_City')->format('d/m/Y H:i') : '',
        ])->all();

        return \Maatwebsite\Excel\Facades\Excel::download(new \App\Exports\ReporteInstitucional('Folios', $titulo, $filtrosTexto, $fecha,
            ['Folio', 'Tipo', 'Convocatoria', 'Periodo', 'Solicitante / líder', 'Proyecto / club', 'Empresa / escuela', 'Participación de la escuela', 'Integrantes', 'Estado', 'En la página pública', 'Última actualización'],
            $filas), $nombre.'.xlsx');
    }

    /** E80: estados de un club que cuentan como aprobado / no aprobado (el resto, en proceso, incluida la captura). */
    public const CLUB_APROBADOS = FoliosReporte::CLUB_APROBADOS;

    /** GET /admin/solicitudes/{solicitud}/historial — seguimiento (el middleware `alcance` ya validó el registro). */
    public function historial(Solicitud $solicitud)
    {
        return response()->json($solicitud->historial()->with('user:id,name,avatar_path,rol_id')->get());
    }

    /** GET /admin/convocatorias/{convocatoria}/folios-publicados — vista previa para confirmar. */
    public function publicacion(Convocatoria $convocatoria)
    {
        $aprobados = $this->aprobadosDe($convocatoria);
        $publicados = FolioPublicado::where('convocatoria_id', $convocatoria->id)->orderBy('folio')
            ->get(['solicitud_id', 'club_id', 'folio', 'publicado_at', 'publicado_por']);
        $yaPublicados = $publicados->map(fn ($p) => $p->club_id ? 'club-'.$p->club_id : 'solicitud-'.$p->solicitud_id)->all();

        return response()->json([
            'convocatoria' => $convocatoria->only(['id', 'nombre']),
            'aprobados' => $aprobados,
            'publicados' => $publicados,
            'pendientes_de_publicar' => $aprobados->reject(fn ($a) => in_array($a['tipo'].'-'.$a['id'], $yaPublicados, true))->values(),
            'publicado_at' => $publicados->max('publicado_at'),
        ]);
    }

    /** E80: folios aprobados de una convocatoria: solicitudes dictaminadas y clubes aceptados. */
    private function aprobadosDe(Convocatoria $convocatoria)
    {
        return $convocatoria->solicitudes()->whereIn('estado', Solicitud::ESTADOS_APROBADOS)->orderBy('folio')->get(['id', 'folio', 'estado'])->toBase()
            ->map(fn ($s) => ['tipo' => 'solicitud', 'id' => $s->id, 'folio' => $s->folio, 'estado' => $s->estado])
            ->merge(Club::where('convocatoria_id', $convocatoria->id)->whereIn('estado', self::CLUB_APROBADOS)->orderBy('folio')->get(['id', 'folio', 'estado'])->toBase()
                ->map(fn ($c) => ['tipo' => 'club', 'id' => $c->id, 'folio' => $c->folio, 'estado' => $c->estado]))
            ->values();
    }

    /** POST /admin/convocatorias/{convocatoria}/folios-publicados { confirmar: true } */
    public function publicar(Request $request, Convocatoria $convocatoria)
    {
        $request->validate(['confirmar' => ['required', 'accepted']], [
            'confirmar.*' => 'Confirma que revisaste la lista antes de publicar.',
        ]);

        $aprobados = $this->aprobadosDe($convocatoria);
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
                    'solicitud_id' => $s['tipo'] === 'solicitud' ? $s['id'] : null,
                    'club_id' => $s['tipo'] === 'club' ? $s['id'] : null,
                    'folio' => mb_substr((string) $s['folio'], 0, 60),
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
