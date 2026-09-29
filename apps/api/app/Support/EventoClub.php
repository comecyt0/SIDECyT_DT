<?php

namespace App\Support;

use App\Models\Club;
use App\Models\ClubLogistica;
use App\Models\ClubRegistroEvento;
use App\Models\EspecieEvento;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * E52 · F4 — Registros en los eventos (§6.6 y §14): el operador elige evento y modo.
 *  - Asistencia: cuántas personas llegaron (propone los integrantes); uno por club y evento, se corrige.
 *  - Box lunch: lo aprobado en su solicitud, ajustable hacia abajo; sin solicitud aprobada no se entrega.
 *  - Kit: registra la entrega (quién entregó = el operador; quién recibió se escribe).
 * Operan admin, admin de convocatoria y operador de evento, cada uno en las convocatorias de su alcance.
 */
class EventoClub
{
    public const ROLES = ['admin', 'admin_convocatoria', 'operador_evento'];

    public static function puedeOperar(User $u, int $convocatoriaId): bool
    {
        return $u->tieneRol(...self::ROLES) && Alcance::puedeVerConvocatoria($u, $convocatoriaId);
    }

    /** ¿Ve todos los datos del club? (decisión §6.6: admin y admin de convocatoria sí; el operador solo lo necesario). */
    public static function veTodo(User $u): bool
    {
        return $u->tieneRol('admin', 'admin_convocatoria');
    }

    public static function evento(Club $club, ?int $eventoId): ?EspecieEvento
    {
        return $eventoId ? EspecieEvento::where('convocatoria_id', $club->convocatoria_id)->find($eventoId) : null;
    }

    /** Box lunch aprobado para este club en el evento (modo evento: su solicitud del evento; modo convocatoria: la única). */
    public static function lunchAprobado(Club $club, ?EspecieEvento $evento): ?int
    {
        $cfg = LogisticaClub::config($club);
        $q = ClubLogistica::where('club_id', $club->id)->where('estado', 'aprobada');
        $q = LogisticaClub::modo($cfg) === 'evento' ? $q->where('evento_id', $evento?->id) : $q->whereNull('evento_id');
        $l = $q->first();

        return $l ? (int) $l->lunch : null;
    }

    public static function registrar(Club $club, User $u, string $tipo, ?int $eventoId, ?int $cantidad, string $metodo, ?string $recibio): array
    {
        if (! in_array($club->estado, Club::ACEPTADOS, true)) self::falla('Este club no está aceptado.');
        if ($tipo === 'kit') {
            if (! $recibio || trim($recibio) === '') self::falla('Escribe quién recibe el kit.', 'recibio');
            $evento = self::evento($club, $eventoId);
            $lugar = $evento?->sede ?: ($evento?->nombre ?: ($club->kit_lugar ?: 'Evento del COMECYT'));
            LogisticaClub::entregarKit($club, $u, now(), $lugar, $u->name, $recibio);

            return ['tipo' => 'kit', 'mensaje' => 'Kit entregado a '.trim(strip_tags($recibio)).'.'];
        }
        $evento = self::evento($club, $eventoId) ?? self::falla('Elige un evento de esta convocatoria.', 'evento_id');
        if ($cantidad === null || $cantidad < 1) self::falla('Escribe una cantidad de 1 o más.', 'cantidad');
        if ($tipo === 'asistencia') {
            if ($cantidad > 500) self::falla('La cantidad no puede pasar de 500.', 'cantidad');
        } else {
            $max = self::lunchAprobado($club, $evento);
            if ($max === null || $max === 0) self::falla('Este club no tiene box lunch aprobado para este evento.');
            if ($cantidad > $max) self::falla("El máximo aprobado para este club es {$max}.", 'cantidad');
        }
        $previo = null;
        $r = DB::transaction(function () use ($club, $evento, $tipo, $cantidad, $metodo, $u, &$previo) {
            $r = ClubRegistroEvento::where(['club_id' => $club->id, 'evento_id' => $evento->id, 'tipo' => $tipo])->lockForUpdate()->first();
            $previo = $r?->cantidad;
            $r = $r ?? new ClubRegistroEvento();
            $r->forceFill(['club_id' => $club->id, 'evento_id' => $evento->id, 'tipo' => $tipo, 'cantidad' => $cantidad, 'metodo' => $metodo, 'registrado_por' => $u->id])->save();

            return $r;
        });
        Audit::log('club.evento_'.$tipo, $club, ['evento_id' => $evento->id, 'cantidad' => $cantidad, 'anterior' => $previo, 'metodo' => $metodo]);
        $que = $tipo === 'asistencia' ? "Asistencia: {$cantidad} persona".($cantidad === 1 ? '' : 's') : "Box lunch entregados: {$cantidad}";

        return ['tipo' => $tipo, 'cantidad' => $r->cantidad, 'corregido' => $previo !== null, 'mensaje' => $que.($previo !== null ? " (antes {$previo})" : '').'.'];
    }

    /** Lo que ve el operador al escanear: datos para identificar al club y el estado del evento. */
    public static function ficha(Club $club, User $u, ?EspecieEvento $evento): array
    {
        $club->loadMissing(['escuela:id,cct,nombre,municipio,sistema', 'lider:id,name,email,telefono', 'integrantes']);
        $cfg = LogisticaClub::config($club);
        $regs = $evento ? ClubRegistroEvento::where('club_id', $club->id)->where('evento_id', $evento->id)->with('registrador:id,name')->get()->keyBy('tipo') : collect();
        $reg = fn ($t) => ($x = $regs->get($t)) ? ['cantidad' => $x->cantidad, 'metodo' => $x->metodo, 'hora' => $x->updated_at, 'quien' => $x->registrador?->name] : null;
        $todo = self::veTodo($u);

        return [
            'club' => [
                'id' => $club->id, 'folio' => $club->folio, 'nombre' => $club->nombre, 'estado' => $club->estado, 'logo_url' => $club->logo_url,
                'escuela' => $club->escuela ? ['nombre' => $club->escuela->nombre, 'municipio' => $club->escuela->municipio, 'sistema' => $club->escuela->sistema] : null,
                'lider' => $club->lider ? ($todo ? $club->lider->only(['name', 'email', 'telefono']) : ['name' => $club->lider->name]) : null,
                'qr_habilitado' => QrClub::habilitado($club),
            ],
            'integrantes' => $club->integrantes->map(fn ($i) => $todo
                ? ['nombre' => $i->nombre, 'es_lider' => $i->es_lider, 'foto_url' => $i->foto_url, 'grado_grupo' => $i->grado_grupo, 'correo' => $i->correo, 'telefono' => $i->telefono]
                : ['nombre' => $i->nombre, 'es_lider' => $i->es_lider, 'foto_url' => $i->foto_url])->values(),
            'sugerido_asistencia' => $club->integrantes->count(),
            'evento' => $evento ? ['id' => $evento->id, 'nombre' => $evento->nombre, 'fecha' => $evento->fecha?->format('Y-m-d'), 'sede' => $evento->sede] : null,
            'asistencia' => $reg('asistencia'),
            'lunch' => $reg('lunch'),
            'lunch_aprobado' => $evento ? self::lunchAprobado($club, $evento) : null,
            'kit' => ['nombre' => $cfg->kit_nombre, 'entregado_at' => $club->kit_entregado_at, 'recibio' => $club->kit_recibio, 'entrego' => $club->kit_entrego, 'lugar' => $club->kit_entregado_lugar ?: $club->kit_lugar],
            'ficha_completa' => $todo ? '/admin/clubes/'.$club->id : null,
        ];
    }

    private static function falla(string $m, string $campo = 'registro'): never
    {
        throw ValidationException::withMessages([$campo => $m]);
    }
}
