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

    /**
     * Tipos de registro. 02/10/2026 (decisiones del usuario): la «entrada» es la asistencia de siempre (tipo
     * `asistencia`, se conserva para no tocar lo ya registrado) y se agregan la salida del evento y el transporte
     * (solo llegada al evento y regreso), todos con número de personas.
     */
    public const TIPOS = ['asistencia', 'salida', 'lunch', 'tr_llegada', 'tr_regreso', 'kit'];

    public const ETIQUETAS = ['asistencia' => 'Entrada', 'salida' => 'Salida', 'lunch' => 'Box lunch entregados',
        'tr_llegada' => 'Transporte: llegada al evento', 'tr_regreso' => 'Transporte: regreso'];

    /** Solicitud aprobada del club para el evento (modo evento: su solicitud del evento; modo convocatoria: la única). */
    private static function aprobada(Club $club, ?EspecieEvento $evento): ?ClubLogistica
    {
        $cfg = LogisticaClub::config($club);
        $q = ClubLogistica::where('club_id', $club->id)->where('estado', 'aprobada');
        $q = LogisticaClub::modo($cfg) === 'evento' ? $q->where('evento_id', $evento?->id) : $q->whereNull('evento_id');

        return $q->first();
    }

    /** Box lunch aprobado para este club en el evento. */
    public static function lunchAprobado(Club $club, ?EspecieEvento $evento): ?int
    {
        $l = self::aprobada($club, $evento);

        return $l ? (int) $l->lunch : null;
    }

    /** Lugares de transporte aprobados para este club en el evento (null = sin solicitud aprobada). */
    public static function transporteAprobado(Club $club, ?EspecieEvento $evento): ?int
    {
        $l = self::aprobada($club, $evento);

        return $l ? (int) $l->transporte : null;
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
        if ($cantidad > 500) self::falla('La cantidad no puede pasar de 500.', 'cantidad');
        $aviso = null;
        // E71: lo que la convocatoria no da no se registra.
        $cfgA = LogisticaClub::config($club);
        if ($tipo === 'lunch' && ! ($cfgA->incluye_lunch ?? true)) self::falla('Esta convocatoria no incluye box lunch.');
        if (in_array($tipo, ['tr_llegada', 'tr_regreso'], true) && ! ($cfgA->incluye_transporte ?? true)) self::falla('Esta convocatoria no incluye transporte.');
        if ($tipo === 'lunch') {
            $max = self::lunchAprobado($club, $evento);
            if ($max === null || $max === 0) self::falla('Este club no tiene box lunch aprobado para este evento.');
            if ($cantidad > $max) self::falla("El máximo aprobado para este club es {$max}.", 'cantidad');
        } elseif ($tipo === 'tr_llegada' || $tipo === 'tr_regreso') {
            // Decisión del usuario: sin transporte aprobado, se avisa y no se registra; si no coincide, se avisa.
            $aprob = self::transporteAprobado($club, $evento);
            if ($aprob === null || $aprob === 0) self::falla('Este club no tiene transporte aprobado para este evento.');
            if ($cantidad !== $aprob) $aviso = "Ojo: le aprobaron {$aprob} lugar".($aprob === 1 ? '' : 'es')." y registraste {$cantidad}.";
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
        $personas = fn (int $n) => $n.' persona'.($n === 1 ? '' : 's');
        $que = $tipo === 'lunch' ? "Box lunch entregados: {$cantidad}" : self::ETIQUETAS[$tipo].': '.$personas($cantidad);

        return ['tipo' => $tipo, 'cantidad' => $r->cantidad, 'corregido' => $previo !== null, 'aviso' => $aviso,
            'mensaje' => $que.($previo !== null ? " (antes {$previo})" : '').'.'.($aviso ? ' '.$aviso : '')];
    }

    /** Lo que ve el operador al escanear: datos para identificar al club y el estado del evento. */
    public static function ficha(Club $club, User $u, ?EspecieEvento $evento): array
    {
        $club->loadMissing(['escuela:id,cct,nombre,municipio,sistema,participo_antes', 'lider:id,name,email,telefono', 'integrantes']);
        $cfg = LogisticaClub::config($club);
        $regs = $evento ? ClubRegistroEvento::where('club_id', $club->id)->where('evento_id', $evento->id)->with('registrador:id,name')->get()->keyBy('tipo') : collect();
        $reg = fn ($t) => ($x = $regs->get($t)) ? ['cantidad' => $x->cantidad, 'metodo' => $x->metodo, 'hora' => $x->updated_at, 'quien' => $x->registrador?->name] : null;
        $todo = self::veTodo($u);

        return [
            'club' => [
                'id' => $club->id, 'folio' => $club->folio, 'nombre' => $club->nombre, 'estado' => $club->estado, 'logo_url' => $club->logo_url,
                'escuela' => $club->escuela ? ['nombre' => $club->escuela->nombre, 'municipio' => $club->escuela->municipio, 'sistema' => $club->escuela->sistema, 'participo_antes' => (bool) $club->escuela->participo_antes] : null,
                'lider' => $club->lider ? ($todo ? $club->lider->only(['name', 'email', 'telefono']) : ['name' => $club->lider->name]) : null,
                'qr_habilitado' => QrClub::habilitado($club),
            ],
            'integrantes' => $club->integrantes->map(fn ($i) => $todo
                ? ['nombre' => $i->nombre, 'es_lider' => $i->es_lider, 'foto_url' => $i->foto_url, 'grado_grupo' => $i->grado_grupo, 'correo' => $i->correo, 'telefono' => $i->telefono]
                : ['nombre' => $i->nombre, 'es_lider' => $i->es_lider, 'foto_url' => $i->foto_url])->values(),
            'sugerido_asistencia' => $club->integrantes->count(),
            'evento' => $evento ? ['id' => $evento->id, 'nombre' => $evento->nombre, 'fecha' => $evento->fecha?->format('Y-m-d'), 'sede' => $evento->sede] : null,
            'asistencia' => $reg('asistencia'),
            'salida' => $reg('salida'),
            'lunch' => $reg('lunch'),
            'lunch_aprobado' => $evento ? self::lunchAprobado($club, $evento) : null,
            'tr_llegada' => $reg('tr_llegada'),
            'tr_regreso' => $reg('tr_regreso'),
            'transporte_aprobado' => $evento ? self::transporteAprobado($club, $evento) : null,
            // E71: modos que se muestran en el escáner.
            'incluye_transporte' => (bool) ($cfg->incluye_transporte ?? true),
            'incluye_lunch' => (bool) ($cfg->incluye_lunch ?? true),
            'kit' => ['resumen' => KitClub::resumen($club, $cfg), 'nombre' => $cfg->kit_nombre, 'entregado_at' => $club->kit_entregado_at, 'recibio' => $club->kit_recibio, 'entrego' => $club->kit_entrego, 'lugar' => $club->kit_entregado_lugar ?: $club->kit_lugar],
            'ficha_completa' => $todo ? '/admin/clubes/'.$club->id : null,
        ];
    }

    private static function falla(string $m, string $campo = 'registro'): never
    {
        throw ValidationException::withMessages([$campo => $m]);
    }
}
