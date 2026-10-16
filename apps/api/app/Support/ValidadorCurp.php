<?php

namespace App\Support;

/**
 * Validador algorítmico de la CURP (E76 en SIGAE, D83 en SICEI; 16/10/2026).
 *
 * El MISMO archivo vive en SIGAE (apps/api/app/Support) y en SICEI (api/app/Support); su espejo en el front es
 * `src/lib/curp.ts` de cada sistema. Si se cambia uno, se cambian los cuatro.
 *
 * Reconstruye con el instructivo de RENAPO las posiciones que salen de los datos de la persona y las compara:
 *   1–4   letras de primer apellido, segundo apellido y nombre (con palabras altisonantes → X en la 2.ª)
 *   5–10  fecha de nacimiento AAMMDD (la 17 dice el siglo: dígito = 1900, letra = 2000)
 *   14–16 primera consonante interna de cada parte
 *   18    dígito verificador
 * El sexo (11) y la entidad (12–13) no se piden: se leen de la CURP (decisión del usuario del 16/10/2026).
 * No consulta a RENAPO; eso lo hace `ServicioCurp` en SICEI cuando haya convenio.
 */
final class ValidadorCurp
{
    public const ENTIDADES = [
        'AS' => 'Aguascalientes', 'BC' => 'Baja California', 'BS' => 'Baja California Sur', 'CC' => 'Campeche',
        'CL' => 'Coahuila', 'CM' => 'Colima', 'CS' => 'Chiapas', 'CH' => 'Chihuahua', 'DF' => 'Ciudad de México',
        'DG' => 'Durango', 'GT' => 'Guanajuato', 'GR' => 'Guerrero', 'HG' => 'Hidalgo', 'JC' => 'Jalisco',
        'MC' => 'Estado de México', 'MN' => 'Michoacán', 'MS' => 'Morelos', 'NT' => 'Nayarit', 'NL' => 'Nuevo León',
        'OC' => 'Oaxaca', 'PL' => 'Puebla', 'QT' => 'Querétaro', 'QR' => 'Quintana Roo', 'SP' => 'San Luis Potosí',
        'SL' => 'Sinaloa', 'SR' => 'Sonora', 'TC' => 'Tabasco', 'TS' => 'Tamaulipas', 'TL' => 'Tlaxcala',
        'VZ' => 'Veracruz', 'YN' => 'Yucatán', 'ZS' => 'Zacatecas', 'NE' => 'Nacido en el extranjero',
    ];

    public const SEXOS = ['H' => 'Hombre', 'M' => 'Mujer', 'X' => 'No binario'];

    /** Formato completo: 4 letras, fecha, sexo, entidad válida, 3 consonantes, homoclave y dígito. */
    public const REGEX = '/^[A-Z][AEIOUX][A-Z]{2}\d{6}[HMX](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d$/';

    /** Partículas que RENAPO descarta de nombres y apellidos. */
    private const PARTICULAS = ['DA', 'DAS', 'DE', 'DEL', 'DER', 'DI', 'DIE', 'DD', 'EL', 'LA', 'LOS', 'LAS', 'LE', 'LES', 'MAC', 'MC', 'VAN', 'VON', 'Y'];

    /** Con dos o más nombres, si el primero es uno de estos se usa el segundo. */
    private const NOMBRES_COMUNES = ['MARIA', 'MA', 'JOSE', 'J'];

    /** Anexo 2 del instructivo: si las 4 letras forman una de estas, la 2.ª se cambia por X. */
    private const ALTISONANTES = [
        'BACA', 'BAKA', 'BUEI', 'BUEY', 'CACA', 'CACO', 'CAGA', 'CAGO', 'CAKA', 'CAKO', 'COGE', 'COGI', 'COJA', 'COJE',
        'COJI', 'COJO', 'COLA', 'CULO', 'FALO', 'FETO', 'GETA', 'GUEI', 'GUEY', 'JETA', 'JOTO', 'KACA', 'KACO', 'KAGA',
        'KAGO', 'KAKA', 'KAKO', 'KOGE', 'KOGI', 'KOJA', 'KOJE', 'KOJI', 'KOJO', 'KOLA', 'KULO', 'LILO', 'LOCA', 'LOCO',
        'LOKA', 'LOKO', 'MAME', 'MAMO', 'MEAR', 'MEAS', 'MEON', 'MIAR', 'MION', 'MOCO', 'MOKO', 'MULA', 'MULO', 'NACA',
        'NACO', 'PEDA', 'PEDO', 'PENE', 'PIPI', 'PITO', 'POPO', 'PUTA', 'PUTO', 'QULO', 'RATA', 'ROBA', 'ROBE', 'ROBO',
        'RUIN', 'SENO', 'TETA', 'VACA', 'VAGA', 'VAGO', 'VAKA', 'VUEI', 'VUEY', 'WUEI', 'WUEY',
    ];

    private const DICCIONARIO = '0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';

    public static function formatoValido(string $curp): bool
    {
        return preg_match(self::REGEX, $curp) === 1;
    }

    /**
     * Lo que dice la CURP por sí sola: sexo, entidad y fecha. null si el formato no es válido.
     *
     * @return array{sexo: string, sexo_nombre: string, entidad: string, entidad_nombre: string, fecha: ?string}|null
     */
    public static function datos(string $curp): ?array
    {
        $curp = strtoupper(trim($curp));
        if (! self::formatoValido($curp)) {
            return null;
        }

        return [
            'sexo' => $curp[10],
            'sexo_nombre' => self::SEXOS[$curp[10]],
            'entidad' => substr($curp, 11, 2),
            'entidad_nombre' => self::ENTIDADES[substr($curp, 11, 2)],
            'fecha' => self::fecha($curp),
        ];
    }

    /** Fecha de nacimiento AAAA-MM-DD que trae la CURP, o null si no es una fecha real. */
    public static function fecha(string $curp): ?string
    {
        $aa = (int) substr($curp, 4, 2);
        $mm = (int) substr($curp, 6, 2);
        $dd = (int) substr($curp, 8, 2);
        $anio = (ctype_digit($curp[16]) ? 1900 : 2000) + $aa;

        return checkdate($mm, $dd, $anio) ? sprintf('%04d-%02d-%02d', $anio, $mm, $dd) : null;
    }

    public static function digitoVerificador(string $curp17): int
    {
        $suma = 0;
        $chars = mb_str_split(mb_substr($curp17, 0, 17));
        foreach ($chars as $i => $c) {
            $suma += max(0, (int) mb_strpos(self::DICCIONARIO, $c)) * (18 - $i);
        }

        return (10 - $suma % 10) % 10;
    }

    /** Las 4 letras iniciales y las 3 consonantes internas que corresponden a esa persona. */
    public static function esperado(string $nombres, string $primerApellido, ?string $segundoApellido): array
    {
        $p1 = self::palabra($primerApellido, false);
        $p2 = self::palabra((string) $segundoApellido, false);
        $n = self::palabra($nombres, true);

        $letras = self::inicial($p1).self::vocalInterna($p1).self::inicial($p2).self::inicial($n);
        if (in_array($letras, self::ALTISONANTES, true)) {
            $letras = $letras[0].'X'.substr($letras, 2);
        }

        return [
            'letras' => $letras,
            'consonantes' => self::consonanteInterna($p1).self::consonanteInterna($p2).self::consonanteInterna($n),
        ];
    }

    /**
     * Compara la CURP con los datos de la persona. Devuelve los problemas encontrados (vacío = coincide).
     *
     * @return array<string, string> clave del problema => mensaje para la persona
     */
    public static function comparar(string $curp, string $nombres, string $primerApellido, ?string $segundoApellido, string $fechaNacimiento): array
    {
        $curp = strtoupper(trim($curp));
        if (! self::formatoValido($curp)) {
            return ['formato' => 'La CURP no tiene un formato válido. Son 18 caracteres: 4 letras, 6 números de tu fecha de nacimiento, sexo, estado y 5 caracteres más.'];
        }

        $problemas = [];
        if ((int) $curp[17] !== self::digitoVerificador($curp)) {
            $problemas['verificador'] = 'El último dígito de la CURP no corresponde con los anteriores. Revisa que esté bien escrita.';
        }

        $esperado = self::esperado($nombres, $primerApellido, $segundoApellido);
        if (substr($curp, 0, 4) !== $esperado['letras']) {
            $problemas['letras'] = sprintf('Las primeras 4 letras de la CURP (%s) no corresponden a tu nombre y apellidos; deberían ser %s.', substr($curp, 0, 4), $esperado['letras']);
        }

        $fechaCurp = self::fecha($curp);
        if ($fechaCurp !== $fechaNacimiento) {
            $problemas['fecha'] = $fechaCurp === null
                ? 'La fecha dentro de la CURP no es una fecha real. Revisa los números 5 a 10.'
                : sprintf('La fecha de la CURP (%s) no es tu fecha de nacimiento.', date('d/m/Y', strtotime($fechaCurp)));
        }

        if (substr($curp, 13, 3) !== $esperado['consonantes']) {
            $problemas['consonantes'] = sprintf('Las letras 14 a 16 de la CURP (%s) no corresponden a tu nombre y apellidos; deberían ser %s.', substr($curp, 13, 3), $esperado['consonantes']);
        }

        return $problemas;
    }

    /** La palabra que usa RENAPO: sin acentos, sin partículas y, en nombres, saltando María o José si hay otro. */
    private static function palabra(string $texto, bool $esNombre): string
    {
        $texto = strtr(mb_strtoupper(trim($texto), 'UTF-8'), [
            'Á' => 'A', 'É' => 'E', 'Í' => 'I', 'Ó' => 'O', 'Ú' => 'U', 'Ü' => 'U', 'À' => 'A', 'È' => 'E', 'Ì' => 'I',
            'Ò' => 'O', 'Ù' => 'U', 'Â' => 'A', 'Ê' => 'E', 'Î' => 'I', 'Ô' => 'O', 'Û' => 'U', 'Ä' => 'A', 'Ë' => 'E',
            'Ï' => 'I', 'Ö' => 'O', 'Ç' => 'C',
        ]);
        $texto = preg_replace(["/['’.]/u", '/[^A-ZÑ]+/u'], ['', ' '], $texto);
        $palabras = array_values(array_filter(
            explode(' ', trim((string) $texto)),
            fn ($p) => $p !== '' && ! in_array($p, self::PARTICULAS, true),
        ));

        if ($esNombre && count($palabras) > 1 && in_array($palabras[0], self::NOMBRES_COMUNES, true)) {
            return $palabras[1];
        }

        return $palabras[0] ?? '';
    }

    private static function inicial(string $p): string
    {
        $c = mb_substr($p, 0, 1);

        return ($c === '' || $c === 'Ñ') ? 'X' : $c;
    }

    private static function vocalInterna(string $p): string
    {
        return preg_match('/[AEIOU]/u', mb_substr($p, 1), $m) ? $m[0] : 'X';
    }

    private static function consonanteInterna(string $p): string
    {
        if (! preg_match('/[B-DF-HJ-NP-TV-ZÑ]/u', mb_substr($p, 1), $m)) {
            return 'X';
        }

        return $m[0] === 'Ñ' ? 'X' : $m[0];
    }
}
