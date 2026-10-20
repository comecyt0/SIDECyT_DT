<?php

namespace App\Support;

use App\Models\Club;
use App\Models\ClubFirmado;
use App\Models\ClubLogistica;
use App\Models\Convocatoria;
use App\Models\EspecieConfig;
use App\Models\EspecieEvento;
use App\Models\User;
use App\Notifications\ClubAviso;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * E52 · F3 — Logística de clubes aceptados (docs/APOYO_EN_ESPECIE.md §6.5 y §13). Un solo lugar para:
 *  - límites por club (máximos configurables; "no pasar de integrantes" + acompañantes) y cupos totales por convocatoria
 *    o por evento (null = sin tope). El cupo se aparta al ENVIAR (orden de llegada) bajo bloqueo de la configuración, así
 *    dos líderes no pueden pasarse del tope al mismo tiempo;
 *  - transporte y box lunch solo para escuelas ESTATALES (federales: solo kit); rechazar transporte pide confirmación;
 *  - documentos firmados con versiones (carta de resguardo y formato de cada solicitud) y su validación;
 *  - asignación de fecha y lugar del kit (por club o a varios) y registro de la entrega.
 */
class LogisticaClub
{
    public const DIR = 'clubes_firmados';
    public const MAX_MB = 10;

    public static function aplica(Club $club): bool
    {
        return in_array($club->estado, Club::ACEPTADOS, true);
    }

    public static function esEstatal(Club $club): bool
    {
        return $club->loadMissing('escuela')->escuela?->sistema === 'estatal';
    }

    public static function config(Club|int $c): EspecieConfig
    {
        $convId = $c instanceof Club ? $c->convocatoria_id : $c;

        return EspecieConfig::where('convocatoria_id', $convId)->first() ?? new EspecieConfig();
    }

    public static function modo(EspecieConfig $cfg): string
    {
        return $cfg->logistica_modo === 'evento' ? 'evento' : 'convocatoria';
    }

    /** ¿Aún se puede pedir o cambiar la solicitud? (fecha límite en la zona del negocio; null = sin límite). */
    public static function abierta(EspecieConfig $cfg): bool
    {
        $f = $cfg->fecha_limite_logistica;

        return $f === null || Convocatoria::hoy() <= $f->format('Y-m-d');
    }

    /**
     * Máximos que aplican a este club (null = sin tope).
     * Transporte: lo define el personal por club (max_transporte_club).
     * Box lunch: nunca más que el máximo de integrantes de la convocatoria (o menos, si el personal lo baja).
     */
    public static function limitesClub(Club $club, EspecieConfig $cfg): array
    {
        $maxIntegrantes = (int) ($cfg->max_integrantes ?: 10);
        $lunch = $cfg->max_lunch_club === null ? $maxIntegrantes : min((int) $cfg->max_lunch_club, $maxIntegrantes);

        return ['transporte' => $cfg->max_transporte_club, 'lunch' => $lunch];
    }

    /** Cupo total (convocatoria o evento) y lo ya apartado, excluyendo una solicitud. */
    public static function cupo(EspecieConfig $cfg, ?EspecieEvento $evento, string $campo, ?int $excepto = null): array
    {
        $total = self::modo($cfg) === 'evento' ? $evento?->{"cupo_{$campo}"} : $cfg->{"cupo_{$campo}"};
        $usado = (int) ClubLogistica::whereIn('estado', ClubLogistica::APARTAN)
            ->whereHas('club', fn ($q) => $q->where('convocatoria_id', $cfg->convocatoria_id))
            ->when(self::modo($cfg) === 'evento', fn ($q) => $q->where('evento_id', $evento?->id))
            ->when($excepto, fn ($q) => $q->where('id', '!=', $excepto))
            ->sum($campo);

        return ['total' => $total, 'usado' => $usado, 'disponible' => $total === null ? null : max(0, $total - $usado)];
    }

    // ───────────────────────── Solicitudes ─────────────────────────

    public static function solicitar(Club $club, User $lider, ?int $eventoId, int $transporte, int $lunch, bool $confirmoSinTransporte): ClubLogistica
    {
        if (! self::aplica($club)) self::falla('La logística se habilita cuando el club está aceptado.');
        if (! self::esEstatal($club)) self::falla('El transporte y el box lunch son solo para escuelas estatales; tu club recibe el kit.');
        $log = DB::transaction(function () use ($club, $lider, $eventoId, $transporte, $lunch, $confirmoSinTransporte) {
            // Bloqueo de la configuración: serializa a los líderes de la convocatoria mientras se revisa el cupo.
            $cfg = EspecieConfig::where('convocatoria_id', $club->convocatoria_id)->lockForUpdate()->first() ?? self::falla('La convocatoria no tiene logística configurada.');
            if (! self::abierta($cfg)) self::falla('Ya pasó la fecha límite para solicitar transporte y box lunch.');
            // E71: solo lo que da la convocatoria.
            $daT = (bool) ($cfg->incluye_transporte ?? true);
            $daL = (bool) ($cfg->incluye_lunch ?? true);
            if (! $daT && ! $daL) self::falla('Esta convocatoria no incluye transporte ni box lunch.');
            if (! $daT && $transporte > 0) self::falla('Esta convocatoria no incluye transporte.', 'transporte');
            if (! $daL && $lunch > 0) self::falla('Esta convocatoria no incluye box lunch.', 'lunch');
            if (! $daT) $confirmoSinTransporte = true;
            $evento = null;
            if (self::modo($cfg) === 'evento') {
                $evento = EspecieEvento::where('convocatoria_id', $club->convocatoria_id)->find($eventoId) ?? self::falla('Elige un evento de esta convocatoria.', 'evento_id');
            } elseif ($eventoId) {
                self::falla('Esta convocatoria no pide transporte y box lunch por evento.', 'evento_id');
            }
            if ($transporte === 0 && ! $confirmoSinTransporte) self::falla('Confirma que no quieres transporte.', 'confirmo_sin_transporte');
            $lim = self::limitesClub($club, $cfg);
            if ($lim['transporte'] !== null && $transporte > $lim['transporte']) self::falla("El máximo de transporte para tu club es {$lim['transporte']}.", 'transporte');
            if ($lim['lunch'] !== null && $lunch > $lim['lunch']) self::falla("El máximo de box lunch para tu club es {$lim['lunch']}.", 'lunch');

            $log = ClubLogistica::where('club_id', $club->id)->where(fn ($q) => $evento ? $q->where('evento_id', $evento->id) : $q->whereNull('evento_id'))->lockForUpdate()->first();
            foreach (['transporte' => $transporte, 'lunch' => $lunch] as $campo => $n) {
                $c = self::cupo($cfg, $evento, $campo, $log?->id);
                if ($c['disponible'] !== null && $n > $c['disponible']) {
                    self::falla($c['disponible'] === 0
                        ? 'Ya no hay cupo de '.($campo === 'lunch' ? 'box lunch' : 'transporte').($evento ? " para «{$evento->nombre}»" : '').'.'
                        : 'Solo quedan '.$c['disponible'].' lugares de '.($campo === 'lunch' ? 'box lunch' : 'transporte').($evento ? " para «{$evento->nombre}»" : '').'.', $campo);
                }
            }
            $log = $log ?? new ClubLogistica();
            $log->forceFill(['club_id' => $club->id, 'evento_id' => $evento?->id, 'transporte' => $transporte, 'lunch' => $lunch, 'estado' => 'enviada', 'enviada_at' => now()])->save();
            // El formato firmado anterior ya no corresponde a lo pedido: hay que firmar el nuevo (queda en el historial).
            ClubFirmado::where('logistica_id', $log->id)->whereIn('estado', ['pendiente', 'aprobado'])->update(['estado' => 'reemplazado', 'updated_at' => now()]);

            return $log;
        });
        Audit::log('club.logistica_solicitada', $club, ['evento_id' => $log->evento_id, 'transporte' => $transporte, 'lunch' => $lunch]);

        return $log;
    }

    public static function cancelar(Club $club, ClubLogistica $log): void
    {
        $cfg = self::config($club);
        if (! self::abierta($cfg)) self::falla('Ya pasó la fecha límite; para cambiar tu solicitud habla con el COMECYT.');
        if ((int) $log->club_id !== (int) $club->id) abort(404);
        $log->forceFill(['estado' => 'cancelada'])->save();
        ClubFirmado::where('logistica_id', $log->id)->where('estado', 'pendiente')->update(['estado' => 'reemplazado', 'updated_at' => now()]);
        Audit::log('club.logistica_cancelada', $club, ['logistica_id' => $log->id]);
    }

    // ───────────────────────── Documentos firmados ─────────────────────────

    public static function subirFirmado(Club $club, User $u, string $tipo, ?ClubLogistica $log, UploadedFile $archivo): ClubFirmado
    {
        if (! self::aplica($club)) self::falla('La logística se habilita cuando el club está aceptado.');
        if ($tipo === 'resguardo') {
            if (ClubFirmado::where('club_id', $club->id)->where('tipo', 'resguardo')->where('estado', 'aprobado')->exists()) {
                self::falla('Tu carta de resguardo ya fue aprobada.');
            }
        } else {
            if (! $log || (int) $log->club_id !== (int) $club->id) abort(404);
            if (! in_array($log->estado, ['enviada', 'firmada'], true)) {
                self::falla($log->estado === 'aprobada' ? 'Este formato ya fue aprobado.' : 'Primero envía tu solicitud (o vuelve a enviarla si fue rechazada).');
            }
        }
        // Pedido del usuario (02/10/2026): los formatos firmados y escaneados van solo en PDF (antes PDF o imagen).
        $ext = TiposArchivo::validar($archivo, ['pdf'], self::MAX_MB, 'archivo');
        $interno = Str::random(40).'.'.$ext;
        Storage::disk('local')->put(self::DIR.'/'.$club->id.'/'.$interno, file_get_contents($archivo->getPathname()));
        $f = DB::transaction(function () use ($club, $u, $tipo, $log, $interno, $archivo) {
            ClubFirmado::where('club_id', $club->id)->where('tipo', $tipo)->where('estado', 'pendiente')
                ->when($log, fn ($q) => $q->where('logistica_id', $log->id))->update(['estado' => 'reemplazado', 'updated_at' => now()]);
            $f = new ClubFirmado();
            $f->forceFill([
                'club_id' => $club->id, 'tipo' => $tipo, 'logistica_id' => $log?->id, 'archivo' => $interno,
                'nombre_original' => mb_substr(preg_replace('/[^\pL\pN ._\-()]/u', '_', (string) $archivo->getClientOriginalName()), 0, 200),
                'estado' => 'pendiente', 'subido_por' => $u->id,
            ])->save();
            if ($log) $log->forceFill(['estado' => 'firmada'])->save();

            return $f;
        });
        Audit::log('club.firmado_subido', $club, ['tipo' => $tipo, 'firmado_id' => $f->id]);
        foreach (RevisionClub::adminsDe($club) as $admin) $admin->notify(new ClubAviso($club, 'firmado_subido', ['tipo' => $tipo]));

        return $f;
    }

    public static function revisarFirmado(ClubFirmado $f, User $u, string $resultado, ?string $motivo): ClubFirmado
    {
        $motivo = $motivo !== null ? trim(strip_tags($motivo)) : null;
        DB::transaction(function () use ($f, $u, $resultado, $motivo) {
            $x = ClubFirmado::whereKey($f->id)->lockForUpdate()->first();
            if ($x->estado !== 'pendiente') self::falla('Este documento ya no está pendiente de revisión (hay una versión más nueva o ya se revisó).');
            if ($resultado === 'rechazar' && ! $motivo) self::falla('Escribe el motivo del rechazo.', 'motivo');
            $x->forceFill(['estado' => $resultado === 'aprobar' ? 'aprobado' : 'rechazado', 'motivo' => $motivo, 'revisado_por' => $u->id, 'revisado_at' => now()])->save();
            if ($x->logistica_id) {
                // Rechazar el formato de una solicitud la rechaza y libera su cupo (decisión del usuario).
                ClubLogistica::whereKey($x->logistica_id)->update(['estado' => $resultado === 'aprobar' ? 'aprobada' : 'rechazada', 'updated_at' => now()]);
            }
        });
        $f->refresh();
        $club = $f->club;
        Audit::log('club.firmado_'.($resultado === 'aprobar' ? 'aprobado' : 'rechazado'), $club, ['firmado_id' => $f->id, 'tipo' => $f->tipo]);
        $club->loadMissing('lider');
        RevisionClub::avisarLider($club, $resultado === 'aprobar' ? 'firmado_aprobado' : 'firmado_rechazado', ['tipo' => $f->tipo, 'motivo' => $motivo]);

        return $f;
    }

    // ───────────────────────── Kit ─────────────────────────

    /** Asigna fecha y lugar de entrega del kit a uno o varios clubes aceptados; cada líder recibe su correo. */
    public static function asignarKit(array $clubIds, User $u, \Carbon\Carbon $fecha, string $lugar): array
    {
        $lugar = trim(strip_tags($lugar));
        $clubes = Club::whereIn('id', $clubIds)->get();
        $hechos = [];
        foreach ($clubes as $c) {
            if (! Alcance::puedeVerConvocatoria($u, (int) $c->convocatoria_id) || ! RevisionClub::puedeAceptar($u, (int) $c->convocatoria_id)) continue;
            if ($c->estado !== 'aceptado') continue; // entregados o no aceptados se omiten
            $c->forceFill(['kit_fecha' => $fecha, 'kit_lugar' => $lugar, 'kit_asignado_at' => now()])->save();
            Audit::log('club.kit_asignado', $c, ['fecha' => $fecha->toIso8601String()]);
            $c->loadMissing('lider');
            // E61 (pedido del usuario): la fecha y el lugar del kit también le llegan al líder B (campana y correo).
            RevisionClub::avisarLider($c, 'kit_asignado', ['fecha' => RevisionClub::fechaLegible($fecha), 'lugar' => $lugar], true);
            $hechos[] = $c->id;
        }

        return $hechos;
    }

    public static function entregarKit(Club $club, User $u, \Carbon\Carbon $fecha, string $lugar, string $entrego, string $recibio): Club
    {
        DB::transaction(function () use ($club, $u, $fecha, $lugar, $entrego, $recibio) {
            $c = Club::whereKey($club->id)->lockForUpdate()->first();
            if ($c->estado !== 'aceptado') self::falla($c->estado === 'kit_entregado' ? 'El kit de este club ya se registró como entregado.' : 'Solo se entrega el kit a clubes aceptados.');
            $c->forceFill(['estado' => 'kit_entregado', 'kit_entregado_at' => $fecha, 'kit_entregado_lugar' => trim(strip_tags($lugar)),
                'kit_entrego' => trim(strip_tags($entrego)), 'kit_recibio' => trim(strip_tags($recibio)), 'kit_registrado_por' => $u->id])->save();
        });
        Audit::log('club.kit_entregado', $club, ['folio' => $club->folio]);
        $club->refresh()->loadMissing('lider');
        RevisionClub::avisarLider($club, 'kit_entregado', [], true);

        return $club;
    }

    // ───────────────────────── Estado para las pantallas ─────────────────────────

    /** Resumen de la logística de un club (líder y personal; sin nombres internos de archivo). */
    public static function estado(Club $club): array
    {
        $cfg = self::config($club);
        $eventos = $cfg->exists ? $cfg->eventos()->get() : collect();
        $logs = $club->logisticas()->get()->keyBy(fn ($l) => $l->evento_id ?? 0);
        $firmados = $club->firmados()->with('revisor:id,name')->get();
        $version = fn (ClubFirmado $f) => ['id' => $f->id, 'nombre_original' => $f->nombre_original, 'estado' => $f->estado, 'motivo' => $f->motivo,
            'subido_at' => $f->created_at, 'revisado_at' => $f->revisado_at, 'revisor' => $f->revisor?->name];
        $solicitud = function (?EspecieEvento $ev) use ($logs, $firmados, $cfg, $version) {
            $l = $logs->get($ev?->id ?? 0);

            return [
                'evento' => $ev ? ['id' => $ev->id, 'nombre' => $ev->nombre, 'fecha' => $ev->fecha?->format('Y-m-d'), 'sede' => $ev->sede] : null,
                'solicitud' => $l ? ['id' => $l->id, 'transporte' => $l->transporte, 'lunch' => $l->lunch, 'estado' => $l->estado, 'enviada_at' => $l->enviada_at] : null,
                'versiones' => $l ? $firmados->where('logistica_id', $l->id)->values()->map($version) : [],
                'cupo' => ['transporte' => self::cupo($cfg, $ev, 'transporte', $l?->id), 'lunch' => self::cupo($cfg, $ev, 'lunch', $l?->id)],
            ];
        };
        $modo = self::modo($cfg);

        return [
            'aplica' => self::aplica($club),
            'estatal' => self::esEstatal($club),
            'modo' => $modo,
            'abierta' => self::abierta($cfg),
            'fecha_limite' => $cfg->fecha_limite_logistica?->format('Y-m-d'),
            'limites' => self::limitesClub($club, $cfg),
            'max_integrantes' => (int) ($cfg->max_integrantes ?: 10),
            'modalidad' => $cfg->modalidad ?? 'estatal',
            'tope_integrantes' => (bool) $cfg->tope_integrantes,
            'acompanantes' => (int) $cfg->acompanantes,
            // E71: qué apoyos da la convocatoria y la salida del transporte.
            'apoyos' => ApoyosLogistica::payload($cfg),
            'solicitudes' => $modo === 'evento' ? $eventos->map(fn ($e) => $solicitud($e))->values() : [$solicitud(null)],
            'resguardo' => $firmados->where('tipo', 'resguardo')->values()->map($version),
            'kit' => [
                'nombre' => $cfg->kit_nombre, 'fecha' => $club->kit_fecha, 'lugar' => $club->kit_lugar, 'asignado_at' => $club->kit_asignado_at,
                'entregado_at' => $club->kit_entregado_at, 'entregado_lugar' => $club->kit_entregado_lugar, 'entrego' => $club->kit_entrego, 'recibio' => $club->kit_recibio,
                // E86: qué kit le toca (perfil, cuántos y qué incluye).
                'resumen' => KitClub::resumen($club, $cfg),
            ],
            // F4 — QR del club: habilitado o, si no, qué le falta (el token nunca viaja aquí).
            'qr' => ['habilitado' => QrClub::habilitado($club), 'habilitado_at' => $club->qr_habilitado_at, 'falta' => QrClub::habilitado($club) ? null : QrClub::impedimento($club)],
        ];
    }

    private static function falla(string $mensaje, string $campo = 'logistica'): never
    {
        throw ValidationException::withMessages([$campo => $mensaje]);
    }
}
