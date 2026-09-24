<?php

namespace App\Support;

use App\Models\Conversacion;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * E45 — Reglas del buzón: quién participa en un hilo y quién es "el equipo" que recibe los avisos.
 *   - El solicitante dueño del hilo.
 *   - Todo admin general (ve y responde todos los hilos, decisión del usuario).
 *   - Los admin de convocatoria asignados a esa convocatoria y con ella dentro de su alcance.
 */
class Buzon
{
    public static function participa(User $user, Conversacion $c): bool
    {
        if ($user->tieneRol('solicitante')) {
            return (int) $c->solicitante_id === (int) $user->id;
        }
        if ($user->tieneRol('admin')) {
            return true;
        }
        if ($user->tieneRol('admin_convocatoria')) {
            return Alcance::puedeVerConvocatoria($user, (int) $c->convocatoria_id);
        }

        return false;
    }

    public static function esEquipo(User $user): bool
    {
        return $user->tieneRol('admin', 'admin_convocatoria');
    }

    /** Usuarios del equipo que atienden una convocatoria (para avisos). */
    public static function equipo(int $convocatoriaId): Collection
    {
        $admins = User::where('rol_id', config('comecyt.roles.admin'))->where('activo', true)->get(['id', 'name', 'email']);
        $delegados = User::where('rol_id', config('comecyt.roles.admin_convocatoria'))->where('activo', true)
            ->whereHas('convocatoriasAsignadas', fn ($q) => $q->where('convocatorias.id', $convocatoriaId))
            ->get(['id', 'name', 'email'])
            ->filter(fn (User $u) => Alcance::puedeVerConvocatoria($u, $convocatoriaId));

        return $admins->merge($delegados)->unique('id')->values();
    }
}
