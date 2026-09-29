<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * E52 — Imagen subida por un usuario (logo de club, foto de integrante): se valida el contenido real (JPG/PNG/WebP), se
 * limita en píxeles antes de decodificar y se RE-CODIFICA a WebP cuadrado (elimina EXIF y cualquier carga oculta), igual
 * que las fotos de perfil (E45). Se guarda con nombre aleatorio en el disco privado; se sirve solo con sesión.
 */
class ImagenSegura
{
    public const MAX_MB = 5;
    public const MAX_PIXELES = 40_000_000;
    public const PATRON = '/^[A-Za-z0-9]{40}\.webp$/';

    /** @return string nombre interno (40 alfanuméricos + .webp) */
    public static function guardarCuadrada(UploadedFile $file, string $dir, int $lado = 512, string $campo = 'imagen'): string
    {
        $falla = fn (string $m) => throw ValidationException::withMessages([$campo => $m]);
        if (! $file->isValid()) {
            $falla('No se pudo recibir la imagen.');
        }
        if ($file->getSize() > self::MAX_MB * 1024 * 1024) {
            $falla('La imagen no puede pesar más de '.self::MAX_MB.' MB.');
        }
        $ruta = $file->getPathname(); // nunca getRealPath() en este IIS (E28)
        $mime = (string) (new \finfo(FILEINFO_MIME_TYPE))->file($ruta);
        if (! in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
            $falla('La imagen debe ser JPG, PNG o WebP.');
        }
        $info = @getimagesize($ruta);
        if (! $info) {
            $falla('No se pudo leer la imagen.');
        }
        [$w, $h] = $info;
        if ($w * $h > self::MAX_PIXELES) {
            $falla('La imagen es demasiado grande en píxeles.');
        }
        if ($w < 80 || $h < 80) {
            $falla('La imagen debe medir al menos 80 × 80 px.');
        }
        $origen = @imagecreatefromstring((string) file_get_contents($ruta));
        if (! $origen) {
            $falla('No se pudo procesar la imagen.');
        }
        // Recorte centrado a cuadrado ("cover") y re-codificación a WebP.
        $corte = min($w, $h);
        $lienzo = imagecreatetruecolor($lado, $lado);
        imagealphablending($lienzo, false);
        imagesavealpha($lienzo, true);
        imagecopyresampled($lienzo, $origen, 0, 0, (int) (($w - $corte) / 2), (int) (($h - $corte) / 2), $lado, $lado, $corte, $corte);
        ob_start();
        imagewebp($lienzo, null, 82);
        $webp = (string) ob_get_clean();
        imagedestroy($origen);
        imagedestroy($lienzo);
        if ($webp === '') {
            $falla('No se pudo convertir la imagen.');
        }
        $nombre = Str::random(40).'.webp';
        Storage::disk('local')->put(trim($dir, '/').'/'.$nombre, $webp);

        return $nombre;
    }

    public static function borrar(string $dir, ?string $nombre): void
    {
        if ($nombre && preg_match(self::PATRON, $nombre)) {
            Storage::disk('local')->delete(trim($dir, '/').'/'.$nombre);
        }
    }
}
