<?php

namespace App\Support;

use App\Models\Club;
use App\Models\EspecieConfig;

/**
 * E86 (20/10/2026, pedido del usuario) — Kit diferenciado por escuela.
 *  - «Kit Nueva escuela» (perfil `nueva`): uno por cada integrante del club.
 *  - «Kit» (perfil `participo`): escuelas que ya participaron (marca de Escuelas); número fijo por club que define el admin.
 *  - Cada perfil con su lista personalizable de artículos y cantidades. El admin puede cambiar el perfil de un club.
 * Sin la casilla, todo sigue como antes: un kit por club con el nombre y la descripción de la convocatoria.
 */
class KitClub
{
    public const PERFILES = ['nueva' => 'Kit Nueva escuela', 'participo' => 'Kit'];

    /** 20/10/2026 (decisión del usuario): el kit solo se entrega en modalidad estatal; nacional e internacional, sin kit. */
    public static function aplica(?EspecieConfig $cfg): bool
    {
        return ($cfg?->modalidad ?? 'estatal') === 'estatal';
    }

    /** Configuración normalizada de los dos perfiles (nunca confía en el JSON guardado). */
    public static function kits(EspecieConfig $cfg): array
    {
        $k = is_array($cfg->kits) ? $cfg->kits : [];
        $perfil = function (string $clave) use ($k): array {
            $x = is_array($k[$clave] ?? null) ? $k[$clave] : [];
            $articulos = collect(is_array($x['articulos'] ?? null) ? $x['articulos'] : [])
                ->filter(fn ($a) => is_array($a) && trim((string) ($a['articulo'] ?? '')) !== '')
                ->map(fn ($a) => ['articulo' => mb_substr(trim(strip_tags((string) $a['articulo'])), 0, 150), 'cantidad' => max(1, min(9999, (int) ($a['cantidad'] ?? 1)))])
                ->take(50)->values()->all();

            return [
                'nombre' => mb_substr(trim(strip_tags((string) ($x['nombre'] ?? ''))), 0, 255) ?: self::PERFILES[$clave],
                'articulos' => $articulos,
            ] + ($clave === 'participo' ? ['cantidad_por_club' => max(1, min(999, (int) ($x['cantidad_por_club'] ?? 1)))] : []);
        };

        return ['nueva' => $perfil('nueva'), 'participo' => $perfil('participo')];
    }

    /** Reglas de validación del bloque de kits (configuración y asistente). */
    public static function reglas(string $p = ''): array
    {
        $r = [];
        $r[$p.'kit_diferenciado'] = 'sometimes|boolean';
        $r[$p.'kits'] = 'nullable|array';
        foreach (['nueva', 'participo'] as $k) {
            $r[$p."kits.$k"] = 'nullable|array';
            $r[$p."kits.$k.nombre"] = 'nullable|string|max:255';
            $r[$p."kits.$k.articulos"] = 'nullable|array|max:50';
            $r[$p."kits.$k.articulos.*.articulo"] = 'required|string|max:150';
            $r[$p."kits.$k.articulos.*.cantidad"] = 'required|integer|min:1|max:9999';
        }
        $r[$p.'kits.participo.cantidad_por_club'] = 'nullable|integer|min:1|max:999';

        return $r;
    }

    /** Perfil del club: el que fijó el admin o, si no, por la marca de la escuela (sin escuela del catálogo → nueva). */
    public static function perfil(Club $club): string
    {
        if (in_array($club->kit_perfil, ['nueva', 'participo'], true)) {
            return $club->kit_perfil;
        }

        return $club->escuela?->participo_antes ? 'participo' : 'nueva';
    }

    /**
     * Qué kit le toca al club: perfil, etiqueta, nombre, cuántos y qué incluye. `forzado` = el admin cambió el perfil.
     */
    public static function resumen(Club $club, ?EspecieConfig $cfg = null): array
    {
        $cfg ??= $club->convocatoria?->especieConfig ?? new EspecieConfig();
        if (! self::aplica($cfg)) {
            return ['aplica' => false, 'diferenciado' => false, 'perfil' => null, 'etiqueta' => 'Sin kit', 'nombre' => 'Sin kit (modalidad '.($cfg->modalidad ?? '').')',
                'cantidad' => 0, 'por' => 'club', 'articulos' => [], 'descripcion' => null, 'forzado' => false];
        }
        if (! $cfg->kit_diferenciado) {
            return ['aplica' => true, 'diferenciado' => false, 'perfil' => null, 'etiqueta' => 'Kit', 'nombre' => $cfg->kit_nombre ?: 'Kit de la convocatoria',
                'cantidad' => 1, 'por' => 'club', 'articulos' => [], 'descripcion' => $cfg->kit_descripcion, 'forzado' => false];
        }
        $club->loadMissing(['escuela:id,participo_antes', 'integrantes:id,club_id']);
        $perfil = self::perfil($club);
        $k = self::kits($cfg)[$perfil];
        $cantidad = $perfil === 'nueva' ? max(1, $club->integrantes->count()) : $k['cantidad_por_club'];

        return [
            'aplica' => true, 'diferenciado' => true, 'perfil' => $perfil, 'etiqueta' => self::PERFILES[$perfil], 'nombre' => $k['nombre'],
            'cantidad' => $cantidad, 'por' => $perfil === 'nueva' ? 'integrante' : 'club', 'articulos' => $k['articulos'],
            'descripcion' => $cfg->kit_descripcion, 'forzado' => in_array($club->kit_perfil, ['nueva', 'participo'], true),
        ];
    }

    /** Texto corto: «Kit Nueva escuela × 8» / «Kit × 1». */
    public static function texto(array $r): string
    {
        return ($r['aplica'] ?? true) ? $r['etiqueta'].' × '.$r['cantidad'] : 'Sin kit';
    }

    /** Contenido en una línea: «2 × Arduino, 10 × Sensor…». */
    public static function contenido(array $r): string
    {
        return collect($r['articulos'])->map(fn ($a) => $a['cantidad'].' × '.$a['articulo'])->implode(', ') ?: (string) ($r['descripcion'] ?? '');
    }
}
