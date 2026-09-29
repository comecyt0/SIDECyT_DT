<?php

namespace App\Exports;

use App\Models\Club;
use App\Models\ClubLogistica;
use App\Models\ClubRegistroEvento;
use App\Models\Convocatoria;
use App\Support\LogisticaClub;
use App\Support\QrClub;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

/**
 * E52 · F4 — Reportes de una convocatoria de Apoyo en especie (decisión del usuario, §14): clubes aceptados con sus datos
 * de contacto, integrantes con todos sus datos, asistencia por evento, transporte y box lunch (solicitado, entregado y
 * cupo) y kits entregados. Solo admin y admin de convocatoria con alcance. Todo texto pasa por la defensa contra
 * inyección de fórmulas (SolicitudesExport::celda).
 */
class ClubesEspecieExport implements WithMultipleSheets
{
    private const TZ = 'America/Mexico_City';

    public function __construct(private Convocatoria $convocatoria) {}

    public function sheets(): array
    {
        $c = $this->convocatoria;
        $cfg = LogisticaClub::config($c->id);
        $eventos = $cfg->exists ? $cfg->eventos()->get() : collect();
        $clubes = Club::where('convocatoria_id', $c->id)->whereIn('estado', Club::ACEPTADOS)
            ->with(['escuela', 'lider:id,name,email,telefono', 'integrantes', 'kitRegistrador:id,name'])->orderBy('nombre')->get();
        $ids = $clubes->pluck('id');
        $f = fn ($d) => $d ? \Carbon\Carbon::parse($d)->setTimezone(self::TZ)->format('d/m/Y H:i') : '';
        $s = fn ($v) => SolicitudesExport::celda($v === null ? '' : (string) $v);

        $hClubes = ['Folio', 'Club', 'Estado', 'Escuela', 'CCT', 'Municipio', 'Sistema', 'Líder', 'Correo del líder', 'Teléfono del líder', 'Integrantes', 'QR habilitado', 'Kit entregado'];
        $rClubes = $clubes->map(fn (Club $x) => [
            $s($x->folio), $s($x->nombre), $x->estado === 'kit_entregado' ? 'Kit entregado' : 'Aceptado', $s($x->escuela?->nombre), $s($x->escuela?->cct),
            $s($x->escuela?->municipio), $s($x->escuela?->sistema), $s($x->lider?->name), $s($x->lider?->email), $s($x->lider?->telefono),
            $x->integrantes->count(), QrClub::habilitado($x) ? 'Sí' : 'No', $x->kit_entregado_at ? 'Sí' : 'No',
        ])->all();

        $hInt = ['Folio del club', 'Club', 'Nombre', 'Papel', 'Fecha de nacimiento', 'Sexo', 'CURP', 'Grado y grupo', 'Correo', 'Teléfono', 'Otros datos'];
        $rInt = [];
        foreach ($clubes as $x) {
            foreach ($x->integrantes as $i) {
                $otros = collect(is_array($i->datos) ? $i->datos : [])->map(fn ($v, $k) => $k.': '.(is_scalar($v) ? $v : json_encode($v, JSON_UNESCAPED_UNICODE)))->implode('; ');
                $rInt[] = [$s($x->folio), $s($x->nombre), $s($i->nombre), $i->es_lider ? 'Líder' : 'Integrante', $i->fecha_nacimiento?->format('d/m/Y') ?? '',
                    $s($i->sexo), $s($i->curp), $s($i->grado_grupo), $s($i->correo), $s($i->telefono), $s($otros)];
            }
        }

        $regs = ClubRegistroEvento::whereIn('club_id', $ids)->with(['evento:id,nombre,fecha', 'registrador:id,name'])->get();
        $porClub = $clubes->keyBy('id');
        $hAsis = ['Evento', 'Fecha del evento', 'Folio', 'Club', 'Integrantes registrados', 'Asistentes', 'Método', 'Registró', 'Última actualización'];
        $rAsis = $regs->where('tipo', 'asistencia')->sortBy(fn ($r) => [$r->evento?->fecha, $r->evento_id])->map(fn ($r) => [
            $s($r->evento?->nombre), $r->evento?->fecha?->format('d/m/Y') ?? '', $s($porClub[$r->club_id]->folio), $s($porClub[$r->club_id]->nombre),
            $porClub[$r->club_id]->integrantes->count(), $r->cantidad, $r->metodo === 'qr' ? 'QR' : 'Manual', $s($r->registrador?->name), $f($r->updated_at),
        ])->values()->all();

        $modo = LogisticaClub::modo($cfg);
        $cupos = [];
        foreach ($modo === 'evento' ? $eventos : [null] as $ev) {
            $cupos[$ev?->id ?? 0] = ['t' => LogisticaClub::cupo($cfg, $ev, 'transporte'), 'l' => LogisticaClub::cupo($cfg, $ev, 'lunch')];
        }
        $lunchEntregado = $regs->where('tipo', 'lunch')->groupBy('club_id');
        $hLog = ['Evento', 'Folio', 'Club', 'Transporte solicitado', 'Box lunch solicitado', 'Estado de la solicitud', 'Box lunch entregado', 'Cupo de transporte', 'Transporte apartado', 'Cupo de box lunch', 'Box lunch apartado'];
        $estados = ['enviada' => 'Enviada (falta formato firmado)', 'firmada' => 'Formato por validar', 'aprobada' => 'Aprobada', 'rechazada' => 'Rechazada'];
        $rLog = ClubLogistica::whereIn('club_id', $ids)->where('estado', '!=', 'cancelada')->with('evento:id,nombre')->orderBy('evento_id')->get()->map(function ($l) use ($s, $porClub, $cupos, $lunchEntregado, $modo, $estados) {
            $cu = $cupos[$modo === 'evento' ? ($l->evento_id ?? 0) : 0] ?? null;
            $ent = $lunchEntregado->get($l->club_id)?->when($modo === 'evento', fn ($g) => $g->where('evento_id', $l->evento_id))->sum('cantidad') ?? 0;

            return [$s($l->evento?->nombre ?? 'Convocatoria'), $s($porClub[$l->club_id]->folio), $s($porClub[$l->club_id]->nombre), $l->transporte, $l->lunch,
                $estados[$l->estado] ?? $l->estado, $ent, $cu['t']['total'] ?? 'Sin tope', $cu['t']['usado'] ?? '', $cu['l']['total'] ?? 'Sin tope', $cu['l']['usado'] ?? ''];
        })->all();

        $hKit = ['Folio', 'Club', 'Kit', 'Entrega programada', 'Lugar programado', 'Entregado', 'Lugar de entrega', 'Entregó', 'Recibió', 'Registró'];
        $rKit = $clubes->filter(fn ($x) => $x->kit_entregado_at)->map(fn (Club $x) => [
            $s($x->folio), $s($x->nombre), $s($cfg->kit_nombre), $f($x->kit_fecha), $s($x->kit_lugar), $f($x->kit_entregado_at), $s($x->kit_entregado_lugar),
            $s($x->kit_entrego), $s($x->kit_recibio), $s($x->kitRegistrador?->name),
        ])->values()->all();

        return [
            new HojaReporte('Clubes aceptados', $hClubes, $rClubes),
            new HojaReporte('Integrantes', $hInt, $rInt),
            new HojaReporte('Asistencia por evento', $hAsis, $rAsis),
            new HojaReporte('Transporte y box lunch', $hLog, $rLog),
            new HojaReporte('Kits entregados', $hKit, $rKit),
        ];
    }
}

