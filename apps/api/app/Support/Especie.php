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

    /** Predefinidos del club. E79: director(a) y lugar llenan los formatos institucionales (se guardan en `datos`). */
    public const CAMPOS_CLUB = [
        'logo' => 'Logo o foto del club',
        'descripcion' => 'Descripción del proyecto del club',
        'director_nombre' => 'Nombre del director(a) de la escuela',
        'lugar' => 'Lugar (para los formatos)',
    ];

    /** Predefinidos del integrante. E79: grado y grupo por separado, domicilio y madre/padre/tutor (permiso de imagen). */
    public const CAMPOS_INTEGRANTE = [
        'foto' => 'Foto',
        'fecha_nacimiento' => 'Fecha de nacimiento',
        'sexo' => 'Sexo',
        'curp' => 'CURP',
        'grado_grupo' => 'Grado y grupo',
        'grado' => 'Grado',
        'grupo' => 'Grupo',
        'domicilio' => 'Domicilio',
        'tutor_nombre' => 'Madre, padre o tutor (menores de edad)',
        'correo' => 'Correo',
        'telefono' => 'Teléfono',
    ];

    /** Campos del integrante que son columnas propias (todo lo predefinido menos la foto). */
    public const COLUMNAS_INTEGRANTE = ['fecha_nacimiento', 'sexo', 'curp', 'grado_grupo', 'grado', 'grupo', 'domicilio', 'tutor_nombre', 'correo', 'telefono'];

    public const DEFAULT_CLUB = [
        'logo' => ['pedir' => true, 'obligatorio' => false], 'descripcion' => ['pedir' => true, 'obligatorio' => false],
        'director_nombre' => ['pedir' => false, 'obligatorio' => false], 'lugar' => ['pedir' => false, 'obligatorio' => false],
    ];
    public const DEFAULT_INTEGRANTE = [
        'foto' => ['pedir' => true, 'obligatorio' => false],
        'fecha_nacimiento' => ['pedir' => true, 'obligatorio' => true],
        'sexo' => ['pedir' => false, 'obligatorio' => false],
        'curp' => ['pedir' => false, 'obligatorio' => false],
        'grado_grupo' => ['pedir' => true, 'obligatorio' => false],
        'grado' => ['pedir' => false, 'obligatorio' => false],
        'grupo' => ['pedir' => false, 'obligatorio' => false],
        'domicilio' => ['pedir' => false, 'obligatorio' => false],
        'tutor_nombre' => ['pedir' => false, 'obligatorio' => false],
        'correo' => ['pedir' => false, 'obligatorio' => false],
        'telefono' => ['pedir' => false, 'obligatorio' => false],
    ];

    /**
     * E79 (20/10/2026) — Formatos institucionales que el sistema genera llenos (PDF sin edición), el líder descarga,
     * firma y sube. Casillas «Pedir» y «Obligatorio» por convocatoria. La carta de la escuela se pedía siempre: por
     * defecto sigue pedida y obligatoria. El permiso de uso de imagen es uno por integrante (infantil o de adulto).
     */
    public const FORMATOS = [
        'carta_escuela' => 'Carta de consentimiento de la escuela',
        'formato_a' => 'Formato A · Carta de interés de participación',
        'formato_b' => 'Formato B · Constancia de integración del club',
        'formato_c' => 'Formato C · Integración del club de robótica',
        'uso_imagen' => 'Permiso de uso de imagen (uno por integrante)',
    ];
    public const DEFAULT_FORMATOS = [
        'carta_escuela' => ['pedir' => true, 'obligatorio' => true],
        'formato_a' => ['pedir' => false, 'obligatorio' => false],
        'formato_b' => ['pedir' => false, 'obligatorio' => false],
        'formato_c' => ['pedir' => false, 'obligatorio' => false],
        'uso_imagen' => ['pedir' => false, 'obligatorio' => false],
    ];
    /** Formatos que se suben en «Documentos» (el de imagen se sube en la tarjeta de cada integrante). */
    public const FORMATOS_CLUB = ['carta_escuela', 'formato_a', 'formato_b', 'formato_c'];
    public const PREFIJO_IMAGEN = 'uso_imagen_';

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

    public static function formatos(EspecieConfig $cfg): array
    {
        return self::normalizarPredefinidos($cfg->formatos, self::FORMATOS, self::DEFAULT_FORMATOS);
    }

    /** Reglas de validación de los datos de un integrante (sin foto: se sube aparte). */
    public static function reglasIntegrante(EspecieConfig $cfg, bool $paraEnvio = false): array
    {
        $c = self::camposIntegrante($cfg);
        $req = fn (string $k) => ($paraEnvio && $c[$k]['obligatorio']) ? 'required' : 'nullable';

        // E76: si la convocatoria pide la CURP, el nombre va por partes para compararlo con ella; si no, en un campo.
        $porPartes = $c['curp']['pedir'];
        $nombre = ['string', 'max:'.NombrePropio::MAX, 'regex:'.NombrePropio::REGEX];

        return [
            ...($porPartes ? [
                'nombres' => ['required', ...$nombre],
                'primer_apellido' => ['required', ...$nombre],
                'segundo_apellido' => ['nullable', ...$nombre],
                'curp_revision' => ['sometimes', 'boolean'],
            ] : [
                'nombre' => ['required', 'string', 'min:3', 'max:255', 'regex:'.NombrePropio::REGEX],
            ]),
            'fecha_nacimiento' => [$req('fecha_nacimiento'), 'date_format:Y-m-d', 'before:today', 'after:1900-01-01'],
            'sexo' => [$req('sexo'), 'in:H,M,X'],
            'curp' => [$req('curp'), 'string', 'size:18', 'regex:'.RegistroRoles::PATRON_CURP],
            'grado_grupo' => [$req('grado_grupo'), 'string', 'max:30'],
            // E79: el tutor solo se exige al enviar y solo a menores (lo revisa faltantes()); aquí siempre es opcional.
            'grado' => [$req('grado'), 'string', 'max:20'],
            'grupo' => [$req('grupo'), 'string', 'max:20'],
            'domicilio' => [$req('domicilio'), 'string', 'max:300'],
            'tutor_nombre' => ['nullable', 'string', 'max:150', 'regex:'.NombrePropio::REGEX],
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

    /** Folio legible y único: CLUB-NOMBRECORTO-XXXXXX (E58), o CLUB-AAAA-XXXXXX si la convocatoria no tiene nombre corto. */
    public static function nuevoFolio(?\App\Models\Convocatoria $c = null): string
    {
        return \App\Models\Convocatoria::nuevoFolio('CLUB', $c);
    }
}
