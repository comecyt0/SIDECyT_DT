<?php

namespace App\Http\Controllers\Club;

use App\Http\Controllers\Controller;
use App\Models\Club;
use App\Models\Convocatoria;
use App\Support\Alcance;
use App\Support\EventoClub;
use App\Support\QrClub;
use Illuminate\Http\Request;

/**
 * E52 · F4 — Escaneo en eventos (admin, admin de convocatoria y operador de evento, en las convocatorias de su alcance):
 * eventos disponibles, leer un QR, buscar un club a mano (respaldo si la cámara falla), ver su ficha y registrar
 * asistencia, box lunch o kit. Un QR ajeno, revocado o de otra convocatoria responde lo mismo: 404 genérico.
 */
class EscaneoController extends Controller
{
    public function eventos(Request $request)
    {
        $q = Convocatoria::whereNull('deleted_at')->whereHas('tipoPrograma', fn ($t) => $t->where('tipo_apoyo', 'especie'))
            ->with(['especieConfig.eventos']);
        Alcance::aplicar($q, $request->user(), 'id');

        return response()->json($q->orderByDesc('fecha_apertura')->limit(50)->get()->map(fn (Convocatoria $c) => [
            'id' => $c->id, 'nombre' => $c->nombre,
            'eventos' => ($c->especieConfig?->eventos ?? collect())->map(fn ($e) => ['id' => $e->id, 'nombre' => $e->nombre, 'fecha' => $e->fecha?->format('Y-m-d'), 'sede' => $e->sede])->values(),
        ])->values());
    }

    /** Contenido leído por la cámara → ficha del club (si su QR está vigente y es de una convocatoria que opera). */
    public function qr(Request $request)
    {
        $v = $request->validate(['contenido' => 'required|string|max:200', 'evento_id' => 'nullable|integer']);
        $club = QrClub::buscar($v['contenido']);
        if (! $club || ! EventoClub::puedeOperar($request->user(), (int) $club->convocatoria_id)) {
            return response()->json(['message' => 'QR no válido, revocado o de una convocatoria que no operas.'], 404);
        }

        return response()->json(EventoClub::ficha($club, $request->user(), EventoClub::evento($club, $v['evento_id'] ?? null)));
    }

    /** Búsqueda manual por nombre, folio o escuela (clubes aceptados de sus convocatorias). */
    public function buscar(Request $request)
    {
        $v = $request->validate(['q' => 'required|string|min:2|max:120', 'convocatoria_id' => 'nullable|integer']);
        $t = trim($v['q']);
        $q = Club::whereIn('estado', Club::ACEPTADOS)->with('escuela:id,nombre,municipio')
            ->where(fn ($w) => $w->where('nombre', 'ilike', "%{$t}%")->orWhere('folio', 'ilike', "%{$t}%")
                ->orWhereHas('escuela', fn ($e) => $e->where('nombre', 'ilike', "%{$t}%")->orWhere('cct', 'ilike', "%{$t}%")));
        if (! empty($v['convocatoria_id'])) $q->where('convocatoria_id', (int) $v['convocatoria_id']);
        Alcance::aplicar($q, $request->user());

        return response()->json($q->orderBy('nombre')->limit(20)->get()->map(fn (Club $c) => [
            'id' => $c->id, 'folio' => $c->folio, 'nombre' => $c->nombre, 'escuela' => $c->escuela?->nombre, 'municipio' => $c->escuela?->municipio,
        ])->values());
    }

    public function ficha(Request $request, Club $club)
    {
        abort_unless(EventoClub::puedeOperar($request->user(), (int) $club->convocatoria_id), 404);
        $request->validate(['evento_id' => 'nullable|integer']);

        return response()->json(EventoClub::ficha($club, $request->user(), EventoClub::evento($club, $request->integer('evento_id') ?: null)));
    }

    public function registrar(Request $request)
    {
        $v = $request->validate([
            'club_id' => 'required|integer',
            'tipo' => 'required|in:'.implode(',', EventoClub::TIPOS),
            'evento_id' => 'nullable|integer|required_unless:tipo,kit',
            'cantidad' => 'nullable|integer|min:1|max:500|required_unless:tipo,kit',
            'recibio' => 'nullable|string|max:150|required_if:tipo,kit',
            'metodo' => 'required|in:qr,manual',
        ], ['evento_id.required_unless' => 'Elige el evento.', 'cantidad.required_unless' => 'Escribe la cantidad.', 'recibio.required_if' => 'Escribe quién recibe el kit.'],
            ['cantidad' => 'cantidad', 'recibio' => 'quién recibe']);
        $club = Club::find($v['club_id']);
        abort_unless($club && EventoClub::puedeOperar($request->user(), (int) $club->convocatoria_id), 404);
        $r = EventoClub::registrar($club, $request->user(), $v['tipo'], $v['evento_id'] ?? null, $v['cantidad'] ?? null, $v['metodo'], $v['recibio'] ?? null);
        $club->refresh();

        return response()->json($r + ['ficha' => EventoClub::ficha($club, $request->user(), EventoClub::evento($club, $v['evento_id'] ?? null))]);
    }
}
