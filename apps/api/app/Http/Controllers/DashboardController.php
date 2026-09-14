<?php

namespace App\Http\Controllers;

use App\Models\AsignacionEvaluador;
use App\Models\Convocatoria;
use App\Models\Informe;
use App\Models\Empresa;
use App\Models\Ministracion;
use App\Models\Solicitud;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Estadísticas para el Administrador
     */
    public function adminStats()
    {
        $stats = [
            [
                'title' => 'Convocatorias Activas',
                'value' => (string) Convocatoria::where('estado', 'activa')->count(),
                'icon' => 'Bookmark',
                'color' => 'text-blue-500',
            ],
            [
                'title' => 'Solicitudes en Revisión',
                'value' => (string) Solicitud::whereIn('estado', ['enviada', 'observada'])->count(),
                'icon' => 'FileText',
                'color' => 'text-amber-500',
            ],
            [
                'title' => 'Proyectos Evaluándose',
                'value' => (string) Solicitud::where('estado', 'en_evaluacion')->count(),
                'icon' => 'Users',
                'color' => 'text-accent',
            ],
            [
                'title' => 'Dictámenes Aprobados',
                'value' => (string) Solicitud::where('estado', 'aprobada')->count(),
                'icon' => 'CheckCircle2',
                'color' => 'text-green-600',
            ],
            [
                'title' => 'Ministraciones Pendientes',
                'value' => (string) Ministracion::where('estado', 'pendiente')->count(),
                'icon' => 'Clock',
                'color' => 'text-orange-500',
            ],
            [
                'title' => 'Informes Entregados',
                'value' => (string) Solicitud::where('estado_informe', 'entregado')->count(),
                'icon' => 'FileText',
                'color' => 'text-blue-600',
            ],
            [
                'title' => 'Pagos Completados',
                'value' => (string) Ministracion::where('estado', 'pagada')->count(),
                'icon' => 'CheckCircle2',
                'color' => 'text-emerald-600',
            ],
        ];

        return response()->json($stats);
    }

    /**
     * Estadísticas para el Revisor
     * - nuevos: solicitudes enviadas y sin revisar aún (estado='enviada')
     * - en_subsanacion: solicitudes con observaciones que esperan correcciones (estado='observada')
     * - pendientes_urgentes: solicitudes observadas hace más de 7 días sin reenvío (antiguas)
     */
    public function revisorStats()
    {
        // Solicitudes con estado 'enviada' sin revisar
        $nuevos = Solicitud::where('estado', 'enviada')->count();

        // Solicitudes con estado 'observada' en proceso de subsanación
        $en_subsanacion = Solicitud::where('estado', 'observada')->count();

        // Solicitudes 'observada' que llevan más de 7 días sin reenvío (urgentes)
        $pendientes_urgentes = Solicitud::where('estado', 'observada')
            ->where('updated_at', '<', now()->subDays(7))
            ->count();

        $stats = [
            'nuevos' => $nuevos,
            'en_subsanacion' => $en_subsanacion,
            'pendientes_urgentes' => $pendientes_urgentes,
        ];

        return response()->json($stats);
    }

    /**
     * Estadísticas para el Evaluador
     * - por_iniciar: asignaciones con estado 'notificado' (sin empezar)
     * - en_progreso: asignaciones SIN estado 'notificado' y SIN estado 'concluido' (en proceso)
     * - evaluadas: asignaciones con estado 'concluido' (evaluación completada)
     */
    public function evaluadorStats(Request $request)
    {
        $user = $request->user();

        $stats = [
            'por_iniciar' => AsignacionEvaluador::where('evaluador_id', $user->id)
                ->where('estado', 'asignado')
                ->count(),
            'en_progreso' => AsignacionEvaluador::where('evaluador_id', $user->id)
                ->where('estado', 'evaluando')
                ->count(),
            'evaluadas' => AsignacionEvaluador::where('evaluador_id', $user->id)
                ->where('estado', 'concluido')
                ->count(),
        ];

        return response()->json($stats);
    }

    /**
     * Actividad Reciente para Admin
     */
    public function adminActivity()
    {
        // Ejemplo: Solicitudes por mes en el último año
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

        // Solicitudes en revisión por mes (basado en última actualización)
        $rows = DB::table('solicitudes')
            ->select(
                DB::raw("{$monthExpr} as ym"),
                DB::raw("sum(case when estado = 'en_evaluacion' then 1 else 0 end) as aprobadas_doc"),
                DB::raw("sum(case when estado = 'observada' then 1 else 0 end) as observadas"),
                DB::raw("sum(case when estado in ('enviada', 'observada') then 1 else 0 end) as pendientes"),
            )
            ->where('updated_at', '>=', $start)
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

        $rows = DB::table('asignaciones_evaluador as a')
            ->leftJoin('dictamenes as d', 'd.asignacion_id', '=', 'a.id')
            ->select(
                DB::raw("{$monthExpr} as ym"),
                DB::raw("sum(case when a.estado = 'concluido' and d.sujeto_apoyo = true then 1 else 0 end) as aprobadas"),
                DB::raw("sum(case when a.estado = 'concluido' and (d.sujeto_apoyo = false or d.sujeto_apoyo is null) and d.id is not null then 1 else 0 end) as rechazadas"),
                DB::raw("sum(case when a.estado in ('asignado', 'evaluando') then 1 else 0 end) as pendientes"),
            )
            ->where('a.evaluador_id', $user->id)
            ->where('a.updated_at', '>=', $start)
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
     * Series mensuales para gráficas del dashboard admin.
     * - Últimos 12 meses
     * - Por mes: solicitudes recibidas, monto solicitado total, monto aprobado total
     * - Distribución actual por estado (snapshot)
     */
    public function adminCharts()
    {
        $start = now()->subMonths(11)->startOfMonth();
        $monthExpr = $this->monthExpr('s.created_at');

        $rows = DB::table('solicitudes as s')
            ->leftJoin('convenios as c', 'c.solicitud_id', '=', 's.id')
            ->select(
                DB::raw("{$monthExpr} as ym"),
                DB::raw('count(s.id) as solicitudes'),
                DB::raw('coalesce(sum(s.monto_solicitado), 0) as monto_solicitado'),
                DB::raw('coalesce(sum(c.monto_aprobado), 0) as monto_aprobado'),
            )
            ->where('s.created_at', '>=', $start)
            ->groupBy(DB::raw($monthExpr))
            ->orderBy('ym')
            ->get();

        $series = $this->fill12Months($rows, fn ($row) => [
            'solicitudes' => (int) ($row?->solicitudes ?? 0),
            'monto_solicitado' => (float) ($row?->monto_solicitado ?? 0),
            'monto_aprobado' => (float) ($row?->monto_aprobado ?? 0),
        ]);

        // Distribución por estado (snapshot actual)
        $distribucion = Solicitud::select('estado', DB::raw('count(*) as total'))
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

    /**
     * Búsqueda global transversal para el admin.
     * Acepta ?q=texto (≥2 chars). Busca en solicitudes (folio + titulo),
     * usuarios (name + email) e instituciones (nombre).
     * Limita a N por categoría para mantener la respuesta liviana.
     */
    public function globalSearch(Request $request)
    {
        return $this->searchByScope($request, scope: 'admin');
    }

    /**
     * Búsqueda para revisor: sólo solicitudes en su bandeja + instituciones.
     * Filtramos a estados que el revisor maneja.
     */
    public function revisorSearch(Request $request)
    {
        return $this->searchByScope($request, scope: 'revisor');
    }

    /**
     * Búsqueda para evaluador: sólo solicitudes asignadas a él + instituciones.
     */
    public function evaluadorSearch(Request $request)
    {
        return $this->searchByScope($request, scope: 'evaluador');
    }

    /**
     * Implementación común de búsqueda con scope por rol.
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
        $needle = "%{$q}%";
        $limit = 8;
        $user = $request->user();

        $solQuery = Solicitud::with('institucion:id,nombre')
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
                    ->where('asignaciones_evaluador.evaluador_id', $user->id);
            });
        }

        $solicitudes = $solQuery
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get(['id', 'folio', 'titulo_proyecto', 'estado', 'empresa_id']);

        // Usuarios e instituciones sólo para admin
        $usuarios = collect();
        if ($scope === 'admin') {
            $usuarios = User::with('rol:id,slug,nombre')
                ->where(function ($w) use ($like, $needle) {
                    $w->where('name', $like, $needle)
                        ->orWhere('email', $like, $needle);
                })
                ->orderBy('name')
                ->limit($limit)
                ->get(['id', 'name', 'email', 'rol_id', 'activo']);
        }

        $empresas = Empresa::where('nombre', $like, $needle)
            ->orderBy('nombre')
            ->limit($limit)
            ->get(['id', 'nombre', 'acronimo']);

        return response()->json([
            'solicitudes' => $solicitudes,
            'usuarios' => $usuarios,
            'empresas' => $empresas,
        ]);
    }

    /**
     * Alertas de Sistema para Admin
     */
    public function adminAlerts()
    {
        $alerts = [];

        // 1. Instituciones con informes atrasados (> 20 días)
        $atrasados = Informe::where('estado', 'pendiente')
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

        // 2. Convocatorias por cerrar (en menos de 7 días)
        $porCerrar = Convocatoria::where('estado', 'activa')
            ->whereBetween('fecha_cierre', [now(), now()->addDays(7)])
            ->get();

        foreach ($porCerrar as $conv) {
            $days = now()->diffInDays($conv->fecha_cierre);
            $alerts[] = [
                'type' => 'warning',
                'message' => "La convocatoria \"{$conv->titulo}\" cierra en {$days} días.",
                'color' => 'bg-blue-50',
                'dot' => 'bg-blue-500',
            ];
        }

        return response()->json($alerts);
    }
}
