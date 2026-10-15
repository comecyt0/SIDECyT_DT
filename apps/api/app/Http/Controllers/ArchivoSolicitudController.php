<?php

namespace App\Http\Controllers;

use App\Models\AsignacionEvaluador;
use App\Models\Solicitud;
use App\Models\User;
use App\Support\Alcance;
use App\Support\TiposArchivo;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Archivos de las solicitudes en almacenamiento PRIVADO (seguridad, 24/09/2026 — E44; tipos configurables, E45).
 *
 *  - Disco `local` (storage/app/private), fuera de la carpeta web.
 *  - Nombre aleatorio de 40 caracteres + extensión DERIVADA DEL CONTENIDO (App\Support\TiposArchivo), nunca la del
 *    cliente.
 *  - Solo se descargan por `GET /api/archivos/solicitudes/{solicitud}/{archivo}`, con sesión y permiso:
 *    admin; admin de convocatoria, consulta y revisor dentro de su alcance (App\Support\Alcance); el dueño; y el
 *    evaluador asignado. Los demás reciben 404.
 *  - PDF e imágenes se muestran en línea (vista previa); DOCX/XLSX/ZIP siempre como descarga.
 */
class ArchivoSolicitudController extends Controller
{
    /** Nombre de archivo válido: exactamente el formato que genera guardar(). Cierra la puerta a `../`. */
    public const PATRON_NOMBRE = '[A-Za-z0-9]{40}\.(?:pdf|jpg|png|webp|docx|xlsx|zip)';

    /**
     * Guarda un archivo YA VALIDADO por TiposArchivo::validar() con la extensión que esta devolvió.
     * getPathname() + Storage::put(): en este IIS getRealPath() devuelve false (E28), y putFileAs() lo usa.
     */
    public static function guardar(UploadedFile $file, Solicitud $solicitud, string $extension = 'pdf'): string
    {
        abort_unless(in_array($extension, TiposArchivo::EXTENSIONES, true), 422, 'Tipo de archivo no permitido');
        // E74: imágenes → WebP sin metadatos; el resto tal cual.
        [$extension, $contenido] = TiposArchivo::contenidoSeguro($file, $extension);
        $nombre = Str::random(40).'.'.$extension;
        Storage::disk('local')->put(self::rutaInterna($solicitud->id, $nombre), $contenido);

        return "/api/archivos/solicitudes/{$solicitud->id}/{$nombre}";
    }

    /** Borra el archivo al que apunta una URL guardada, solo si es de esta solicitud y tiene el formato propio. */
    public static function borrarPorUrl(?string $url, Solicitud $solicitud): void
    {
        if (! $url) {
            return;
        }
        if (preg_match('#^/api/archivos/solicitudes/'.$solicitud->id.'/('.self::PATRON_NOMBRE.')$#', $url, $m)) {
            Storage::disk('local')->delete(self::rutaInterna($solicitud->id, $m[1]));
        }
    }

    private static function rutaInterna(int $solicitudId, string $nombre): string
    {
        return "solicitudes/{$solicitudId}/{$nombre}";
    }

    /** Quién puede ver los archivos de una solicitud. */
    public static function puedeVer(User $user, Solicitud $solicitud): bool
    {
        if ($user->tieneRol('solicitante')) {
            return (int) $solicitud->user_id === (int) $user->id;
        }
        if ($user->tieneRol('evaluador')) {
            return AsignacionEvaluador::where('solicitud_id', $solicitud->id)->where('evaluador_id', $user->id)->exists()
                && Alcance::puedeVerSolicitud($user, $solicitud);
        }
        if ($user->tieneRol('admin', 'admin_convocatoria', 'consulta', 'revisor')) {
            return Alcance::puedeVerSolicitud($user, $solicitud);
        }

        return false;
    }

    public function descargar(Solicitud $solicitud, string $archivo)
    {
        $user = auth('api')->user();
        if (! $user || ! self::puedeVer($user, $solicitud) || ! preg_match('/^'.self::PATRON_NOMBRE.'$/', $archivo)) {
            // 404 y no 403: no confirmar a un tercero que el archivo existe.
            return response()->json(['error' => 'Archivo no encontrado'], 404);
        }

        $ruta = self::rutaInterna($solicitud->id, $archivo);
        if (! Storage::disk('local')->exists($ruta)) {
            return response()->json(['error' => 'Archivo no encontrado'], 404);
        }

        $ext = strtolower(pathinfo($archivo, PATHINFO_EXTENSION));
        $enLinea = in_array($ext, ['pdf', 'jpg', 'png', 'webp'], true);
        $headers = [
            'Content-Type' => TiposArchivo::MIME_POR_EXTENSION[$ext] ?? 'application/octet-stream',
            'Cache-Control' => 'private, no-store, max-age=0',
            // Vista previa en <iframe> del propio sitio (solo PDF/imágenes). SecurityHeadersMiddleware respeta este
            // valor y ajusta la CSP a frame-ancestors 'self' solo para esta ruta.
            'X-Frame-Options' => $enLinea ? 'SAMEORIGIN' : 'DENY',
        ];

        return response()->file(Storage::disk('local')->path($ruta), $headers)
            ->setContentDisposition($enLinea ? 'inline' : 'attachment', "{$solicitud->folio}.{$ext}", "documento.{$ext}");
    }
}
