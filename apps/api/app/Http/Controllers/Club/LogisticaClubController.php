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
        $this->opera($request, $club);
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
        $this->opera($request, $club);
        LogisticaClub::cancelar($club, $logistica);

        return response()->json(LogisticaClub::estado($club->fresh()));
    }

    /**
     * E87 (pedido del usuario): el líder define el punto de salida de su club (lugar, enlace de Google Maps y la hora que
     * propone). Solo si la convocatoria da transporte; el regreso lo define el admin en la convocatoria.
     */
    public function salida(Request $request, Club $club)
    {
        $this->propio($request, $club);
        abort_unless($club->puedeOperar($request->user()), 403, 'Solo el líder del club puede definir el punto de salida.');
        abort_unless(\App\Support\LogisticaClub::aplica($club), 422, 'La logística está disponible cuando el club es aceptado.');
        $cfg = $club->convocatoria->especieConfig;
        abort_unless($cfg && $cfg->incluye_transporte, 422, 'Esta convocatoria no da transporte.');
        $v = $request->validate([
            'lugar' => 'required|string|min:3|max:300',
            'maps' => ['nullable', 'string', 'max:500', fn ($a, $x, $fail) => $x && ! \App\Support\ApoyosLogistica::esMapa($x) ? $fail('El enlace debe ser de Google Maps (https://maps.app.goo.gl/… o https://www.google.com/maps/…).') : null],
            'hora' => 'nullable|date_format:Y-m-d\TH:i',
        ], [], ['lugar' => 'punto de salida', 'maps' => 'enlace de Google Maps', 'hora' => 'hora de salida']);
        $hora = ! empty($v['hora']) ? \Illuminate\Support\Carbon::parse($v['hora'], \App\Support\RevisionClub::ZONA)->utc() : null;
        if ($hora && $cfg->transporte_regreso_hora && $hora->gt($cfg->transporte_regreso_hora)) {
            throw \Illuminate\Validation\ValidationException::withMessages(['hora' => 'La salida no puede ser después del regreso que fijó el COMECYT.']);
        }
        $club->forceFill(['transporte_salida_lugar' => trim(strip_tags($v['lugar'])), 'transporte_salida_maps' => $v['maps'] ?: null, 'transporte_salida_hora' => $hora])->save();
        \App\Support\Audit::log('club.salida_transporte', $club, []);

        return response()->json(\App\Support\LogisticaClub::estado($club->fresh()));
    }

    /** Formato de la solicitud para firmar (PDF generado con lo pedido). */
    public function formato(Request $request, Club $club, ClubLogistica $logistica)
    {
        $this->propio($request, $club);
        abort_unless((int) $logistica->club_id === (int) $club->id && in_array($logistica->estado, ClubLogistica::APARTAN, true), 404);
        $club->loadMissing(['escuela', 'lider:id,name', 'convocatoria:id,nombre', 'convocatoria.especieConfig', 'integrantes:id,club_id']);
        // E87: sin transporte ni box lunch en la convocatoria, no hay formato.
        $cfg = $club->convocatoria->especieConfig;
        abort_unless($cfg && ($cfg->incluye_transporte || $cfg->incluye_lunch), 404);
        $logistica->loadMissing('evento');
        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdfs.solicitud_logistica_club', ['club' => $club, 'log' => $logistica, 'cfg' => $cfg, 'fecha' => now('America/Mexico_City')]);

        return $pdf->download('solicitud-transporte-lunch-'.$club->folio.($logistica->evento_id ? '-evento-'.$logistica->evento_id : '').'.pdf');
    }

    /** Carta de resguardo del kit para firmar (solo clubes aceptados). */
    public function resguardo(Request $request, Club $club)
    {
        $this->propio($request, $club);
        abort_unless(LogisticaClub::aplica($club), 404);
        // 20/10/2026: nacional e internacional, sin kit ni carta de resguardo.
        abort_unless(\App\Support\KitClub::aplica(LogisticaClub::config($club)), 404);
        $club->loadMissing(['escuela', 'lider:id,name', 'integrantes', 'convocatoria:id,nombre']);
        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdfs.carta_resguardo_club', ['club' => $club, 'cfg' => LogisticaClub::config($club), 'fecha' => now('America/Mexico_City')]);

        return $pdf->download('carta-resguardo-'.$club->folio.'.pdf');
    }

    public function subirFirmado(Request $request, Club $club)
    {
        $this->opera($request, $club);
        $v = $request->validate([
            'tipo' => 'required|in:resguardo,solicitud',
            'logistica_id' => 'nullable|integer|required_if:tipo,solicitud',
            'archivo' => 'required|file|max:'.(LogisticaClub::MAX_MB * 1024),
        ]);
        if ($v['tipo'] === 'resguardo' && ! \App\Support\KitClub::aplica(LogisticaClub::config($club))) {
            return response()->json(['message' => 'En la modalidad nacional e internacional no hay kit ni carta de resguardo.'], 422);
        }
        $log = $v['tipo'] === 'solicitud' ? ClubLogistica::where('club_id', $club->id)->find($v['logistica_id']) ?? abort(404) : null;
        LogisticaClub::subirFirmado($club, $request->user(), $v['tipo'], $log, $request->file('archivo'));

        return response()->json(LogisticaClub::estado($club->fresh()), 201);
    }

    // E61: ver (descargar formato y carta) = líder o acompañante; fuera de eso, 404.
    private function propio(Request $request, Club $club): void
    {
        abort_unless($club->puedeVer($request->user()), 404);
    }

    // E61: pedir, bajar y subir firmados = líder o director colíder; el líder B y el director solo ven.
    private function opera(Request $request, Club $club): void
    {
        $this->propio($request, $club);
        abort_unless($club->puedeOperar($request->user()), 403, 'Solo el líder del club puede hacer cambios.');
    }
}
