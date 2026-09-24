<?php

namespace App\Support;

use App\Models\Convocatoria;
use App\Models\Solicitud;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Facades\DB;

/**
 * E45 — ALCANCE: qué convocatorias puede ver/operar cada usuario. UNA sola regla para todo el sistema
 * (docs/IMPLEMENTACIONES_E45.md §3). Todo listado y todo acceso a un registro pasa por aquí; nunca filtrar
 * solo en el front.
 *
 *   admin               → null (sin restricción)
 *   admin_convocatoria  → sus convocatorias ∩ convocatorias de sus periodos (si tiene periodos); vacío si nada
 *   revisor, evaluador  → convocatorias de sus periodos; null si no tiene periodos
 *   consulta            → convocatorias de sus periodos; vacío si no tiene periodos
 *   solicitante         → vacío (lo suyo se filtra por user_id en cada controlador)
 */
class Alcance
{
    /** @var array<int, array<int>|null> caché por petición */
    private static array $cache = [];

    /** @return array<int>|null  null = sin restricción */
    public static function convocatoriaIds(User $user): ?array
    {
        if (array_key_exists($user->id, self::$cache)) {
            return self::$cache[$user->id];
        }

        $periodos = fn () => DB::table('periodo_user')->where('user_id', $user->id)->pluck('periodo_id')->all();
        $dePeriodos = fn (array $p) => Convocatoria::whereIn('periodo_id', $p)->pluck('id')->map(fn ($i) => (int) $i)->all();

        $ids = match (true) {
            $user->tieneRol('admin') => null,
            $user->tieneRol('admin_convocatoria') => (function () use ($user, $periodos, $dePeriodos) {
                $propias = DB::table('convocatoria_user')->where('user_id', $user->id)->pluck('convocatoria_id')
                    ->map(fn ($i) => (int) $i)->all();
                $p = $periodos();

                return $p ? array_values(array_intersect($propias, $dePeriodos($p))) : $propias;
            })(),
            $user->tieneRol('revisor', 'evaluador') => (function () use ($periodos, $dePeriodos) {
                $p = $periodos();

                return $p ? $dePeriodos($p) : null;
            })(),
            $user->tieneRol('consulta') => (function () use ($periodos, $dePeriodos) {
                $p = $periodos();

                return $p ? $dePeriodos($p) : [];
            })(),
            default => [],
        };

        return self::$cache[$user->id] = $ids;
    }

    /** Limpia la caché (tras cambiar asignaciones en la misma petición, y en pruebas). */
    public static function olvidar(?int $userId = null): void
    {
        if ($userId === null) {
            self::$cache = [];
        } else {
            unset(self::$cache[$userId]);
        }
    }

    /**
     * Restringe una consulta a las convocatorias visibles. `$columna` es la columna con el id de convocatoria
     * (p. ej. 'convocatoria_id' en solicitudes, 'id' en convocatorias). Con alcance vacío no devuelve nada.
     */
    public static function aplicar(Builder|QueryBuilder $query, User $user, string $columna = 'convocatoria_id'): Builder|QueryBuilder
    {
        $ids = self::convocatoriaIds($user);
        if ($ids === null) {
            return $query;
        }

        return $ids === [] ? $query->whereRaw('1 = 0') : $query->whereIn($columna, $ids);
    }

    /** Restringe una consulta de un modelo relacionado con solicitud (convenios, ministraciones, informes…). */
    public static function aplicarPorSolicitud(Builder $query, User $user, string $relacion = 'solicitud'): Builder
    {
        $ids = self::convocatoriaIds($user);
        if ($ids === null) {
            return $query;
        }
        if ($ids === []) {
            return $query->whereRaw('1 = 0');
        }

        return $query->whereHas($relacion, fn ($q) => $q->whereIn('convocatoria_id', $ids));
    }

    public static function puedeVerConvocatoria(User $user, ?int $convocatoriaId): bool
    {
        $ids = self::convocatoriaIds($user);

        return $ids === null || ($convocatoriaId !== null && in_array((int) $convocatoriaId, $ids, true));
    }

    public static function puedeVerSolicitud(User $user, Solicitud $solicitud): bool
    {
        if ($user->tieneRol('solicitante')) {
            return (int) $solicitud->user_id === (int) $user->id;
        }

        return self::puedeVerConvocatoria($user, $solicitud->convocatoria_id ? (int) $solicitud->convocatoria_id : null);
    }

    /** 404 (no 403) para no confirmar a un tercero que el registro existe. */
    public static function exigirSolicitud(User $user, Solicitud $solicitud): void
    {
        abort_unless(self::puedeVerSolicitud($user, $solicitud), 404, 'Registro no encontrado');
    }

    public static function exigirConvocatoria(User $user, ?int $convocatoriaId): void
    {
        abort_unless(self::puedeVerConvocatoria($user, $convocatoriaId), 404, 'Registro no encontrado');
    }
}
