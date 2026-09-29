<?php

namespace App\Http\Controllers\Club;

use App\Http\Controllers\Controller;
use App\Models\Club;
use App\Models\ClubLogistica;
use App\Support\LogisticaClub;
use Illuminate\Http\Request;

/**
 * E52 · F3 — Logística del lado del líder: pedir o cambiar transporte y box lunch (hasta la fecha límite), bajar la
 * solicitud, descargar el formato y la carta de resguardo generados, y subir las versiones firmadas. Cada acción comprueba
 * que el club es del líder (404 si no). Las reglas viven en App\Support\LogisticaClub.
 */
class LogisticaClubController extends Controller
{
    public function solicitar(Request $request, Club $club)
    {
        $this->propio($request, $club);
        $v = $request->validate([
            'evento_id' => 'nullable|integer',
            'transporte' => 'required|integer|min:0|max:1000',
            'lunch' => 'required|integer|min:0|max:1000',
            'confirmo_sin_transporte' => 'nullable|boolean',
        ], [], ['transporte' => 'transporte', 'lunch' => 'box lunch']);
        LogisticaClub::solicitar($club, $request->user(), isset($v['evento_id']) ? (int) $v['evento_id'] : null,
            (int) $v['transporte'], (int) $v['lunch'], (bool) ($v['confirmo_sin_transporte'] ?? false));

        return response()->json(LogisticaClub::estado($club->fresh()));
    }

    public function cancelar(Request $request, Club $club, ClubLogistica $logistica)
    {
        $this->propio($request, $club);
        LogisticaClub::cancelar($club, $logistica);

        return response()->json(LogisticaClub::estado($club->fresh()));
    }

    /** Formato de la solicitud para firmar (PDF generado con lo pedido). */
    public function formato(Request $request, Club $club, ClubLogistica $logistica)
    {
        $this->propio($request, $club);
        abort_unless((int) $logistica->club_id === (int) $club->id && in_array($logistica->estado, ClubLogistica::APARTAN, true), 404);
        $club->loadMissing(['escuela', 'lider:id,name', 'convocatoria:id,nombre']);
        $logistica->loadMissing('evento');
        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdfs.solicitud_logistica_club', ['club' => $club, 'log' => $logistica, 'fecha' => now('America/Mexico_City')]);

        return $pdf->download('solicitud-transporte-lunch-'.$club->folio.($logistica->evento_id ? '-evento-'.$logistica->evento_id : '').'.pdf');
    }

    /** Carta de resguardo del kit para firmar (solo clubes aceptados). */
    public function resguardo(Request $request, Club $club)
    {
        $this->propio($request, $club);
        abort_unless(LogisticaClub::aplica($club), 404);
        $club->loadMissing(['escuela', 'lider:id,name', 'integrantes', 'convocatoria:id,nombre']);
        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdfs.carta_resguardo_club', ['club' => $club, 'cfg' => LogisticaClub::config($club), 'fecha' => now('America/Mexico_City')]);

        return $pdf->download('carta-resguardo-'.$club->folio.'.pdf');
    }

    public function subirFirmado(Request $request, Club $club)
    {
        $this->propio($request, $club);
        $v = $request->validate([
            'tipo' => 'required|in:resguardo,solicitud',
            'logistica_id' => 'nullable|integer|required_if:tipo,solicitud',
            'archivo' => 'required|file|max:'.(LogisticaClub::MAX_MB * 1024),
        ]);
        $log = $v['tipo'] === 'solicitud' ? ClubLogistica::where('club_id', $club->id)->find($v['logistica_id']) ?? abort(404) : null;
        LogisticaClub::subirFirmado($club, $request->user(), $v['tipo'], $log, $request->file('archivo'));

        return response()->json(LogisticaClub::estado($club->fresh()), 201);
    }

    private function propio(Request $request, Club $club): void
    {
        abort_unless((int) $club->lider_id === (int) $request->user()->id, 404);
    }
}
