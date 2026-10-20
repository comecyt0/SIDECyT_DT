<?php

namespace App\Http\Controllers;

use App\Models\AsignacionEvaluador;
use App\Models\Convocatoria;
use App\Models\Empresa;
use App\Models\Informe;
use App\Models\Ministracion;
use App\Models\Solicitud;
use App\Models\User;
use App\Support\Alcance;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Dashboards de todos los roles. E45 (24/09/2026): TODAS las cifras pasan por App\Support\Alcance — el admin de
 * convocatoria, la consulta y los revisores/evaluadores con periodos ven solo lo de sus convocatorias.
 */
class DashboardController extends Controller
{
    private function user(): User
    {
        return request()->user();
    }

    private function solicitudes()
    {
        return Alcance::aplicar(Solicitud::query(), $this->user());
    }

    /**
     * Estadísticas para el Administrador (y admin de convocatoria / consulta, con alcance).
     */
    public function adminStats()
    {
        $u = $this->user();
        $minis = Alcance::aplicarPorSolicitud(Ministracion::query(), $u);

        $stats = [
            [
                'title' => 'Convocatorias Activas',
                'value' => (string) Alcance::aplicar(Convocatoria::where('estado', 'activa')->whereNull('deleted_at'), $u, 'id')->count(),
                'icon' => 'Bookmark',
                'color' => 'text-blue-500',
            ],
            [
                'title' => 'Solicitudes en Revisión',
                'value' => (string) $this->solicitudes()->whereIn('estado', ['enviada', 'observada'])->count(),
                'icon' => 'FileText',
                'color' => 'text-amber-500',
            ],
            [
                'title' => 'Proyectos Evaluándose',
                'value' => (string) $this->solicitudes()->where('estado', 'en_evaluacion')->count(),
                'icon' => 'Users',
                'color' => 'text-accent',
            ],
            [
                'title' => 'Dictámenes Aprobados',
                'value' => (string) $this->solicitudes()->where('estado', 'aprobada')->count(),
                'icon' => 'CheckCircle2',
                'color' => 'text-green-600',
            ],
            [
                'title' => 'Ministraciones Pendientes',
                'value' => (string) (clone $minis)->where('estado', 'pendiente')->count(),
                'icon' => 'Clock',
                'color' => 'text-orange-500',
            ],
            [
                'title' => 'Informes Entregados',
                'value' => (string) $this->solicitudes()->where('estado_informe', 'entregado')->count(),
                'icon' => 'FileText',
                'color' => 'text-blue-600',
            ],
            [
                'title' => 'Pagos Completados',
                'value' => (string) (clone $minis)->where('estado', 'pagada')->count(),
                'icon' => 'CheckCircle2',
                'color' => 'text-emerald-600',
            ],
        ];

        return response()->json($stats);
    }

    /**
     * Estadísticas para el Revisor (con alcance por periodo, E45).
     */
    public function revisorStats()
    {
        return response()->json([
            'nuevos' => $this->solicitudes()->where('estado', 'enviada')->count(),
            'en_subsanacion' => $this->solicitudes()->where('estado', 'observada')->count(),
            'pendientes_urgentes' => $this->solicitudes()->where('estado', 'observada')
                ->where('updated_at', '<', now()->subDays(7))->count(),
        ]);
    }

    /**
     * Estadísticas para el Evaluador (sus asignaciones, con alcance por periodo, E45).
     */
    public function evaluadorStats(Request $request)
    {
        $user = $request->user();
        $base = fn () => Alcance::aplicarPorSolicitud(AsignacionEvaluador::where('evaluador_id', $user->id), $user);

        return response()->json([
            'por_iniciar' => $base()->where('estado', 'asignado')->count(),
            'en_progreso' => $base()->where('estado', 'evaluando')->count(),
            'evaluadas' => $base()->where('estado', 'concluido')->count(),
        ]);
    }

    /**
     * Actividad Reciente para Admin (solo admin general: ruta con middleware `admin`).
     */
    public function adminActivity()
    {
        $activity = Solicitud::select(
            DB::raw("to_char(created_at, 'Mon') as label"),
            DB::raw('count(*) as value')
        )
            ->groupBy('label')
            ->orderBy(DB::raw('min(created_at)'))
            ->get();

        return response()->json($activity);
    }

    /**
     * Helper para expresión de mes en el motor activo (YYYY-MM).
     */
    private function monthExpr(string $column): string
    {
        return match (DB::connection()->getDriverName()) {
            'pgsql' => "to_char({$column}, 'YYYY-MM')",
            'sqlite' => "strftime('%Y-%m', {$column})",
            default => "DATE_FORMAT({$column}, '%Y-%m')",
        };
    }

    /**
     * Helper que llena 12 meses contiguos con ceros en huecos.
     *
     * @param  Collection<int,object>  $rows
     */
    private function fill12Months($rows, callable $valueFn): array
    {
        $start = now()->subMonths(11)->startOfMonth();
        $byMonth = collect($rows)->keyBy('ym');
        $series = [];
        for ($i = 0; $i < 12; $i++) {
            $month = $start->copy()->addMonths($i);
            $key = $month->format('Y-m');
            $row = $byMonth->get($key);
            $series[] = array_merge(
                [
                    'label' => $month->locale('es')->isoFormat('MMM'),
                    'ym' => $key,
                ],
                $valueFn($row),
            );
        }

        return $series;
    }

    /**
     * Charts para el Revisor: solicitudes revisadas/observadas por mes.
     */
    public function revisorCharts()
    {
        $start = now()->subMonths(11)->startOfMonth();
        $monthExpr = $this->monthExpr('updated_at');

        $query = DB::table('solicitudes')
            ->select(
                DB::raw("{$monthExpr} as ym"),
                DB::raw("sum(case when estado = 'en_evaluacion' then 1 else 0 end) as aprobadas_doc"),
                DB::raw("sum(case when estado = 'observada' then 1 else 0 end) as observadas"),
                DB::raw("sum(case when estado in ('enviada', 'observada') then 1 else 0 end) as pendientes"),
            )
            ->whereNull('deleted_at')
            ->where('updated_at', '>=', $start);
        $rows = Alcance::aplicar($query, $this->user())
            ->groupBy(DB::raw($monthExpr))
            ->orderBy('ym')
            ->get();

        $series = $this->fill12Months($rows, fn ($row) => [
            'aprobadas_doc' => (int) ($row?->aprobadas_doc ?? 0),
            'observadas' => (int) ($row?->observadas ?? 0),
            'pendientes' => (int) ($row?->pendientes ?? 0),
        ]);

        return response()->json([
            'series_mensual' => $series,
        ]);
    }

    /**
     * Charts para el Evaluador: dictámenes emitidos por mes + por resultado.
     */
    public function evaluadorCharts(Request $request)
    {
        $user = $request->user();
        $start = now()->subMonths(11)->startOfMonth();
        $monthExpr = $this->monthExpr('a.updated_at');

        $query = DB::table('asignaciones_evaluador as a')
            ->join('solicitudes as s', 's.id', '=', 'a.solicitud_id')
            ->leftJoin('dictamenes as d', 'd.asignacion_id', '=', 'a.id')
            ->select(
                DB::raw("{$monthExpr} as ym"),
                DB::raw("sum(case when a.estado = 'concluido' and d.sujeto_apoyo = true then 1 else 0 end) as aprobadas"),
                DB::raw("sum(case when a.estado = 'concluido' and (d.sujeto_apoyo = false or d.sujeto_apoyo is null) and d.id is not null then 1 else 0 end) as rechazadas"),
                DB::raw("sum(case when a.estado in ('asignado', 'evaluando') then 1 else 0 end) as pendientes"),
            )
            ->where('a.evaluador_id', $user->id)
            ->where('a.updated_at', '>=', $start);
        $rows = Alcance::aplicar($query, $user, 's.convocatoria_id')
            ->groupBy(DB::raw($monthExpr))
            ->orderBy('ym')
            ->get();

        $series = $this->fill12Months($rows, fn ($row) => [
            'aprobadas' => (int) ($row?->aprobadas ?? 0),
            'rechazadas' => (int) ($row?->rechazadas ?? 0),
            'pendientes' => (int) ($row?->pendientes ?? 0),
        ]);

        return response()->json([
            'series_mensual' => $series,
        ]);
    }

    /**
     * Series mensuales para gráficas del dashboard admin (con alcance).
     */
    public function adminCharts()
    {
        $user = $this->user();
        $start = now()->subMonths(11)->startOfMonth();
        $monthExpr = $this->monthExpr('s.created_at');

        $query = DB::table('solicitudes as s')
            ->leftJoin('convenios as c', 'c.solicitud_id', '=', 's.id')
            ->select(
                DB::raw("{$monthExpr} as ym"),
                DB::raw('count(s.id) as solicitudes'),
                DB::raw('coalesce(sum(s.monto_solicitado), 0) as monto_solicitado'),
                DB::raw('coalesce(sum(c.monto_aprobado), 0) as monto_aprobado'),
            )
            ->whereNull('s.deleted_at')
            ->where('s.created_at', '>=', $start);
        $rows = Alcance::aplicar($query, $user, 's.convocatoria_id')
            ->groupBy(DB::raw($monthExpr))
            ->orderBy('ym')
            ->get();

        $series = $this->fill12Months($rows, fn ($row) => [
            'solicitudes' => (int) ($row?->solicitudes ?? 0),
            'monto_solicitado' => (float) ($row?->monto_solicitado ?? 0),
            'monto_aprobado' => (float) ($row?->monto_aprobado ?? 0),
        ]);

        $distribucion = $this->solicitudes()
            ->select('estado', DB::raw('count(*) as total'))
            ->groupBy('estado')
            ->orderBy('estado')
            ->get()
            ->map(fn ($r) => [
                'estado' => $r->estado,
                'total' => (int) $r->total,
            ]);

        return response()->json([
            'series_mensual' => $series,
            'distribucion_estado' => $distribucion,
        ]);
    }

    public function globalSearch(Request $request)
    {
        return $this->searchByScope($request, scope: 'admin');
    }

    public function revisorSearch(Request $request)
    {
        return $this->searchByScope($request, scope: 'revisor');
    }

    public function evaluadorSearch(Request $request)
    {
        return $this->searchByScope($request, scope: 'evaluador');
    }

    /**
     * Implementación común de búsqueda con scope por rol + alcance (E45).
     */
    private function searchByScope(Request $request, string $scope)
    {
        $q = trim((string) $request->query('q', ''));
        if (mb_strlen($q) < 2) {
            return response()->json([
                'solicitudes' => [],
                'usuarios' => [],
                'empresas' => [],
            ]);
        }

        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
        $needle = '%'.addcslashes($q, '%_\\').'%';
        $limit = 8;
        $user = $request->user();

        $solQuery = Alcance::aplicar(Solicitud::with('institucion:id,nombre'), $user)
            ->where(function ($w) use ($like, $needle) {
                $w->where('folio', $like, $needle)
                    ->orWhere('titulo_proyecto', $like, $needle);
            });

        if ($scope === 'revisor') {
            $solQuery->whereIn('estado', ['enviada', 'observada', 'en_evaluacion', 'aprobada', 'convenio', 'ministracion', 'seguimiento', 'cerrada']);
        } elseif ($scope === 'evaluador') {
            $solQuery->whereExists(function ($q) use ($user) {
                $q->select(DB::raw(1))
                    ->from('asignaciones_evaluador')
                    ->whereColumn('asignaciones_evaluador.solicitud_id', 'solicitudes.id')
                    ->where('asignaciones_evaluador.evaluador_id', $user->id)
                    ->whereNull('asignaciones_evaluador.retirada_at'); // E85
            });
        }

        $solicitudes = $solQuery
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get(['id', 'folio', 'titulo_proyecto', 'estado', 'empresa_id']);

        // Usuarios: solo el admin general busca en todo el padrón (E45: no el admin de convocatoria ni consulta).
        $usuarios = collect();
        if ($scope === 'admin' && $user->tieneRol('admin')) {
            $usuarios = User::with('rol:id,slug,nombre')
                ->where(function ($w) use ($like, $needle) {
                    $w->where('name', $like, $needle)
                        ->orWhere('email', $like, $needle);
                })
                ->orderBy('name')
                ->limit($limit)
                ->get(['id', 'name', 'email', 'rol_id', 'activo', 'avatar_path']);
        }

        $empresas = $user->tieneRol('admin')
            ? Empresa::where('nombre', $like, $needle)->orderBy('nombre')->limit($limit)->get(['id', 'nombre', 'acronimo'])
            : collect();

        return response()->json([
            'solicitudes' => $solicitudes,
            'usuarios' => $usuarios,
            'empresas' => $empresas,
        ]);
    }

    /**
     * Alertas de Sistema para Admin (con alcance).
     */
    public function adminAlerts()
    {
        $user = $this->user();
        $alerts = [];

        $atrasados = Alcance::aplicarPorSolicitud(Informe::query(), $user)
            ->where('estado', 'pendiente')
            ->where('fecha_limite_entrega', '<', now()->subDays(20))
            ->count();

        if ($atrasados > 0) {
            $alerts[] = [
                'type' => 'error',
                'message' => "<strong>{$atrasados} Instituciones</strong> excedieron el límite de 20 días para el informe final.",
                'color' => 'bg-red-50',
                'dot' => 'bg-red-500',
            ];
        }

        // E40: fecha límite efectiva (con prórroga), días enteros en zona de negocio.
        $hoyNegocio = Convocatoria::hoy();
        $porCerrar = Alcance::aplicar(Convocatoria::where('estado', 'activa')->whereNull('deleted_at'), $user, 'id')
            ->whereRaw('COALESCE(fecha_prorroga, fecha_cierre) BETWEEN ? AND ?', [
                $hoyNegocio, \Illuminate\Support\Carbon::parse($hoyNegocio)->addDays(7)->toDateString(),
            ])
            ->get();

        foreach ($porCerrar as $conv) {
            $days = (int) \Illuminate\Support\Carbon::parse($hoyNegocio)->diffInDays(\Illuminate\Support\Carbon::parse($conv->fecha_cierre_efectiva));
            $alerts[] = [
                'type' => 'warning',
                'message' => $days === 0
                    ? "La convocatoria \"{$conv->nombre}\" cierra hoy."
                    : "La convocatoria \"{$conv->nombre}\" cierra en {$days} días.",
                'color' => 'bg-blue-50',
                'dot' => 'bg-blue-500',
            ];
        }

        // 24/09/2026 — solo el admin general. (Las recuperaciones y accesos pendientes ya tienen su tarjeta en
        // "Pendientes ahora".)
        if ($user->tieneRol('admin')) {
            // Admins activos cuyo dominio no recibe correo (sin MX): nunca les llega ningún aviso por correo.
            $sinCorreo = \Illuminate\Support\Facades\Cache::remember('dash:admins-sin-mx', 3600, function () {
                return \App\Models\User::where('rol_id', config('comecyt.roles.admin'))->where('activo', true)->pluck('email')
                    ->filter(function ($e) {
                        $dom = strtolower((string) substr(strrchr((string) $e, '@') ?: '', 1));

                        return $dom === '' || ! (checkdnsrr($dom, 'MX') || checkdnsrr($dom, 'A'));
                    })->count();
            });
            if ($sinCorreo > 0) {
                $alerts[] = [
                    'type' => 'error',
                    'message' => "{$sinCorreo} cuenta(s) de administrador tienen un correo cuyo dominio no recibe mensajes: no les llegan los avisos por correo (recuperaciones, accesos). Cámbialo en Usuarios.",
                    'href' => '/admin/usuarios',
                    'color' => 'bg-red-50',
                    'dot' => 'bg-red-500',
                ];
            }
        }

        return response()->json($alerts);
    }
}
