<?php

namespace App\Support;

use App\Models\Club;
use App\Models\ClubIntegrante;
use App\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * 08/10/2026 (pedido del usuario) — El líder B cuenta como integrante del club, igual que el líder A; el director no.
 * Decisiones: su tarjeta se crea sola al darle acceso (nombre y correo; el líder completa el resto como con cualquier
 * integrante); cuenta para el mínimo, el máximo y el box lunch, así que con el club lleno no se puede dar de alta; al
 * cambiarlo se reemplaza la tarjeta y al retirarle el acceso se quita.
 * La lista de integrantes solo cambia mientras el club se puede editar (borrador u observado con plazo): después de
 * enviarlo, el padrón revisado no se toca.
 */
class LiderBIntegrante
{
    public static function de(Club $club): ?ClubIntegrante
    {
        return ClubIntegrante::where('club_id', $club->id)->where('es_lider_b', true)->first();
    }

    /** Lanza 422 si el líder B no cabe (se llama dentro de la transacción, antes de tocar accesos). */
    public static function exigirCupo(Club $club): void
    {
        if (! $club->editable() || self::de($club)) return;
        $max = (int) ($club->convocatoria?->especieConfig?->max_integrantes ?: 10);
        if ($club->integrantes()->count() >= $max) {
            throw ValidationException::withMessages(['email' => "El club está completo ({$max} integrantes): el líder B cuenta como integrante. Quita a un integrante para agregarlo."]);
        }
    }

    /** Crea o reemplaza la tarjeta del líder B con los datos de su cuenta. */
    public static function sincronizar(Club $club, User $usuario): void
    {
        if (! $club->editable()) return;
        $i = self::de($club);
        if ($i && mb_strtolower((string) $i->correo) === mb_strtolower((string) $usuario->email)) return; // misma persona
        if ($i) {
            // Otra persona: se limpia lo capturado del anterior (incluida su foto).
            ImagenSegura::borrar(Especie::DIR_MEDIA, $i->foto_path);
            $i->forceFill(['foto_path' => null, 'fecha_nacimiento' => null, 'sexo' => null, 'curp' => null, 'grado_grupo' => null, 'datos' => []]);
        } else {
            $i = new ClubIntegrante(['orden' => 1]);
            $i->forceFill(['club_id' => $club->id, 'es_lider' => false, 'es_lider_b' => true]);
        }
        $i->forceFill(['nombre' => $usuario->name, 'correo' => $usuario->email, 'telefono' => $usuario->telefono, 'curp' => $i->curp ?? $usuario->curp])->save();
    }

    public static function quitar(Club $club): void
    {
        if (! $club->editable()) return;
        if ($i = self::de($club)) {
            ImagenSegura::borrar(Especie::DIR_MEDIA, $i->foto_path);
            $i->delete();
        }
    }
}
