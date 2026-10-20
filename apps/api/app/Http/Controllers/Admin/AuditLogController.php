<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Support\Audit;
use App\Support\Bitacora;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        // 20/10/2026: tope de 100 por página (antes sin límite).
        $porPagina = min(100, max(1, (int) $request->query('per_page', 25)));

        return response()->json($this->consulta($request)->paginate($porPagina));
    }

    /**
     * E82 (20/10/2026, pedido del usuario) — Exportar el historial en PDF o Excel: completo (lo que muestran los filtros,
     * hasta 10 000 acciones) o parcial (las acciones marcadas). Agrupado por día, con la franja institucional.
     */
    public function exportar(Request $request)
    {
        $v = $request->validate([
            'formato' => ['required', 'in:pdf,xlsx'],
            'modo' => ['required', 'in:completo,parcial'],
            'ids' => ['required_if:modo,parcial', 'array', 'max:1000'],
            'ids.*' => ['integer', 'min:1'],
        ], ['ids.required_if' => 'Marca al menos una acción.']);
        $q = $v['modo'] === 'parcial' ? AuditLog::with('user:id,name,email')->whereIn('id', $v['ids'])->orderByDesc('id') : $this->consulta($request);
        $filas = $q->limit(10000)->get();
        abort_if($filas->isEmpty(), 422, 'No hay acciones para exportar con esos filtros.');
        $fecha = now('America/Mexico_City');
        Audit::log('bitacora.exportada', null, ['formato' => $v['formato'], 'modo' => $v['modo'], 'total' => $filas->count()]);

        $items = $filas->map(fn (AuditLog $a) => Bitacora::fila($a));
        $filtros = collect([
            $request->query('action') ? 'Acción: «'.$request->query('action').'»' : null,
            $request->query('user_id') ? 'Usuario nº '.(int) $request->query('user_id') : null,
            $request->query('from') ? 'Desde '.$request->query('from') : null,
            $request->query('to') ? 'Hasta '.$request->query('to') : null,
        ])->filter()->implode(' · ');
        $titulo = 'Historial de acciones · '.($v['modo'] === 'completo' ? 'reporte completo' : 'selección de '.$items->count());
        $nombre = 'historial-'.$v['modo'].'-'.$fecha->format('Y-m-d');

        if ($v['formato'] === 'pdf') {
            return \Barryvdh\DomPDF\Facade\Pdf::loadView('pdfs.reportes.bitacora', [
                'dias' => $items->groupBy('dia'), 'titulo' => $titulo, 'filtros' => $filtros, 'total' => $items->count(),
                'fecha' => $fecha, 'franja' => \App\Support\FormatosClub::franja(),
            ])->setPaper('letter', 'landscape')->download($nombre.'.pdf')->header('Cache-Control', 'private, no-store');
        }
        $s = fn ($x) => \App\Exports\SolicitudesExport::celda($x === null ? '' : (string) $x);

        return \Maatwebsite\Excel\Facades\Excel::download(new \App\Exports\ReporteInstitucional('Historial', $titulo, $filtros, $fecha,
            ['Día', 'Hora', 'Qué se hizo', 'Quién', 'Correo', 'Sobre qué', 'Desde dónde'],
            $items->map(fn ($x) => [$s($x['dia']), $s($x['hora']), $s($x['accion']), $s($x['quien']), $s($x['correo']), $s($x['sobre']), $s($x['ip'])])->all()),
            $nombre.'.xlsx');
    }

    /** Filtros comunes de la lista y la exportación. */
    private function consulta(Request $request)
    {
        $query = AuditLog::with('user:id,name,email,rol_id')->orderByDesc('id');

        if ($action = $request->query('action')) {
            $query->where('action', 'like', '%'.addcslashes((string) $action, '%_\\').'%');
        }
        if ($userId = $request->query('user_id')) {
            $query->where('user_id', (int) $userId);
        }
        if ($subjectType = $request->query('subject_type')) {
            $query->where('subject_type', $subjectType);
        }
        if ($subjectId = $request->query('subject_id')) {
            $query->where('subject_id', (int) $subjectId);
        }
        if (($from = $request->query('from')) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $from)) {
            $query->where('created_at', '>=', \Carbon\Carbon::parse($from, 'America/Mexico_City')->startOfDay()->utc());
        }
        if (($to = $request->query('to')) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $to)) {
            // 20/10/2026: «Hasta» incluye todo ese día (antes se cortaba a las 00:00).
            $query->where('created_at', '<', \Carbon\Carbon::parse($to, 'America/Mexico_City')->addDay()->startOfDay()->utc());
        }

        return $query;
    }
}
