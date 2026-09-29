<?php

namespace App\Support;

use App\Models\Convocatoria;
use App\Models\EspecieConfig;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * E52 · Apoyo en especie — reglas de la modalidad (docs/APOYO_EN_ESPECIE.md §11).
 *
 * Campos FIJOS (siempre obligatorios, decisión del usuario): nombre del club, escuela y nombre de cada integrante.
 * Campos PREDEFINIDOS configurables por convocatoria (pedir / obligatorio) y campos PERSONALIZADOS (especie_campos).
 * El líder del club cuenta como integrante (entra al mínimo y máximo).
 */
class Especie
{
    public const TIPO_APOYO = 'especie';
    public const DIR_MEDIA = 'clubes';
    public const DIR_DOCS = 'clubes_docs';
    public const CARTA_ESCUELA = 'carta_escuela';

    /** Predefinidos del club. */
    public const CAMPOS_CLUB = [
        'logo' => 'Logo o foto del club',
        'descripcion' => 'Descripción del proyecto del club',
    ];

    /** Predefinidos del integrante. */
    public const CAMPOS_INTEGRANTE = [
        'foto' => 'Foto',
        'fecha_nacimiento' => 'Fecha de nacimiento',
        'sexo' => 'Sexo',
        'curp' => 'CURP',
        'grado_grupo' => 'Grado y grupo',
        'correo' => 'Correo',
        'telefono' => 'Teléfono',
    ];

    public const DEFAULT_CLUB = ['logo' => ['pedir' => true, 'obligatorio' => false], 'descripcion' => ['pedir' => true, 'obligatorio' => false]];
    public const DEFAULT_INTEGRANTE = [
        'foto' => ['pedir' => true, 'obligatorio' => false],
        'fecha_nacimiento' => ['pedir' => true, 'obligatorio' => true],
        'sexo' => ['pedir' => false, 'obligatorio' => false],
        'curp' => ['pedir' => false, 'obligatorio' => false],
        'grado_grupo' => ['pedir' => true, 'obligatorio' => false],
        'correo' => ['pedir' => false, 'obligatorio' => false],
        'telefono' => ['pedir' => false, 'obligatorio' => false],
    ];

    public const TIPOS_CAMPO = ['text', 'number', 'textarea', 'date', 'select'];

    public static function esEspecie(?Convocatoria $c): bool
    {
        return $c !== null && ($c->tipoPrograma?->tipo_apoyo === self::TIPO_APOYO);
    }

    /** Normaliza {clave: {pedir, obligatorio}}: solo claves conocidas; obligatorio implica pedir. */
    public static function normalizarPredefinidos(?array $entrada, array $catalogo, array $defecto): array
    {
        $out = [];
        foreach (array_keys($catalogo) as $clave) {
            $v = is_array($entrada[$clave] ?? null) ? $entrada[$clave] : ($defecto[$clave] ?? ['pedir' => false, 'obligatorio' => false]);
            $obl = filter_var($v['obligatorio'] ?? false, FILTER_VALIDATE_BOOLEAN);
            $pedir = $obl || filter_var($v['pedir'] ?? false, FILTER_VALIDATE_BOOLEAN);
            $out[$clave] = ['pedir' => $pedir, 'obligatorio' => $obl];
        }

        return $out;
    }

    public static function camposClub(EspecieConfig $cfg): array
    {
        return self::normalizarPredefinidos($cfg->campos_club, self::CAMPOS_CLUB, self::DEFAULT_CLUB);
    }

    public static function camposIntegrante(EspecieConfig $cfg): array
    {
        return self::normalizarPredefinidos($cfg->campos_integrante, self::CAMPOS_INTEGRANTE, self::DEFAULT_INTEGRANTE);
    }

    /** Reglas de validación de los datos de un integrante (sin foto: se sube aparte). */
    public static function reglasIntegrante(EspecieConfig $cfg, bool $paraEnvio = false): array
    {
        $c = self::camposIntegrante($cfg);
        $req = fn (string $k) => ($paraEnvio && $c[$k]['obligatorio']) ? 'required' : 'nullable';

        return [
            'nombre' => 'required|string|min:3|max:255',
            'fecha_nacimiento' => [$req('fecha_nacimiento'), 'date', 'before:today', 'after:1900-01-01'],
            'sexo' => [$req('sexo'), 'in:H,M,X'],
            'curp' => [$req('curp'), 'string', 'size:18', 'regex:'.RegistroRoles::PATRON_CURP],
            'grado_grupo' => [$req('grado_grupo'), 'string', 'max:30'],
            'correo' => [$req('correo'), 'email', 'max:255'],
            'telefono' => [$req('telefono'), 'string', 'regex:/^\d{10}$/'],
            'datos' => 'nullable|array',
        ];
    }

    /**
     * Valida y normaliza los valores de campos personalizados de un ámbito. Solo se guardan claves de campos existentes;
     * con $paraEnvio exige los obligatorios. Lanza ValidationException con la clave `datos.<campo>`.
     */
    public static function validarPersonalizados(Collection $campos, ?array $valores, bool $paraEnvio, string $prefijo = 'datos'): array
    {
        $valores = is_array($valores) ? $valores : [];
        $out = [];
        $errores = [];
        foreach ($campos as $campo) {
            $k = $campo->nombre_campo;
            $v = $valores[$k] ?? null;
            $v = is_string($v) ? trim($v) : $v;
            if ($v === null || $v === '') {
                if ($paraEnvio && $campo->requerido) {
                    $errores["{$prefijo}.{$k}"] = "Falta «{$campo->etiqueta}».";
                }
                continue;
            }
            switch ($campo->tipo_campo) {
                case 'number':
                    if (! is_numeric($v)) { $errores["{$prefijo}.{$k}"] = "«{$campo->etiqueta}» debe ser un número."; continue 2; }
                    $v = $v + 0;
                    break;
                case 'date':
                    if (! is_string($v) || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $v)) { $errores["{$prefijo}.{$k}"] = "«{$campo->etiqueta}» debe ser una fecha."; continue 2; }
                    break;
                case 'select':
                    $ids = collect($campo->opciones_json ?? [])->pluck('id')->map(fn ($x) => (string) $x)->all();
                    if (! in_array((string) $v, $ids, true)) { $errores["{$prefijo}.{$k}"] = "Elige una opción válida en «{$campo->etiqueta}»."; continue 2; }
                    $v = (string) $v;
                    break;
                case 'textarea':
                    $v = mb_substr(strip_tags((string) $v), 0, 2000);
                    break;
                default:
                    $v = mb_substr(strip_tags((string) $v), 0, 255);
            }
            $out[$k] = $v;
        }
        if ($errores) {
            throw ValidationException::withMessages($errores);
        }

        return $out;
    }

    /** Folio legible y único: CLUB-AAAA-XXXXXX. */
    public static function nuevoFolio(): string
    {
        return 'CLUB-'.date('Y').'-'.strtoupper(\Illuminate\Support\Str::random(6));
    }
}
