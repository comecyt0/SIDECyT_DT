<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use ZipArchive;

/**
 * E45 — Tipos de archivo configurables por campo (punto 6). El admin elige por campo cualquiera de estos tipos y un
 * tamaño de 1 a 20 MB. La validación mira el CONTENIDO (finfo + estructura interna), nunca el nombre ni el MIME que
 * declara el navegador, y devuelve la extensión con la que se guardará (derivada del tipo detectado).
 *
 *   pdf    → .pdf           (debe empezar con %PDF-)
 *   imagen → .jpg .png .webp (getimagesize debe leerla; nada de SVG: puede llevar scripts)
 *   office → .docx .xlsx    (ZIP OOXML con [Content_Types].xml; SIN macros: vbaProject.bin rechazado)
 *   zip    → .zip           (máx. 1000 entradas, 200 MB descomprimido, sin rutas absolutas ni `..`)
 */
class TiposArchivo
{
    public const TIPOS = ['pdf', 'imagen', 'office', 'zip'];

    public const TAMANO_MAX_MB = 20;

    public const ETIQUETAS = [
        'pdf' => 'PDF',
        'imagen' => 'Imagen (JPG, PNG o WebP)',
        'office' => 'Word o Excel (DOCX, XLSX)',
        'zip' => 'ZIP',
    ];

    /** Extensiones que puede tener un archivo guardado por el sistema. */
    public const EXTENSIONES = ['pdf', 'jpg', 'png', 'webp', 'docx', 'xlsx', 'zip'];

    public const MIME_POR_EXTENSION = [
        'pdf' => 'application/pdf',
        'jpg' => 'image/jpeg',
        'png' => 'image/png',
        'webp' => 'image/webp',
        'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'zip' => 'application/zip',
    ];

    /** Normaliza "PDF, imagen" / ["pdf"] a una lista válida; vacío → ['pdf']. */
    public static function normalizar(string|array|null $formatos): array
    {
        $lista = is_array($formatos) ? $formatos : explode(',', (string) $formatos);
        $lista = array_values(array_unique(array_filter(array_map(fn ($f) => strtolower(trim((string) $f)), $lista),
            fn ($f) => in_array($f, self::TIPOS, true))));

        return $lista ?: ['pdf'];
    }

    public static function limiteMb(int|string|null $mb): int
    {
        return max(1, min(self::TAMANO_MAX_MB, (int) ($mb ?: 5)));
    }

    /**
     * Valida el archivo contra los tipos permitidos y el tamaño. Devuelve la extensión con que se guardará.
     *
     * @throws ValidationException
     */
    public static function validar(UploadedFile $file, array $formatos, int $maxMb, string $campo = 'file'): string
    {
        $formatos = self::normalizar($formatos);
        $maxMb = self::limiteMb($maxMb);
        $falla = fn (string $m) => throw ValidationException::withMessages([$campo => $m]);

        if (! $file->isValid()) {
            $falla('No se pudo recibir el archivo. Intenta de nuevo.');
        }
        if ($file->getSize() > $maxMb * 1024 * 1024) {
            $falla("El archivo pesa más de {$maxMb} MB, el máximo para este documento.");
        }
        if ($file->getSize() === 0) {
            $falla('El archivo está vacío.');
        }

        // getPathname(), no getRealPath(): en este IIS realpath() del temporal devuelve false (E28).
        $ruta = $file->getPathname();
        $mime = (string) (new \finfo(FILEINFO_MIME_TYPE))->file($ruta);
        $inicio = (string) file_get_contents($ruta, false, null, 0, 8);

        $ext = null;
        if (in_array('pdf', $formatos, true) && $mime === 'application/pdf' && str_starts_with($inicio, '%PDF-')) {
            $ext = 'pdf';
        } elseif (in_array('imagen', $formatos, true) && in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)
            && @getimagesize($ruta) !== false) {
            $ext = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'][$mime];
        } elseif (str_starts_with($inicio, "PK\x03\x04")) {
            if (in_array('office', $formatos, true) && ($tipoOffice = self::tipoOffice($ruta))) {
                $ext = $tipoOffice;
            } elseif (in_array('zip', $formatos, true) && $mime === 'application/zip' && self::zipSeguro($ruta)) {
                $ext = 'zip';
            }
        }

        if ($ext === null) {
            $permitidos = implode(', ', array_map(fn ($f) => self::ETIQUETAS[$f], $formatos));
            $falla("Tipo de archivo no permitido para este documento. Se acepta: {$permitidos}.");
        }

        return $ext;
    }

    /** 'docx' | 'xlsx' | null. Rechaza documentos con macros (vbaProject.bin) aunque vengan con extensión x. */
    private static function tipoOffice(string $ruta): ?string
    {
        $zip = new ZipArchive;
        if ($zip->open($ruta, ZipArchive::RDONLY) !== true) {
            return null;
        }
        try {
            if ($zip->locateName('[Content_Types].xml') === false || $zip->numFiles > 5000) {
                return null;
            }
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $nombre = (string) $zip->getNameIndex($i);
                if (stripos($nombre, 'vbaProject.bin') !== false || stripos($nombre, 'activeX') !== false) {
                    return null; // macros / controles ActiveX
                }
            }
            if ($zip->locateName('word/document.xml') !== false) {
                return 'docx';
            }
            if ($zip->locateName('xl/workbook.xml') !== false) {
                return 'xlsx';
            }

            return null;
        } finally {
            $zip->close();
        }
    }

    /** ZIP genérico: límite de entradas y de tamaño descomprimido (zip bomb), sin rutas peligrosas. */
    private static function zipSeguro(string $ruta): bool
    {
        $zip = new ZipArchive;
        if ($zip->open($ruta, ZipArchive::RDONLY) !== true) {
            return false;
        }
        try {
            if ($zip->numFiles < 1 || $zip->numFiles > 1000) {
                return false;
            }
            $total = 0;
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $st = $zip->statIndex($i);
                if (! $st) {
                    return false;
                }
                $nombre = str_replace('\\', '/', (string) $st['name']);
                if (str_starts_with($nombre, '/') || preg_match('#(^|/)\.\.(/|$)#', $nombre) || preg_match('/^[A-Za-z]:/', $nombre)) {
                    return false;
                }
                $total += (int) $st['size'];
                if ($total > 200 * 1024 * 1024) {
                    return false;
                }
            }

            return true;
        } finally {
            $zip->close();
        }
    }
}
