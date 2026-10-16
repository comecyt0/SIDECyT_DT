<?php

namespace App\Support;

use Illuminate\Validation\ValidationException;

/**
 * Identidad de una persona verificada contra su CURP (E76 en SIGAE, D83 en SICEI; 16/10/2026).
 *
 * Decisiones del usuario: nombre(s) + primer apellido + segundo apellido (opcional) + fecha de nacimiento; nombres con
 * mayúscula inicial; sexo y entidad se LEEN de la CURP (no se piden); si la CURP no coincide se bloquea, salvo que la
 * persona confirme que es correcta y pida revisión manual (`curp_revision`). Formato o dígito verificador mal escritos
 * nunca van a revisión: casi siempre son un error al teclear.
 *
 * MISMO archivo en SIGAE y SICEI. Usa `ValidadorCurp` y `NombrePropio`.
 */
final class IdentidadCurp
{
    /** Estados de `curp_verificacion`; null = cuenta anterior al validador (no se verificó). */
    public const COINCIDE = 'coincide';
    public const REVISION = 'revision';
    public const APROBADA = 'aprobada';
    public const RECHAZADA = 'rechazada';

    /** Problemas que la persona debe corregir: no se pueden mandar a revisión. */
    private const NO_REVISABLES = ['formato', 'verificador'];

    /** Reglas de los campos de identidad (la CURP la valida cada controlador con su regla de unicidad). */
    public static function reglas(bool $obligatorio = true, string $prefijo = ''): array
    {
        $r = $obligatorio ? 'required' : 'nullable';
        $nombre = ['string', 'max:'.NombrePropio::MAX, 'regex:'.NombrePropio::REGEX];

        return [
            $prefijo.'nombres' => [$r, ...$nombre],
            $prefijo.'primer_apellido' => [$r, ...$nombre],
            $prefijo.'segundo_apellido' => ['nullable', ...$nombre],
            $prefijo.'fecha_nacimiento' => [$r, 'date_format:Y-m-d', 'before:today', 'after:1900-01-01'],
            $prefijo.'curp_revision' => ['sometimes', 'boolean'],
        ];
    }

    public static function mensajes(string $prefijo = ''): array
    {
        return [
            $prefijo.'nombres.required' => 'Escribe tu nombre o nombres.',
            $prefijo.'nombres.regex' => 'El nombre solo puede llevar letras, espacios, guion o apóstrofo; sin números.',
            $prefijo.'nombres.max' => 'El nombre admite hasta '.NombrePropio::MAX.' caracteres.',
            $prefijo.'primer_apellido.required' => 'Escribe tu primer apellido.',
            $prefijo.'primer_apellido.regex' => 'El primer apellido solo puede llevar letras, espacios, guion o apóstrofo; sin números.',
            $prefijo.'primer_apellido.max' => 'El primer apellido admite hasta '.NombrePropio::MAX.' caracteres.',
            $prefijo.'segundo_apellido.regex' => 'El segundo apellido solo puede llevar letras, espacios, guion o apóstrofo; sin números.',
            $prefijo.'segundo_apellido.max' => 'El segundo apellido admite hasta '.NombrePropio::MAX.' caracteres.',
            $prefijo.'fecha_nacimiento.required' => 'Escribe tu fecha de nacimiento.',
            $prefijo.'fecha_nacimiento.date_format' => 'La fecha de nacimiento no es válida.',
            $prefijo.'fecha_nacimiento.before' => 'La fecha de nacimiento debe ser anterior a hoy.',
            $prefijo.'fecha_nacimiento.after' => 'La fecha de nacimiento no es válida.',
            $prefijo.'curp.required' => 'Escribe tu CURP.',
            $prefijo.'curp.size' => 'La CURP debe tener 18 caracteres.',
            $prefijo.'curp.regex' => 'La CURP no tiene un formato válido.',
        ];
    }

    /** Nombres con mayúscula inicial y CURP en mayúsculas, antes de validar o guardar. */
    public static function normalizar(array $d): array
    {
        foreach (['nombres' => true, 'primer_apellido' => false, 'segundo_apellido' => false] as $campo => $esNombre) {
            if (array_key_exists($campo, $d)) {
                $d[$campo] = NombrePropio::formatear(is_string($d[$campo]) ? $d[$campo] : null, $esNombre) ?: null;
            }
        }
        if (array_key_exists('curp', $d) && is_string($d['curp'])) {
            $d['curp'] = strtoupper(preg_replace('/\s+/', '', $d['curp']));
        }

        return $d;
    }

    /**
     * Compara la CURP con los datos ya validados. Coincide → [COINCIDE, null]. No coincide: con `curp_revision` →
     * [REVISION, problemas]; sin ella, o si el problema no es revisable → 422 con cada problema bajo `curp`.
     *
     * @return array{0: string, 1: array<string,string>|null}
     */
    public static function verificar(array $d, string $campoCurp = 'curp'): array
    {
        $problemas = ValidadorCurp::comparar(
            (string) ($d['curp'] ?? ''), (string) ($d['nombres'] ?? ''), (string) ($d['primer_apellido'] ?? ''),
            $d['segundo_apellido'] ?? null, (string) ($d['fecha_nacimiento'] ?? ''),
        );
        if ($problemas === []) {
            return [self::COINCIDE, null];
        }

        $revisable = array_diff_key($problemas, array_flip(self::NO_REVISABLES)) === $problemas;
        if (! $revisable || empty($d['curp_revision'])) {
            throw ValidationException::withMessages([$campoCurp => array_values($problemas)]);
        }

        return [self::REVISION, $problemas];
    }

    /** Columnas para guardar: partes del nombre, `name` completo, fecha, sexo y entidad de la CURP y el estado. */
    public static function columnas(array $d, string $estado, ?array $problemas, bool $conName = true): array
    {
        $curp = (string) $d['curp'];
        $cols = [
            'nombres' => $d['nombres'],
            'primer_apellido' => $d['primer_apellido'],
            'segundo_apellido' => $d['segundo_apellido'] ?? null,
            'fecha_nacimiento' => $d['fecha_nacimiento'],
            'curp' => $curp,
            'sexo' => $curp[10],
            'entidad_nacimiento' => substr($curp, 11, 2),
            'curp_verificacion' => $estado,
            'curp_problemas' => $problemas ? array_values($problemas) : null,
        ];
        if ($conName) {
            $cols['name'] = NombrePropio::completo($d['nombres'], $d['primer_apellido'], $d['segundo_apellido'] ?? null);
        }

        return $cols;
    }

    /** Etiqueta del estado para pantallas de admin. */
    public static function etiqueta(?string $estado): ?string
    {
        return match ($estado) {
            self::COINCIDE => 'CURP verificada',
            self::REVISION => 'CURP en revisión',
            self::APROBADA => 'CURP aprobada por revisión',
            self::RECHAZADA => 'CURP rechazada',
            default => null,
        };
    }
}
