<?php

namespace App\Http\Controllers\Club;

use App\Http\Controllers\Controller;
use App\Models\Club;
use App\Models\ClubFirmado;
use App\Models\ClubLogistica;
use App\Models\Convocatoria;
use App\Models\EspecieConfig;
use App\Models\EspecieEvento;
use App\Support\Alcance;
use App\Support\Audit;
use App\Support\Especie;
use App\Support\LogisticaClub;
use App\Support\RevisionClub;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * E52 · F3 — Logística del lado del personal (admin y admin de convocatoria con alcance, decisión del usuario):
 * configuración (modo de cupos, topes, límites por club, fecha límite y eventos), tablero de la convocatoria, validación
 * de documentos firmados, asignación de fecha y lugar del kit (a uno o varios clubes) y registro de la entrega.
 */
class LogisticaAdminController extends Controller
{
    public function show(Request $request, Convocatoria $convocatoria)
    {
        $this->exigir($request, $convocatoria);

        return response()->json($this->tablero($convocatoria));
    }

    public function update(Request $request, Convocatoria $convocatoria)
    {
        $this->exigir($request, $convocatoria);
        $v = $request->validate([
            'logistica_modo' => 'required|in:convocatoria,evento',
            'cupo_transporte' => 'nullable|integer|min:0|max:100000',
            'cupo_lunch' => 'nullable|integer|min:0|max:100000',
            'max_transporte_club' => 'nullable|integer|min:0|max:1000',
            'max_lunch_club' => 'nullable|integer|min:0|max:1000',
            'tope_integrantes' => 'boolean',
            'acompanantes' => 'nullable|integer|min:0|max:100',
            'fecha_limite_logistica' => 'nullable|date_format:Y-m-d',
            'eventos' => 'present|array|max:30',
            'eventos.*.id' => 'nullable|integer',
            'eventos.*.nombre' => 'required|string|max:150',
            'eventos.*.fecha' => 'nullable|date_format:Y-m-d',
            'eventos.*.sede' => 'nullable|string|max:255',
            'eventos.*.cupo_transporte' => 'nullable|integer|min:0|max:100000',
            'eventos.*.cupo_lunch' => 'nullable|integer|min:0|max:100000',
        ], [], [
            'cupo_transporte' => 'cupo de transporte', 'cupo_lunch' => 'cupo de box lunch', 'max_transporte_club' => 'máximo de transporte por club',
            'max_lunch_club' => 'máximo de box lunch por club', 'fecha_limite_logistica' => 'fecha límite', 'eventos.*.nombre' => 'nombre del evento',
            'eventos.*.fecha' => 'fecha del evento', 'eventos.*.sede' => 'sede', 'eventos.*.cupo_transporte' => 'cupo de transporte del evento', 'eventos.*.cupo_lunch' => 'cupo de box lunch del evento',
        ]);
        if ($v['logistica_modo'] === 'evento' && count($v['eventos']) === 0) {
            throw ValidationException::withMessages(['eventos' => 'Con cupos por evento, agrega al menos un evento.']);
        }

        DB::transaction(function () use ($convocatoria, $v) {
            $cfg = EspecieConfig::where('convocatoria_id', $convocatoria->id)->lockForUpdate()->firstOrFail();
            // El box lunch nunca pasa del máximo de integrantes de la convocatoria; el transporte lo define el personal.
            if (isset($v['max_lunch_club']) && (int) $v['max_lunch_club'] > (int) $cfg->max_integrantes) {
                throw ValidationException::withMessages(['max_lunch_club' => "El box lunch por club no puede pasar del máximo de integrantes de la convocatoria ({$cfg->max_integrantes})."]);
            }
            $activas = ClubLogistica::whereIn('estado', ClubLogistica::APARTAN)->whereHas('club', fn ($q) => $q->where('convocatoria_id', $convocatoria->id));
            if ($v['logistica_modo'] !== LogisticaClub::modo($cfg) && (clone $activas)->exists()) {
                throw ValidationException::withMessages(['logistica_modo' => 'Ya hay solicitudes de transporte o box lunch: no se puede cambiar entre cupos por convocatoria y por evento.']);
            }
            $cfg->forceFill([
                'logistica_modo' => $v['logistica_modo'],
                'cupo_transporte' => $v['cupo_transporte'] ?? null, 'cupo_lunch' => $v['cupo_lunch'] ?? null,
                'max_transporte_club' => $v['max_transporte_club'] ?? null, 'max_lunch_club' => $v['max_lunch_club'] ?? null,
                'tope_integrantes' => (bool) ($v['tope_integrantes'] ?? true), 'acompanantes' => (int) ($v['acompanantes'] ?? 0),
                'fecha_limite_logistica' => $v['fecha_limite_logistica'] ?? null,
            ])->save();

            // Eventos: se actualizan por id; los que no llegan se borran solo si no tienen solicitudes.
            $actuales = EspecieEvento::where('convocatoria_id', $convocatoria->id)->get()->keyBy('id');
            $vistos = [];
            foreach ($v['eventos'] as $i => $e) {
                $datos = ['nombre' => trim(strip_tags($e['nombre'])), 'fecha' => $e['fecha'] ?? null, 'sede' => isset($e['sede']) ? trim(strip_tags($e['sede'])) : null,
                    'cupo_transporte' => $e['cupo_transporte'] ?? null, 'cupo_lunch' => $e['cupo_lunch'] ?? null, 'orden' => $i + 1];
                $ev = ! empty($e['id']) ? ($actuales->get((int) $e['id']) ?? throw ValidationException::withMessages(["eventos.$i.id" => 'Ese evento no es de esta convocatoria.'])) : new EspecieEvento();
                $ev->fill($datos);
                $ev->convocatoria_id = $convocatoria->id;
                $ev->save();
                $vistos[] = $ev->id;
            }
            foreach ($actuales->except($vistos) as $ev) {
                if (ClubLogistica::where('evento_id', $ev->id)->where('estado', '!=', 'cancelada')->exists()) {
                    throw ValidationException::withMessages(['eventos' => "El evento «{$ev->nombre}» ya tiene solicitudes; no se puede quitar."]);
                }
                $ev->delete();
            }
        });
        Audit::log('especie.logistica_configurada', $convocatoria, ['modo' => $v['logistica_modo']]);

        return response()->json($this->tablero($convocatoria->fresh()));
    }

    public function revisarFirmado(Request $request, ClubFirmado $firmado)
    {
        $club = $firmado->club;
        abort_unless($club && RevisionClub::puedeAceptar($request->user(), (int) $club->convocatoria_id), 404);
        $v = $request->validate(['resultado' => 'required|in:aprobar,rechazar', 'motivo' => 'nullable|string|max:2000|required_if:resultado,rechazar'],
            ['motivo.required_if' => 'Escribe el motivo del rechazo.'], ['motivo' => 'motivo']);
        LogisticaClub::revisarFirmado($firmado, $request->user(), $v['resultado'], $v['motivo'] ?? null);

        return response()->json(['logistica' => LogisticaClub::estado($club->fresh())]);
    }

    public function asignarKit(Request $request)
    {
        $v = $request->validate([
            'club_ids' => 'required|array|min:1|max:500',
            'club_ids.*' => 'integer|distinct',
            'fecha' => 'required|date_format:Y-m-d\TH:i',
            'lugar' => 'required|string|max:255',
        ], [], ['club_ids' => 'clubes', 'fecha' => 'fecha y hora', 'lugar' => 'lugar']);
        $fecha = \Carbon\Carbon::createFromFormat('Y-m-d\TH:i', $v['fecha'], 'America/Mexico_City')->utc();
        $hechos = LogisticaClub::asignarKit($v['club_ids'], $request->user(), $fecha, $v['lugar']);
        if (! $hechos) {
            throw ValidationException::withMessages(['club_ids' => 'Ninguno de los clubes elegidos está aceptado y pendiente de entrega en tus convocatorias.']);
        }

        return response()->json(['asignados' => count($hechos), 'omitidos' => count($v['club_ids']) - count($hechos)]);
    }

    public function entregarKit(Request $request, Club $club)
    {
        abort_unless(Alcance::puedeVerConvocatoria($request->user(), (int) $club->convocatoria_id), 404);
        abort_unless(RevisionClub::puedeAceptar($request->user(), (int) $club->convocatoria_id), 403);
        $v = $request->validate([
            'fecha' => 'required|date_format:Y-m-d\TH:i',
            'lugar' => 'required|string|max:255',
            'entrego' => 'required|string|max:150',
            'recibio' => 'required|string|max:150',
        ], [], ['fecha' => 'fecha y hora de entrega', 'lugar' => 'lugar de entrega', 'entrego' => 'quién entregó', 'recibio' => 'quién recibió']);
        $fecha = \Carbon\Carbon::createFromFormat('Y-m-d\TH:i', $v['fecha'], 'America/Mexico_City')->utc();
        if ($fecha->isFuture()) throw ValidationException::withMessages(['fecha' => 'La entrega no puede tener fecha futura.']);
        LogisticaClub::entregarKit($club, $request->user(), $fecha, $v['lugar'], $v['entrego'], $v['recibio']);

        return response()->json(RevisionClubController::detallePersonal($club->fresh(), $request->user()));
    }

    /** F4 — Excel de la convocatoria: clubes, integrantes, asistencia, transporte y box lunch, kits. */
    public function reporte(Request $request, Convocatoria $convocatoria)
    {
        $this->exigir($request, $convocatoria);
        Audit::log('especie.reporte_descargado', $convocatoria, []);
        $nombre = 'reporte-clubes-'.$convocatoria->id.'-'.now('America/Mexico_City')->format('Y-m-d').'.xlsx';

        return \Maatwebsite\Excel\Facades\Excel::download(new \App\Exports\ClubesEspecieExport($convocatoria), $nombre);
    }

    // ─────────── Apoyos ───────────

    private function exigir(Request $request, Convocatoria $c): void
    {
        abort_unless(Especie::esEspecie($c->loadMissing('tipoPrograma')), 404);
        abort_unless(Alcance::puedeVerConvocatoria($request->user(), $c->id), 404);
        abort_unless(RevisionClub::puedeAceptar($request->user(), $c->id), 403);
    }

    /** Configuración, uso de cupos y clubes aceptados con su logística (para el tablero del personal). */
    private function tablero(Convocatoria $c): array
    {
        $cfg = EspecieConfig::where('convocatoria_id', $c->id)->firstOrFail();
        $eventos = $cfg->eventos()->get();
        $modo = LogisticaClub::modo($cfg);
        $uso = $modo === 'evento'
            ? $eventos->map(fn ($e) => ['evento_id' => $e->id, 'nombre' => $e->nombre, 'transporte' => LogisticaClub::cupo($cfg, $e, 'transporte'), 'lunch' => LogisticaClub::cupo($cfg, $e, 'lunch')])->values()
            : [['evento_id' => null, 'nombre' => 'Convocatoria', 'transporte' => LogisticaClub::cupo($cfg, null, 'transporte'), 'lunch' => LogisticaClub::cupo($cfg, null, 'lunch')]];
        $clubes = Club::where('convocatoria_id', $c->id)->whereIn('estado', Club::ACEPTADOS)
            ->with(['escuela:id,cct,nombre,municipio,sistema', 'logisticas.evento:id,nombre', 'firmados'])->orderBy('nombre')->get();

        return [
            'config' => [
                'logistica_modo' => $modo, 'cupo_transporte' => $cfg->cupo_transporte, 'cupo_lunch' => $cfg->cupo_lunch,
                'max_transporte_club' => $cfg->max_transporte_club, 'max_lunch_club' => $cfg->max_lunch_club,
                'tope_integrantes' => (bool) $cfg->tope_integrantes, 'acompanantes' => (int) $cfg->acompanantes,
                'max_integrantes' => (int) $cfg->max_integrantes, 'modalidad' => $cfg->modalidad ?? 'estatal',
                'fecha_limite_logistica' => $cfg->fecha_limite_logistica?->format('Y-m-d'), 'kit_nombre' => $cfg->kit_nombre,
            ],
            'eventos' => $eventos->map(fn ($e) => ['id' => $e->id, 'nombre' => $e->nombre, 'fecha' => $e->fecha?->format('Y-m-d'), 'sede' => $e->sede,
                'cupo_transporte' => $e->cupo_transporte, 'cupo_lunch' => $e->cupo_lunch, 'con_solicitudes' => ClubLogistica::where('evento_id', $e->id)->where('estado', '!=', 'cancelada')->exists()])->values(),
            'uso' => $uso,
            'hay_solicitudes' => ClubLogistica::whereIn('estado', ClubLogistica::APARTAN)->whereHas('club', fn ($q) => $q->where('convocatoria_id', $c->id))->exists(),
            'clubes' => $clubes->map(function (Club $x) {
                $vig = fn (string $tipo, ?int $log = null) => $x->firmados->first(fn ($f) => $f->tipo === $tipo && ($log === null || (int) $f->logistica_id === $log) && $f->estado !== 'reemplazado');

                return [
                    'id' => $x->id, 'folio' => $x->folio, 'nombre' => $x->nombre, 'estado' => $x->estado,
                    'escuela' => $x->escuela, 'estatal' => $x->escuela?->sistema === 'estatal',
                    'kit' => ['fecha' => $x->kit_fecha, 'lugar' => $x->kit_lugar, 'entregado_at' => $x->kit_entregado_at],
                    'resguardo' => $vig('resguardo')?->estado,
                    'solicitudes' => $x->logisticas->where('estado', '!=', 'cancelada')->map(fn ($l) => ['id' => $l->id, 'evento' => $l->evento?->nombre,
                        'transporte' => $l->transporte, 'lunch' => $l->lunch, 'estado' => $l->estado, 'documento' => $vig('solicitud', $l->id)?->estado])->values(),
                    'pendientes_validar' => $x->firmados->where('estado', 'pendiente')->count(),
                    'qr' => \App\Support\QrClub::habilitado($x),
                ];
            })->values(),
        ];
    }
}
