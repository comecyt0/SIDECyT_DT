<?php

namespace App\Support;

use App\Models\Club;
use App\Models\ClubIntegrante;
use App\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * 08/10/2026 (pedido del usuario) — Los líderes cuentan como integrantes del club; el director no.
 *  - Club de un docente: él es el líder A (tarjeta es_lider desde que crea el club) y el líder B entra al darle acceso.
 *  - Club del director (dueno_director): el líder A (es_lider) y el líder B (es_lider_b) entran al darles acceso.
 * Decisiones: la tarjeta se crea sola (nombre y correo; el líder completa el resto); cuenta para el mínimo, el máximo y
 * el box lunch, así que con el club lleno no se puede dar de alta; al cambiar a la persona se reemplaza y al retirarle el
 * acceso se quita. La lista solo cambia mientras el club se puede editar (después del envío el padrón no se toca).
 */
class LiderBIntegrante
{
    /** Columna de la tarjeta para cada tipo de acceso que cuenta como integrante. */
    public const BANDERA = ['lider_a' => 'es_lider', 'lider_b' => 'es_lider_b'];

    public static function cuenta(string $tipo): bool
    {
        return isset(self::BANDERA[$tipo]);
    }

    public static function de(Club $club, string $tipo = 'lider_b'): ?ClubIntegrante
    {
        return ClubIntegrante::where('club_id', $club->id)->where(self::BANDERA[$tipo], true)->first();
    }

    /** Lanza 422 si no cabe (se llama dentro de la transacción, antes de tocar accesos). */
    public static function exigirCupo(Club $club, string $tipo = 'lider_b'): void
    {
        if (! self::cuenta($tipo) || ! $club->editable() || self::de($club, $tipo)) return;
        $max = (int) ($club->convocatoria?->especieConfig?->max_integrantes ?: 10);
        if ($club->integrantes()->count() >= $max) {
            $quien = \App\Models\ClubAcceso::ETIQUETAS[$tipo];
            throw ValidationException::withMessages(['email' => "El club está completo ({$max} integrantes): el {$quien} cuenta como integrante. Quita a un integrante para agregarlo."]);
        }
    }

    /** Crea o reemplaza la tarjeta con los datos de la cuenta. */
    public static function sincronizar(Club $club, User $usuario, string $tipo = 'lider_b'): void
    {
        if (! self::cuenta($tipo) || ! $club->editable()) return;
        $i = self::de($club, $tipo);
        if ($i && mb_strtolower((string) $i->correo) === mb_strtolower((string) $usuario->email)) return; // misma persona
        if ($i) {
            ImagenSegura::borrar(Especie::DIR_MEDIA, $i->foto_path);
            $i->forceFill(['foto_path' => null, 'fecha_nacimiento' => null, 'sexo' => null, 'curp' => null, 'grado_grupo' => null, 'datos' => []]);
        } else {
            $i = new ClubIntegrante(['orden' => $tipo === 'lider_a' ? 0 : 1]);
            $i->forceFill(['club_id' => $club->id, 'es_lider' => $tipo === 'lider_a', 'es_lider_b' => $tipo === 'lider_b']);
        }
        $i->forceFill(['nombre' => $usuario->name, 'correo' => $usuario->email, 'telefono' => $usuario->telefono, 'curp' => $i->curp ?? $usuario->curp])->save();
    }

    public static function quitar(Club $club, string $tipo = 'lider_b'): void
    {
        if (! self::cuenta($tipo) || ! $club->editable()) return;
        if ($i = self::de($club, $tipo)) {
            ImagenSegura::borrar(Especie::DIR_MEDIA, $i->foto_path);
            $i->delete();
        }
    }

    /**
     * Ceder entre líder A y líder B: las tarjetas siguen a las personas y solo cambian de etiqueta (sin tocar el padrón).
     * Ninguna, una o ambas pueden existir.
     */
    public static function intercambiarEtiquetas(Club $club): void
    {
        $a = self::de($club, 'lider_a');
        $b = self::de($club, 'lider_b');
        // Primero se libera la de B (índice único parcial de es_lider_b).
        $b?->forceFill(['es_lider_b' => false, 'es_lider' => true, 'orden' => 0])->save();
        $a?->forceFill(['es_lider' => false, 'es_lider_b' => true, 'orden' => 1])->save();
    }
}
