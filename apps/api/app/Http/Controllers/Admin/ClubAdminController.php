<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Club\ClubController;
use App\Http\Controllers\Controller;
use App\Models\Club;
use App\Models\Convocatoria;
use App\Support\Alcance;
use App\Support\Especie;
use Illuminate\Http\Request;

/**
 * E52 · F1 — Vista del personal sobre los clubes (admin, admin de convocatoria y consulta, con su alcance). En F1 es de
 * lectura: lista por convocatoria y detalle completo. La revisión, el comité y la aceptación llegan en F2.
 */
class ClubAdminController extends Controller
{
    /** Convocatorias de Apoyo en especie visibles para el usuario, con conteo de clubes por estado. */
    public function convocatorias(Request $request)
    {
        $q = Convocatoria::whereNull('deleted_at')->whereHas('tipoPrograma', fn ($t) => $t->where('tipo_apoyo', Especie::TIPO_APOYO));
        Alcance::aplicar($q, $request->user(), 'id');

        return response()->json($q->withCount(['clubes', 'clubes as enviados_count' => fn ($c) => $c->where('estado', '!=', 'borrador')])
            ->orderByDesc('fecha_apertura')->get(['id', 'nombre', 'nombre_corto', 'fecha_apertura', 'fecha_cierre', 'estado']));
    }

    public function index(Request $request, Convocatoria $convocatoria)
    {
        abort_unless(Especie::esEspecie($convocatoria->loadMissing('tipoPrograma')), 404);
        Alcance::exigirConvocatoria($request->user(), $convocatoria->id);
        $request->validate(['estado' => 'nullable|string|max:30', 'q' => 'nullable|string|max:120']);
        $q = Club::where('convocatoria_id', $convocatoria->id)->with(['escuela:id,cct,nombre,municipio,sistema,nivel', 'lider:id,name,email,telefono'])->withCount('integrantes');
        // "vencido" no se guarda: es observado con el plazo pasado (E52 · F2).
        match ($request->input('estado')) {
            null, '' => null,
            'vencido' => $q->where('estado', 'observado')->where('vence_at', '<', now()),
            'observado' => $q->where('estado', 'observado')->where(fn ($w) => $w->whereNull('vence_at')->orWhere('vence_at', '>=', now())),
            default => $q->where('estado', $request->input('estado')),
        };
        if ($t = trim((string) $request->input('q'))) {
            $t = addcslashes($t, '%_\\');
            $q->where(fn ($w) => $w->where('nombre', 'ilike', "%{$t}%")->orWhere('folio', 'ilike', "%{$t}%")->orWhereHas('escuela', fn ($e) => $e->where('nombre', 'ilike', "%{$t}%")->orWhere('cct', 'ilike', "%{$t}%")));
        }

        return response()->json($q->orderByDesc('updated_at')->limit(500)->get()->map(fn (Club $c) => [
            'id' => $c->id, 'folio' => $c->folio, 'nombre' => $c->nombre, 'estado' => $c->estadoVisible(), 'logo_url' => $c->logo_url,
            'enviado_at' => $c->enviado_at, 'integrantes_count' => $c->integrantes_count, 'vence_at' => $c->vence_at,
            'visto_bueno_at' => $c->visto_bueno_at, 'comite_resultado' => $c->comite_resultado,
            'escuela' => $c->escuela, 'lider' => $c->lider, 'convocatoria_corto' => $convocatoria->nombre_corto,
        ]));
    }

    public function show(Request $request, Club $club)
    {
        Alcance::exigirConvocatoria($request->user(), $club->convocatoria_id);

        // E52 · F2: misma ficha que la revisión (avance, historial y permisos de esta persona; consulta no tiene acciones).
        return response()->json(\App\Http\Controllers\Club\RevisionClubController::detallePersonal($club, $request->user()));
    }
}
