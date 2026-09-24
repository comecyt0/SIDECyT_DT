<?php

namespace App\Http\Controllers;

use App\Models\AsignacionEvaluador;
use App\Models\Solicitud;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Archivos de las solicitudes en almacenamiento PRIVADO (SEGURIDAD, 24/09/2026).
 *
 * Antes: los documentos (carátula bancaria, constancia fiscal, facturas, informe final, anexos del programa) se
 * guardaban en el disco `public` como `/storage/documentos/{id}/{folio}_{tipo}_{time}.pdf`. IIS los servía como
 * estáticos SIN sesión y todas las partes del nombre se podían adivinar. Ahora:
 *  - se guardan en el disco `local` (storage/app/private), fuera de la carpeta web;
 *  - con nombre aleatorio de 40 caracteres y extensión fija `.pdf`;
 *  - solo se descargan por `GET /api/archivos/solicitudes/{solicitud}/{archivo}`, con sesión y permiso.
 * En la base se guarda esa URL relativa, así que las vistas siguen usando el mismo campo (`url`, `*_url`).
 */
class ArchivoSolicitudController extends Controller
{
    /** Nombre de archivo válido: exactamente el que genera guardar(). Cierra la puerta a `../`. */
    public const PATRON_NOMBRE = '[A-Za-z0-9]{40}\.pdf';

    /**
     * Guarda un PDF ya validado y devuelve la URL de descarga autenticada.
     * getPathname() + Storage::put(): en este IIS getRealPath() devuelve false (E28), y putFileAs() lo usa.
     */
    public static function guardar(UploadedFile $file, Solicitud $solicitud): string
    {
        $nombre = Str::random(40).'.pdf';
        Storage::disk('local')->put(self::rutaInterna($solicitud->id, $nombre), file_get_contents($file->getPathname()));

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
        $rol = (int) $user->rol_id;
        if ($rol === (int) config('comecyt.roles.admin') || $rol === (int) config('comecyt.roles.revisor')) {
            return true;
        }
        if ($rol === (int) config('comecyt.roles.solicitante')) {
            return (int) $solicitud->user_id === (int) $user->id;
        }
        if ($rol === (int) config('comecyt.roles.evaluador')) {
            return AsignacionEvaluador::where('solicitud_id', $solicitud->id)
                ->where('evaluador_id', $user->id)
                ->exists();
        }

        return false;
    }

    public function descargar(Solicitud $solicitud, string $archivo)
    {
        $user = auth('api')->user();
        if (! $user || ! self::puedeVer($user, $solicitud)) {
            // 404 y no 403: no confirmar a un tercero que el archivo existe.
            return response()->json(['error' => 'Archivo no encontrado'], 404);
        }
        if (! preg_match('/^'.self::PATRON_NOMBRE.'$/', $archivo)) {
            return response()->json(['error' => 'Archivo no encontrado'], 404);
        }

        $ruta = self::rutaInterna($solicitud->id, $archivo);
        if (! Storage::disk('local')->exists($ruta)) {
            return response()->json(['error' => 'Archivo no encontrado'], 404);
        }

        $headers = [
            'Content-Type' => 'application/pdf',
            'Cache-Control' => 'private, no-store, max-age=0',
            // Vista previa en <iframe> del propio sitio (DocumentosAdjuntos). SecurityHeadersMiddleware respeta
            // este valor y ajusta la CSP a frame-ancestors 'self' solo para esta respuesta.
            'X-Frame-Options' => 'SAMEORIGIN',
        ];

        return response()->file(Storage::disk('local')->path($ruta), $headers)
            ->setContentDisposition('inline', "{$solicitud->folio}.pdf", 'documento.pdf')
            ->setStatusCode(Response::HTTP_OK);
    }
}
