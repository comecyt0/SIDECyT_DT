<?php

namespace App\Http\Controllers\Club;

use App\Http\Controllers\Controller;
use App\Models\Club;
use App\Models\ClubCambioIntegrante;
use App\Support\Alcance;
use App\Support\CambioIntegrante;
use App\Support\Especie;
use App\Support\FormatosClub;
use App\Support\RevisionClub;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * E92 — Solicitud de cambio de integrante (reglas en App\Support\CambioIntegrante).
 * Líder: pedir, cancelar y descargar el permiso de imagen prellenado del nuevo integrante.
 * Admin y admin de convocatoria (con alcance): aprobar o rechazar con motivo. Archivos con sesión y permiso; ajeno → 404.
 */
class CambioIntegranteController extends Controller
{
    // ─────────── Líder ───────────

    public function store(Request $request, Club $club)
    {
        $this->exigirOperar($request, $club);
        $c = CambioIntegrante::solicitar($request, $club, $request->user());

        return response()->json(['id' => $c->id] + CambioIntegrante::payload($club->fresh(), FormatosClub::config($club), false), 201);
    }

    public function cancelar(Request $request, Club $club, ClubCambioIntegrante $cambio)
    {
        $this->exigirOperar($request, $club);
        abort_unless((int) $cambio->club_id === (int) $club->id, 404);
        CambioIntegrante::cancelar($cambio, $request->user());

        return response()->json(CambioIntegrante::payload($club->fresh(), FormatosClub::config($club), false));
    }

    /** Permiso de uso de imagen prellenado con los datos del nuevo integrante (aún sin guardar). PDF sin edición. */
    public function permisoPrevio(Request $request, Club $club)
    {
        $this->exigirOperar($request, $club);
        $cfg = FormatosClub::config($club);
        if (! Especie::formatos($cfg)['uso_imagen']['pedir']) {
            return response()->json(['message' => 'Esta convocatoria no pide el permiso de uso de imagen.'], 422);
        }
        $persona = CambioIntegrante::persona(ClubController::datosIntegrante($request, $club, $cfg));
        $menor = FormatosClub::esMenor($persona);

        return FormatosClub::descargar($menor ? 'pdfs.formatos.uso_imagen_menor' : 'pdfs.formatos.uso_imagen_adulto',
            FormatosClub::datos($club) + ['persona' => $persona], 'permiso-uso-de-imagen-'.$club->folio.'-nuevo');
    }

    // ─────────── Personal ───────────

    public function resolver(Request $request, Club $club, ClubCambioIntegrante $cambio)
    {
        abort_unless((int) $cambio->club_id === (int) $club->id && Alcance::puedeVerConvocatoria($request->user(), (int) $club->convocatoria_id), 404);
        abort_unless(in_array(RevisionClub::rolDe($request->user()), ['admin', 'admin_convocatoria'], true), 403);
        $v = $request->validate([
            'decision' => 'required|in:aprobar,rechazar',
            'motivo' => 'nullable|string|max:1000|required_if:decision,rechazar',
        ], ['motivo.required_if' => 'Escribe el motivo del rechazo (el líder lo verá).'], ['motivo' => 'motivo']);
        CambioIntegrante::resolver($cambio, $request->user(), $v['decision'], $v['motivo'] ?? null);

        return response()->json(RevisionClubController::detallePersonal($club->fresh(), $request->user()));
    }

    // ─────────── Archivos (líder, acompañantes y personal con alcance) ───────────

    public function archivo(Request $request, Club $club, ClubCambioIntegrante $cambio, string $tipo)
    {
        abort_unless((int) $cambio->club_id === (int) $club->id && ClubArchivoController::puedeVer($request->user(), $club), 404);
        $nombre = $tipo === 'foto' ? $cambio->foto_path : $cambio->permiso_archivo;
        $patron = $tipo === 'foto' ? \App\Support\ImagenSegura::PATRON : '/^[A-Za-z0-9]{40}\.pdf$/';
        abort_unless($nombre && preg_match($patron, $nombre) === 1, 404);
        $ruta = CambioIntegrante::DIR.'/'.$nombre;
        abort_unless(Storage::disk('local')->exists($ruta), 404);

        return response()->file(Storage::disk('local')->path($ruta), [
            'Content-Type' => $tipo === 'foto' ? 'image/webp' : 'application/pdf',
            'Content-Disposition' => 'inline; filename="cambio-'.$cambio->id.'-'.$tipo.($tipo === 'foto' ? '.webp' : '.pdf').'"',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    private function exigirOperar(Request $request, Club $club): void
    {
        abort_unless($club->puedeVer($request->user()), 404);
        if (! $club->puedeOperar($request->user())) {
            abort(response()->json(['message' => 'Solo el líder del club puede pedir cambios.'], 403));
        }
    }
}
