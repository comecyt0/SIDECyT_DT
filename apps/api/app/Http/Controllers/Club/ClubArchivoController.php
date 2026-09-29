<?php

namespace App\Http\Controllers\Club;

use App\Http\Controllers\Controller;
use App\Models\Club;
use App\Models\ClubDocumento;
use App\Models\ClubIntegrante;
use App\Models\User;
use App\Support\Alcance;
use App\Support\Audit;
use App\Support\Especie;
use App\Support\ImagenSegura;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * E52 · F1 — Archivos de clubes (logos, fotos de integrantes, documentos). Nada es público: se sirven con sesión y solo
 * a quien puede ver el club (su líder, o personal con alcance sobre la convocatoria). A los demás, 404.
 */
class ClubArchivoController extends Controller
{
    public static function puedeVer(User $u, Club $club): bool
    {
        if ((int) $club->lider_id === (int) $u->id) {
            return true;
        }
        if ($u->tieneRol('admin', 'admin_convocatoria', 'consulta', 'revisor')) {
            return Alcance::puedeVerConvocatoria($u, (int) $club->convocatoria_id);
        }

        return false;
    }

    /** GET /api/media/club/{archivo}: logo del club o foto de un integrante. */
    public function media(Request $request, string $archivo)
    {
        abort_unless(preg_match(ImagenSegura::PATRON, $archivo) === 1, 404);
        $club = Club::where('logo_path', $archivo)->first()
            ?? ClubIntegrante::where('foto_path', $archivo)->first()?->club;
        abort_unless($club && self::puedeVer($request->user(), $club), 404);
        $ruta = Especie::DIR_MEDIA.'/'.$archivo;
        abort_unless(Storage::disk('local')->exists($ruta), 404);

        return response()->file(Storage::disk('local')->path($ruta), [
            'Content-Type' => 'image/webp',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, max-age=86400',
        ]);
    }

    /** GET /api/clubes/{club}/firmados/{firmado}: una versión de un documento firmado (carta de resguardo o formato). */
    public function firmado(Request $request, Club $club, \App\Models\ClubFirmado $firmado)
    {
        abort_unless((int) $firmado->club_id === (int) $club->id && self::puedeVer($request->user(), $club), 404);
        $ruta = \App\Support\LogisticaClub::DIR.'/'.$club->id.'/'.$firmado->archivo;
        abort_unless(preg_match('/^[A-Za-z0-9]{40}\.(pdf|jpg|png|webp)$/', $firmado->archivo) && Storage::disk('local')->exists($ruta), 404);
        if ((int) $club->lider_id !== (int) $request->user()->id) {
            Audit::log('club.firmado_descargado', $club, ['firmado_id' => $firmado->id]);
        }
        $ext = pathinfo($firmado->archivo, PATHINFO_EXTENSION);

        return response()->file(Storage::disk('local')->path($ruta), [
            'Content-Type' => ['pdf' => 'application/pdf', 'jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'][$ext],
            'Content-Disposition' => 'inline; filename="'.$firmado->tipo.'-'.$firmado->id.'.'.$ext.'"',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    /** GET /api/clubes/{club}/documentos/{clave}: descarga de un documento del club. */
    public function documento(Request $request, Club $club, string $clave)
    {
        abort_unless(self::puedeVer($request->user(), $club), 404);
        $doc = ClubDocumento::where('club_id', $club->id)->where('clave', $clave)->firstOrFail();
        $ruta = Especie::DIR_DOCS.'/'.$club->id.'/'.$doc->archivo;
        abort_unless(preg_match('/^[A-Za-z0-9]{40}\.(pdf|jpg|png|webp|docx|xlsx|zip)$/', $doc->archivo) && Storage::disk('local')->exists($ruta), 404);
        if ((int) $club->lider_id !== (int) $request->user()->id) {
            Audit::log('club.documento_descargado', $club, ['clave' => $clave]);
        }
        $ext = pathinfo($doc->archivo, PATHINFO_EXTENSION);
        $mime = ['pdf' => 'application/pdf', 'jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'zip' => 'application/zip'][$ext] ?? 'application/octet-stream';
        $inline = in_array($ext, ['pdf', 'jpg', 'png', 'webp'], true);

        return response()->file(Storage::disk('local')->path($ruta), [
            'Content-Type' => $mime,
            'Content-Disposition' => ($inline ? 'inline' : 'attachment').'; filename="'.$clave.'.'.$ext.'"',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }
}
