<?php

namespace App\Support;

use App\Models\SolicitudAcceso;
use Illuminate\Support\Carbon;

/**
 * E67 (08/10/2026, decisiones del usuario) — Reintentos del registro general tras un rechazo:
 *  - una solicitud RECHAZADA ya no bloquea el correo ni la CURP (sí una cuenta existente o una solicitud pendiente);
 *  - se cuentan los rechazos por correo O por CURP; a partir del 3.º, cada rechazo pone el registro en pausa 24 h
 *    (después se puede intentar de nuevo; si lo rechazan otra vez, otras 24 h);
 *  - la solicitud rechazada se conserva en el historial y el admin ve que la nueva es un reintento.
 */
class ReintentoRegistro
{
    public const LIBRES = 3;

    public const HORAS = 24;

    /** Solicitudes rechazadas con ese correo o esa CURP. */
    public static function rechazadas(string $email, ?string $curp)
    {
        return SolicitudAcceso::where('estado', 'rechazada')
            ->where(fn ($q) => $q->whereRaw('LOWER(email) = ?', [mb_strtolower($email)])->when($curp, fn ($w) => $w->orWhere('curp', $curp)));
    }

    public static function rechazos(string $email, ?string $curp): int
    {
        return self::rechazadas($email, $curp)->count();
    }

    /** Hasta cuándo está en pausa el registro (null = puede registrarse ya). */
    public static function pausaHasta(string $email, ?string $curp): ?Carbon
    {
        if (self::rechazos($email, $curp) < self::LIBRES) return null;
        $ultimo = self::rechazadas($email, $curp)->max('revisado_at');
        $hasta = $ultimo ? Carbon::parse($ultimo)->addHours(self::HORAS) : null;

        return $hasta && $hasta->isFuture() ? $hasta : null;
    }

    /** Intentos que quedan antes de la primera pausa (0 si ya llegó al límite). */
    public static function intentosRestantes(string $email, ?string $curp): int
    {
        return max(0, self::LIBRES - self::rechazos($email, $curp));
    }

    public static function fecha(Carbon $c): string
    {
        return $c->copy()->setTimezone('America/Mexico_City')->locale('es')->isoFormat('D [de] MMMM [a las] h:mm a').' (hora del centro)';
    }
}
