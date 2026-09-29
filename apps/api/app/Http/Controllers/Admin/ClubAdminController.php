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
            ->orderByDesc('fecha_apertura')->get(['id', 'nombre', 'fecha_apertura', 'fecha_cierre', 'estado']));
    }

    public function index(Request $request, Convocatoria $convocatoria)
    {
        abort_unless(Especie::esEspecie($convocatoria->loadMissing('tipoPrograma')), 404);
        Alcance::exigirConvocatoria($request->user(), $convocatoria->id);
        $request->validate(['estado' => 'nullable|string|max:30', 'q' => 'nullable|string|max:120']);
        $q = Club::where('convocatoria_id', $convocatoria->id)->with(['escuela:id,cct,nombre,municipio,sistema,nivel', 'lider:id,name,email,telefono'])->withCount('integrantes');
        if ($request->filled('estado')) $q->where('estado', $request->input('estado'));
        if ($t = trim((string) $request->input('q'))) {
            $q->where(fn ($w) => $w->where('nombre', 'ilike', "%{$t}%")->orWhere('folio', 'ilike', "%{$t}%")->orWhereHas('escuela', fn ($e) => $e->where('nombre', 'ilike', "%{$t}%")->orWhere('cct', 'ilike', "%{$t}%")));
        }

        return response()->json($q->orderByDesc('updated_at')->limit(500)->get()->map(fn (Club $c) => [
            'id' => $c->id, 'folio' => $c->folio, 'nombre' => $c->nombre, 'estado' => $c->estado, 'logo_url' => $c->logo_url,
            'enviado_at' => $c->enviado_at, 'integrantes_count' => $c->integrantes_count,
            'escuela' => $c->escuela, 'lider' => $c->lider,
        ]));
    }

    public function show(Request $request, Club $club)
    {
        Alcance::exigirConvocatoria($request->user(), $club->convocatoria_id);
        $club->loadMissing(['escuela', 'lider:id,name,email,telefono,cargo,municipio', 'integrantes', 'documentos', 'convocatoria.tipoPrograma']);
        $ctl = app(ClubController::class);

        return response()->json([
            'club' => [
                'id' => $club->id, 'folio' => $club->folio, 'nombre' => $club->nombre, 'estado' => $club->estado,
                'logo_url' => $club->logo_url, 'datos' => $club->datos ?? [], 'enviado_at' => $club->enviado_at,
                'escuela' => $club->escuela, 'lider' => $club->lider,
            ],
            'integrantes' => $club->integrantes->values(),
            'documentos' => $club->documentos->map(fn ($d) => ['clave' => $d->clave, 'nombre_original' => $d->nombre_original, 'subido_at' => $d->updated_at])->values(),
            'config' => EspecieConfigController::payload($club->convocatoria, $club->convocatoria->especieConfig ?? new \App\Models\EspecieConfig()),
            'faltantes' => $club->estado === 'borrador' ? $ctl->faltantes($club) : [],
        ]);
    }
}
