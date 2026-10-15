<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Toda imagen que sube una persona pasa por aquí (E52; regla general desde el 15/10/2026, E74): se valida el contenido
 * real (JPG/PNG/WebP), se limita en píxeles ANTES de decodificar, se endereza según la orientación EXIF (las fotos de
 * teléfono vienen giradas) y se RE-CODIFICA a WebP con GD. GD nunca escribe metadatos: el archivo guardado no lleva EXIF,
 * GPS, modelo de cámara, XMP, ICC ni cualquier carga oculta que trajera el original.
 */
class ImagenSegura
{
    public const MAX_MB = 5;
    public const MAX_PIXELES = 40_000_000;
    public const PATRON = '/^[A-Za-z0-9]{40}\.webp$/';
    public const MIMES = ['image/jpeg', 'image/png', 'image/webp'];

    /**
     * Valida y decodifica la imagen, ya enderezada. Lanza ValidationException con mensajes en español.
     *
     * @return array{0: \GdImage, 1: int, 2: int} imagen truecolor con alfa, ancho y alto (ya orientados)
     */
    public static function abrir(string $ruta, string $campo = 'imagen', int $minW = 1, int $minH = 1, ?string $msgMin = null): array
    {
        $falla = fn (string $m) => throw ValidationException::withMessages([$campo => $m]);
        $mime = (string) (new \finfo(FILEINFO_MIME_TYPE))->file($ruta);
        if (! in_array($mime, self::MIMES, true)) {
            $falla('La imagen debe ser JPG, PNG o WebP.');
        }
        $info = @getimagesize($ruta);
        if (! $info) {
            $falla('No se pudo leer la imagen.');
        }
        if ($info[0] * $info[1] > self::MAX_PIXELES) {
            $falla('La imagen es demasiado grande en píxeles.');
        }
        $img = @imagecreatefromstring((string) file_get_contents($ruta));
        if (! $img) {
            $falla('No se pudo procesar la imagen.');
        }
        if (! imageistruecolor($img)) {
            imagepalettetotruecolor($img); // imagewebp no acepta imágenes de paleta (PNG de 8 bits)
        }
        if ($mime === 'image/jpeg') {
            $img = self::enderezar($img, $ruta);
        }
        imagealphablending($img, false);
        imagesavealpha($img, true);
        $w = imagesx($img);
        $h = imagesy($img);
        if ($w < $minW || $h < $minH) {
            imagedestroy($img);
            $falla($msgMin ?? "La imagen debe medir al menos {$minW} × {$minH} px.");
        }

        return [$img, $w, $h];
    }

    /** Aplica la orientación EXIF (1–8) para que la imagen se vea igual que en el teléfono al quitarle los metadatos. */
    private static function enderezar(\GdImage $img, string $ruta): \GdImage
    {
        if (! function_exists('exif_read_data')) {
            return $img;
        }
        $exif = @exif_read_data($ruta);
        $o = is_array($exif) ? (int) ($exif['Orientation'] ?? 1) : 1;
        $girar = fn (int $grados) => imagerotate($img, $grados, 0) ?: $img;
        $nueva = match ($o) {
            2 => imageflip($img, IMG_FLIP_HORIZONTAL) ? $img : $img,
            3 => $girar(180),
            4 => imageflip($img, IMG_FLIP_VERTICAL) ? $img : $img,
            5, 6 => $girar(-90),
            7, 8 => $girar(90),
            default => $img,
        };
        if ($o === 5 || $o === 7) {
            imageflip($nueva, IMG_FLIP_HORIZONTAL);
        }
        if ($nueva !== $img) {
            imagedestroy($img);
        }

        return $nueva;
    }

    /** Codifica a WebP (sin metadatos) y libera la imagen. */
    public static function codificar(\GdImage $img, int $calidad = 82, string $campo = 'imagen'): string
    {
        imagealphablending($img, false);
        imagesavealpha($img, true);
        ob_start();
        imagewebp($img, null, $calidad);
        $webp = (string) ob_get_clean();
        imagedestroy($img);
        if ($webp === '') {
            throw ValidationException::withMessages([$campo => 'No se pudo convertir la imagen.']);
        }

        return $webp;
    }

    /** Lienzo truecolor transparente de las medidas dadas. */
    public static function lienzo(int $w, int $h): \GdImage
    {
        $l = imagecreatetruecolor($w, $h);
        imagealphablending($l, false);
        imagesavealpha($l, true);
        imagefill($l, 0, 0, imagecolorallocatealpha($l, 0, 0, 0, 127));

        return $l;
    }

    /** Recorte centrado a la proporción destino ("cover"). Libera el original. */
    public static function cubrir(\GdImage $img, int $destinoW, int $destinoH): \GdImage
    {
        $w = imagesx($img);
        $h = imagesy($img);
        $escala = max($destinoW / $w, $destinoH / $h);
        $cropW = (int) round($destinoW / $escala);
        $cropH = (int) round($destinoH / $escala);
        $lienzo = self::lienzo($destinoW, $destinoH);
        imagecopyresampled($lienzo, $img, 0, 0, (int) max(0, ($w - $cropW) / 2), (int) max(0, ($h - $cropH) / 2), $destinoW, $destinoH, $cropW, $cropH);
        imagedestroy($img);

        return $lienzo;
    }

    /** Reduce (nunca amplía) para que el lado mayor no pase de $maxLado, conservando la proporción. */
    public static function limitar(\GdImage $img, int $maxLado): \GdImage
    {
        $w = imagesx($img);
        $h = imagesy($img);
        if (max($w, $h) <= $maxLado) {
            return $img;
        }
        $f = $maxLado / max($w, $h);
        $nw = max(1, (int) round($w * $f));
        $nh = max(1, (int) round($h * $f));
        $lienzo = self::lienzo($nw, $nh);
        imagecopyresampled($lienzo, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
        imagedestroy($img);

        return $lienzo;
    }

    /**
     * Imagen completa (sin recorte) a WebP sin metadatos, con el lado mayor limitado. Para documentos, carrusel y
     * banners. Devuelve los bytes del WebP.
     */
    public static function aWebp(UploadedFile|string $archivo, int $maxLado = 2400, int $calidad = 82, string $campo = 'imagen'): string
    {
        $ruta = $archivo instanceof UploadedFile ? $archivo->getPathname() : $archivo; // nunca getRealPath() (E28)
        [$img] = self::abrir($ruta, $campo);

        return self::codificar(self::limitar($img, $maxLado), $calidad, $campo);
    }

    /** @return string nombre interno (40 alfanuméricos + .webp) */
    public static function guardarCuadrada(UploadedFile $file, string $dir, int $lado = 512, string $campo = 'imagen'): string
    {
        if (! $file->isValid()) {
            throw ValidationException::withMessages([$campo => 'No se pudo recibir la imagen.']);
        }
        if ($file->getSize() > self::MAX_MB * 1024 * 1024) {
            throw ValidationException::withMessages([$campo => 'La imagen no puede pesar más de '.self::MAX_MB.' MB.']);
        }
        [$img] = self::abrir($file->getPathname(), $campo, 80, 80, 'La imagen debe medir al menos 80 × 80 px.');
        $webp = self::codificar(self::cubrir($img, $lado, $lado), 82, $campo);
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
