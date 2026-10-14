<?php

namespace App\Support;

use App\Models\User;

/**
 * 02/10/2026 — A dónde lleva cada aviso (pedido del usuario: «las notificaciones deben dirigirte a lo que
 * específicamente indican»). El enlace se arma en el servidor según el panel del rol activo de quien lo recibe y se
 * guarda en `notificaciones_log.enlace`; el front lo vuelve a validar (solo rutas internas de su propio panel).
 */
class EnlaceAviso
{
    /** Solo rutas internas de un panel, con id o consulta simple. Nada de dominios, `//`, `..` ni caracteres raros. */
    public const PATRON = '#^/(admin|revisor|evaluador|solicitante|club|operador)(/[A-Za-z0-9_-]+)*(\?[A-Za-z0-9_=&-]+)?$#';

    public static function valido(mixed $e): ?string
    {
        return is_string($e) && strlen($e) <= 255 && preg_match(self::PATRON, $e) === 1 ? $e : null;
    }

    /** Prefijo del panel del rol activo. */
    public static function panel(object $u): ?string
    {
        if (! $u instanceof User) return null;

        return match (true) {
            $u->tieneRol('admin', 'admin_convocatoria', 'consulta') => '/admin',
            $u->tieneRol('revisor') => '/revisor',
            $u->tieneRol('evaluador') => '/evaluador',
            $u->tieneRol('solicitante') => '/solicitante',
            $u->tieneRol('lider_club', 'acompanante_club') => '/club',
            $u->tieneRol('operador_evento') => '/operador',
            default => null,
        };
    }

    /** Ficha del club en el panel de quien recibe. */
    public static function club(object $u, int $clubId): ?string
    {
        return match (self::panel($u)) {
            '/admin' => '/admin/clubes/'.$clubId,
            '/revisor' => '/revisor/clubes/'.$clubId,
            '/club' => '/club/clubes/'.$clubId,
            default => null,
        };
    }

    /** La solicitud en el panel de quien recibe (el admin la abre filtrada por folio en su lista). */
    public static function solicitud(object $u, int $solicitudId, ?string $folio = null): ?string
    {
        return match (self::panel($u)) {
            '/solicitante' => '/solicitante/solicitudes/'.$solicitudId,
            '/revisor' => '/revisor/solicitudes/'.$solicitudId,
            '/admin' => $folio && preg_match('/^[A-Za-z0-9-]{3,60}$/', $folio) ? '/admin/solicitudes?search='.$folio : '/admin/solicitudes',
            '/evaluador' => '/evaluador?sistema=sigae',
            default => null,
        };
    }

    /** Página fija del panel (p. ej. /admin/reset-requests), solo si quien recibe usa ese panel. */
    public static function ruta(object $u, string $ruta): ?string
    {
        $p = self::panel($u);

        return $p && str_starts_with($ruta, $p.'/') ? self::valido($ruta) : null;
    }
}
