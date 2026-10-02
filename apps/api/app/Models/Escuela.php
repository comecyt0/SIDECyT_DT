<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * Catálogo de escuelas (E52 · F1). Lo carga el admin por Excel o una por una, o entra al aceptar una solicitud de registro
 * (E55). `participo_antes` + `temporadas` (textos del admin) identifican a las escuelas que ya participaron.
 */
class Escuela extends Model
{
    public const NIVELES = ['primaria', 'secundaria', 'media_superior', 'superior'];
    public const SISTEMAS = ['estatal', 'federal'];
    public const PATRON_CCT = '/^15[A-Z]{3}\d{4}[A-Z]$/';
    public const MAX_TEMPORADAS = 20;

    protected $fillable = ['cct', 'nombre', 'municipio', 'nivel', 'sistema', 'activo', 'participo_antes', 'temporadas'];

    protected $casts = ['activo' => 'boolean', 'participo_antes' => 'boolean', 'temporadas' => 'array'];

    /** Municipio oficial del catálogo SEPOMEX (125 del Estado de México), comparando sin acentos ni mayúsculas; null si no existe. */
    public static function municipioCanonico(string $texto): ?string
    {
        static $mapa = null;
        if ($mapa === null) {
            $mapa = [];
            foreach (DB::table('codigos_postales')->distinct()->pluck('municipio') as $m) {
                $mapa[self::clave($m)] = $m;
            }
        }

        return $mapa[self::clave($texto)] ?? null;
    }

    public static function clave(string $s): string
    {
        $s = mb_strtolower(trim($s));
        $s = strtr($s, ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n']);

        return preg_replace('/\s+/', ' ', $s);
    }

    /** Texto seguro para nombres que podrían terminar en un Excel (sin HTML ni arranque de fórmula). */
    public static function textoSeguro(string $s): string
    {
        return ltrim(trim(strip_tags($s)), "=+-@ \t");
    }

    /** Temporadas: textos sin HTML, sin vacíos ni repetidos (sin distinguir mayúsculas), máx. 20 de 60 caracteres. */
    public static function normalizarTemporadas(array $lista): array
    {
        $vistas = [];
        $out = [];
        foreach ($lista as $t) {
            $t = mb_substr(preg_replace('/\s+/', ' ', self::textoSeguro((string) $t)), 0, 60);
            if ($t === '' || isset($vistas[mb_strtolower($t)])) continue;
            $vistas[mb_strtolower($t)] = true;
            $out[] = $t;
            if (count($out) >= self::MAX_TEMPORADAS) break;
        }

        return $out;
    }
}
