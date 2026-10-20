<?php

namespace App\Http\Controllers\Club;

use App\Http\Controllers\Controller;
use App\Models\Club;
use App\Support\Alcance;
use App\Support\Especie;
use App\Support\LogisticaClub;
use App\Support\QrClub;
use App\Support\RevisionClub;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * E52 · F4 — QR del club.
 *  - Líder (dueño del club): imagen del QR y credencial en PDF, solo con el QR habilitado (404 si no).
 *  - Personal (admin y admin de convocatoria con alcance): habilitar a uno o varios clubes y revocar.
 */
class QrClubController extends Controller
{
    public function imagen(Request $request, Club $club)
    {
        $this->propioHabilitado($request, $club);

        return response(QrClub::png($club), 200, [
            'Content-Type' => 'image/png',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    public function credencial(Request $request, Club $club)
    {
        $this->propioHabilitado($request, $club);
        $club->loadMissing(['escuela', 'lider:id,name', 'integrantes', 'convocatoria:id,nombre']);
        $fotos = $club->integrantes->mapWithKeys(fn ($i) => [$i->id => self::pngDataUri($i->foto_path)]);
        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdfs.credencial_club', [
            'club' => $club, 'qr' => QrClub::pngDataUri($club), 'logo' => self::pngDataUri($club->logo_path),
            'fotos' => $fotos, 'cfg' => LogisticaClub::config($club), 'fecha' => now('America/Mexico_City'),
        ]);

        return $pdf->download('credencial-'.$club->folio.'.pdf')->header('Cache-Control', 'private, no-store');
    }

    public function habilitar(Request $request)
    {
        $v = $request->validate(['club_ids' => 'required|array|min:1|max:500', 'club_ids.*' => 'integer|distinct'], [], ['club_ids' => 'clubes']);
        $r = QrClub::habilitar($v['club_ids'], $request->user());
        if (! $r['habilitados'] && ! $r['omitidos']) {
            throw ValidationException::withMessages(['club_ids' => 'Ninguno de los clubes elegidos es de tus convocatorias.']);
        }

        return response()->json($r);
    }

    public function revocar(Request $request, Club $club)
    {
        abort_unless(Alcance::puedeVerConvocatoria($request->user(), (int) $club->convocatoria_id), 404);
        abort_unless(RevisionClub::puedeAceptar($request->user(), (int) $club->convocatoria_id), 403);
        if (! QrClub::habilitado($club)) throw ValidationException::withMessages(['qr' => 'Este club no tiene su QR habilitado.']);
        QrClub::revocar($club, $request->user());

        return response()->json(RevisionClubController::detallePersonal($club->fresh(), $request->user()));
    }

    private function propioHabilitado(Request $request, Club $club): void
    {
        // E61: el QR y la credencial también los ven el líder B y el director.
        abort_unless($club->puedeVer($request->user()) && QrClub::habilitado($club) && ! QrClub::impedimento($club), 404);
    }

    /** Foto o logo (WebP privado) → PNG en data URI para DomPDF; null si no hay o no se puede leer. */
    private static function pngDataUri(?string $archivo): ?string
    {
        if (! $archivo || ! preg_match('/^[A-Za-z0-9]{40}\.webp$/', $archivo)) return null;
        $ruta = Especie::DIR_MEDIA.'/'.$archivo;
        if (! Storage::disk('local')->exists($ruta) || ! function_exists('imagecreatefromwebp')) return null;
        $img = @imagecreatefromwebp(Storage::disk('local')->path($ruta));
        if (! $img) return null;
        ob_start();
        imagepng($img, null, 6);
        imagedestroy($img);

        return 'data:image/png;base64,'.base64_encode((string) ob_get_clean());
    }
}
