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

    /** E94: tipo de secundaria (el nivel sigue siendo primaria o secundaria). */
    public const TIPOS_SECUNDARIA = ['general' => 'General', 'tecnica' => 'Técnica', 'telesecundaria' => 'Telesecundaria'];
    /** E94: lo único que se acepta como «ubicación»: enlaces https de mapas (el campo se pinta como enlace). */
    private const HOSTS_MAPA = ['maps.app.goo.gl', 'share.google', 'maps.apple', 'maps.apple.com', 'maps.google.com', 'maps.google.com.mx'];
    private const HOSTS_MAPA_RUTA_MAPS = ['goo.gl', 'google.com', 'www.google.com', 'google.com.mx', 'www.google.com.mx'];

    protected $fillable = [
        'cct', 'nombre', 'municipio', 'nivel', 'sistema', 'activo', 'participo_antes', 'temporadas',
        'equipo_nombre', 'domicilio', 'ubicacion_url', 'latitud', 'longitud', 'matricula_total', 'matricula_hombres',
        'matricula_mujeres', 'tipo_secundaria', 'zona', 'subsistema_detalle', 'observaciones',
    ];

    protected $casts = [
        'activo' => 'boolean', 'participo_antes' => 'boolean', 'temporadas' => 'array',
        'latitud' => 'float', 'longitud' => 'float', 'matricula_total' => 'integer', 'matricula_hombres' => 'integer', 'matricula_mujeres' => 'integer',
    ];

    /**
     * E94: enlace de mapas seguro o null. Solo https, sin usuario/contraseña ni puerto raro y de un buscador de mapas
     * conocido (los acortadores genéricos y sitios ajenos se descartan). Se vuelve a validar al mostrarlo.
     */
    public static function urlMapaSegura(?string $u): ?string
    {
        $u = trim((string) $u);
        if ($u === '' || mb_strlen($u) > 1000 || preg_match('/[\s<>"\\\\]/u', $u)) return null;
        $p = parse_url($u);
        if (! $p || ($p['scheme'] ?? '') !== 'https' || isset($p['user']) || isset($p['pass']) || (isset($p['port']) && $p['port'] !== 443)) return null;
        $host = mb_strtolower($p['host'] ?? '');
        $ruta = $p['path'] ?? '/';
        if (in_array($host, self::HOSTS_MAPA, true)) return $u;
        if (in_array($host, self::HOSTS_MAPA_RUTA_MAPS, true) && str_starts_with($ruta, '/maps')) return $u;

        return null;
    }

    /** E94: periodo escolar «2026-2027» de una convocatoria (su periodo), o null si no tiene ese formato. */
    public static function temporadaDeConvocatoria(?Convocatoria $c): ?string
    {
        $n = trim((string) $c?->periodo?->nombre);

        return preg_match('/^(\d{4})-(\d{4})$/', $n, $m) && (int) $m[2] === (int) $m[1] + 1 ? $n : null;
    }

    /**
     * E94 (pedido del usuario): al aceptar un club, la temporada de su convocatoria entra sola al historial de la escuela
     * (más reciente primero). «Ya participó» solo se enciende si la escuela ya tenía OTRA temporada: una escuela nueva que
     * acaba de ser aceptada sigue siendo «Nueva escuela» durante su primera temporada.
     */
    public static function registrarTemporada(Escuela $e, string $temporada): void
    {
        $lista = self::normalizarTemporadas(array_merge([$temporada], $e->temporadas ?? []));
        usort($lista, fn ($a, $b) => strcmp($b, $a));
        $e->temporadas = array_slice($lista, 0, self::MAX_TEMPORADAS);
        if (count(array_filter($lista, fn ($t) => mb_strtolower($t) !== mb_strtolower($temporada))) > 0) $e->participo_antes = true;
        $e->save();
    }

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

        $c = self::clave($texto);
        if (isset($mapa[$c])) return $mapa[$c];
        // E94: nombre corto de un municipio oficial largo («Acambay» → «Acambay de Ruíz Castañeda»): solo si es el
        // comienzo de UN único municipio (con «san» o «santa» hay varios y no se adivina).
        if (mb_strlen($c) >= 4) {
            $c = $c.' ';
            $coinc = array_values(array_filter($mapa, fn ($oficial, $k) => str_starts_with($k.' ', $c), ARRAY_FILTER_USE_BOTH));
            if (count($coinc) === 1) return $coinc[0];
        }

        return null;
    }

    /**
     * E94: búsqueda por palabras, sin importar mayúsculas ni acentos: cada palabra debe aparecer en el nombre, la CCT, el
     * municipio o el equipo de la escuela («hidalgo bots», «Acámbay», «primaria miguel hidalgo»).
     */
    public function scopeBuscar($q, string $texto)
    {
        $palabras = array_slice(array_filter(explode(' ', self::clave($texto))), 0, 8);
        foreach ($palabras as $p) {
            $like = '%'.addcslashes($p, '\\%_').'%';
            $q->where(fn ($w) => $w
                ->whereRaw("translate(lower(nombre), 'áéíóúüñ', 'aeiouun') like ?", [$like])
                ->orWhereRaw("translate(lower(municipio), 'áéíóúüñ', 'aeiouun') like ?", [$like])
                ->orWhereRaw("translate(lower(coalesce(equipo_nombre, '')), 'áéíóúüñ', 'aeiouun') like ?", [$like])
                ->orWhere('cct', 'ilike', $like));
        }

        return $q;
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
