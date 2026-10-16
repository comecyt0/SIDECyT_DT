<?php

namespace App\Support;

/**
 * Nombres y apellidos con mayúscula inicial y el resto en minúscula (E76 / D83, 16/10/2026), para que la base quede
 * uniforme: «MARÍA DE LA LUZ» → «María de la Luz», «del valle» → «del Valle», «ruiz-esparza» → «Ruiz-Esparza».
 * Las partículas (de, del, la, los, y…) van en minúscula salvo que sean la última palabra o abran el nombre.
 *
 * MISMO archivo en SIGAE y SICEI; espejo en `src/lib/curp.ts` (`nombrePropio`).
 */
final class NombrePropio
{
    /** Letras (con acentos, ñ y ü), espacios, guion, apóstrofo y punto; sin números ni otros símbolos. */
    public const REGEX = "/^\\p{L}[\\p{L}\\p{M} '’.\\-]*$/u";

    public const MAX = 60;

    private const PARTICULAS = ['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'das', 'do', 'dos', 'di', 'der', 'van', 'von'];

    public static function formatear(?string $texto, bool $esNombre = false): string
    {
        $texto = trim(preg_replace('/\s+/u', ' ', (string) $texto));
        if ($texto === '') {
            return '';
        }

        $palabras = explode(' ', mb_strtolower($texto, 'UTF-8'));
        $ultima = count($palabras) - 1;
        foreach ($palabras as $i => $p) {
            $esParticula = in_array($p, self::PARTICULAS, true) && $i < $ultima && ! ($esNombre && $i === 0);
            $palabras[$i] = $esParticula ? $p : self::capitalizar($p);
        }

        return implode(' ', $palabras);
    }

    /** Nombre completo para la columna `name`: «Nombres Primer Segundo». */
    public static function completo(string $nombres, string $primerApellido, ?string $segundoApellido): string
    {
        return trim(implode(' ', array_filter([$nombres, $primerApellido, (string) $segundoApellido], fn ($p) => $p !== '')));
    }

    /** Mayúscula al inicio y después de guion («Ruiz-Esparza») o de un apóstrofo tras una letra («O'Connor»). */
    private static function capitalizar(string $palabra): string
    {
        return preg_replace_callback(
            "/(^|-|(?<=^\\p{L})['’])(\\p{L})/u",
            fn ($m) => $m[1].mb_strtoupper($m[2], 'UTF-8'),
            $palabra,
        );
    }
}
