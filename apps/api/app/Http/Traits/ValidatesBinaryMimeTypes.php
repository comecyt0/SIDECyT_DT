<?php

namespace App\Http\Traits;

use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Validator;

/**
 * Trait para validar tipos MIME binarios (no solo extensión)
 *
 * Previene ataques de seguridad donde un archivo malicioso
 * es renombrado con extensión de un archivo seguro (ej: malware.exe -> malware.pdf)
 *
 * Uso:
 *   $this->validateBinaryMimeType($filePath);
 *   $this->validateBinaryMimeType($filePath, ['application/pdf', 'image/jpeg']);
 */
trait ValidatesBinaryMimeTypes
{
    /**
     * Valida que el contenido REAL del archivo coincida con el MIME type esperado
     * Utiliza finfo_file para detectar MIME type real, ignorando extensión
     *
     * @param  string  $filePath  Ruta completa al archivo
     * @param  array  $allowedMimes  MIME types permitidos (default: ['application/pdf'])
     * @return string MIME type detectado
     *
     * @throws ValidationException si MIME type no coincide
     */
    protected function validateBinaryMimeType(string $filePath, array $allowedMimes = ['application/pdf']): string
    {
        // Validar que el archivo existe
        if (! file_exists($filePath)) {
            throw new ValidationException(
                Validator::make([], [])
                    ->errors()
                    ->add('file', 'El archivo no existe o no pudo ser procesado.')
            );
        }

        // Abrir finfo para detectar MIME real
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if (! $finfo) {
            throw new ValidationException(
                Validator::make([], [])
                    ->errors()
                    ->add('file', 'No se pudo validar el archivo en el servidor.')
            );
        }

        $actualMimeType = finfo_file($finfo, $filePath);
        finfo_close($finfo);

        // Validar que MIME está en lista de permitidos
        if (! in_array($actualMimeType, $allowedMimes)) {
            throw new ValidationException(
                Validator::make([], [])
                    ->errors()
                    ->add('file', "El archivo no es válido. Se detectó tipo: {$actualMimeType}, pero se esperaba: ".implode(', ', $allowedMimes))
            );
        }

        return $actualMimeType;
    }
}
