<?php

namespace App\Http\Controllers\Club;

use App\Http\Controllers\Admin\EspecieConfigController;
use App\Http\Controllers\Controller;
use App\Models\Club;
use App\Models\Convocatoria;
use App\Models\EspecieConfig;
use App\Models\User;
use App\Support\Alcance;
use App\Support\Audit;
use App\Support\Especie;
use App\Support\RevisionClub;
use App\Support\TiposArchivo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * E52 · F2 — Revisión de clubes para el personal (admin, admin de convocatoria y revisor documental, cada uno con su
 * alcance). Bandeja, ficha con historial, resolver la etapa (aprobar / observar / rechazar), prórroga de un plazo vencido,
 * visto bueno, decisión del comité y acta del comité. Las reglas viven en App\Support\RevisionClub; aquí solo se valida
 * la entrada y se comprueba que la persona vea la convocatoria (404 si no: no confirma que el club exista).
 */
class RevisionClubController extends Controller
{
    public const DIR_ACTAS = 'especie_actas';

    /** Bandeja: `pendientes` = lo que esta persona puede resolver ahora; `comite` = aprobados en revisión; `todos`. */
    public function index(Request $request)
    {
        $v = $request->validate([
            'vista' => 'nullable|in:pendientes,comite,todos',
            'convocatoria_id' => 'nullable|integer',
            'q' => 'nullable|string|max:120',
        ]);
        $u = $request->user();
        $rol = RevisionClub::rolDe($u);
        $q = Club::query()->with(['escuela:id,cct,nombre,municipio,sistema', 'etapaActual', 'convocatoria:id,nombre'])->withCount('integrantes')
            ->whereHas('convocatoria', fn ($c) => $c->whereNull('deleted_at'))->where('estado', '!=', 'borrador');
        Alcance::aplicar($q, $u);
        if (! empty($v['convocatoria_id'])) $q->where('convocatoria_id', (int) $v['convocatoria_id']);
        if ($t = trim((string) ($v['q'] ?? ''))) {
            $q->where(fn ($w) => $w->where('nombre', 'ilike', "%{$t}%")->orWhere('folio', 'ilike', "%{$t}%")
                ->orWhereHas('escuela', fn ($e) => $e->where('nombre', 'ilike', "%{$t}%")->orWhere('cct', 'ilike', "%{$t}%")));
        }
        $vista = $v['vista'] ?? 'pendientes';
        if ($vista === 'pendientes') {
            $revisa = match ($rol) { 'admin' => ['revisor', 'admin_convocatoria', 'ambos'], 'admin_convocatoria' => ['admin_convocatoria', 'ambos'], 'revisor' => ['revisor', 'ambos'], default => [] };
            $q->whereIn('estado', ['enviado', 'subsanado', 'observado'])->whereHas('etapaActual', fn ($e) => $e->whereIn('revisa', $revisa));
        } elseif ($vista === 'comite') {
            abort_unless($rol === 'admin' || $rol === 'admin_convocatoria', 403);
            $q->whereIn('estado', ['aprobado_revision', 'aceptado', 'kit_entregado']);
        }
        $clubes = $q->orderByRaw("CASE estado WHEN 'subsanado' THEN 0 WHEN 'enviado' THEN 1 WHEN 'observado' THEN 2 ELSE 3 END")
            ->orderBy('enviado_at')->limit(500)->get();
        // E70: con personas asignadas por etapa, «Por revisar» muestra solo lo que esta persona puede resolver.
        if ($vista === 'pendientes') $clubes = $clubes->filter(fn (Club $c) => RevisionClub::puedeResolver($u, $c))->values();

        return response()->json($clubes->map(fn (Club $c) => [
            'id' => $c->id, 'folio' => $c->folio, 'nombre' => $c->nombre, 'estado' => $c->estadoVisible(), 'logo_url' => $c->logo_url,
            'convocatoria_corto' => $c->convocatoria?->nombre_corto,
            'enviado_at' => $c->enviado_at, 'vence_at' => $c->vence_at, 'integrantes_count' => $c->integrantes_count,
            'etapa' => $c->etapaActual ? ['orden' => $c->etapaActual->orden, 'nombre' => $c->etapaActual->nombre] : null,
            'visto_bueno_at' => $c->visto_bueno_at, 'comite_resultado' => $c->comite_resultado,
            'escuela' => $c->escuela, 'convocatoria' => $c->convocatoria ? ['id' => $c->convocatoria->id, 'nombre' => $c->convocatoria->nombre, 'nombre_corto' => $c->convocatoria->nombre_corto] : null,
            'puede_resolver' => RevisionClub::puedeResolver(request()->user(), $c),
        ])->values());
    }

    public function show(Request $request, Club $club)
    {
        $this->exigirVer($request->user(), $club);

        return response()->json(self::detallePersonal($club, $request->user()));
    }

    public function resolver(Request $request, Club $club)
    {
        $this->exigirVer($request->user(), $club);
        $v = $request->validate([
            'resultado' => 'required|in:aprobar,observar,rechazar',
            'comentario' => 'nullable|string|max:3000|required_if:resultado,observar,rechazar',
        ], ['comentario.required_if' => 'Escribe el comentario para el líder (qué corregir o el motivo).'], ['comentario' => 'comentario']);
        RevisionClub::resolver($club, $request->user(), $v['resultado'], $v['comentario'] ?? null);

        return response()->json(self::detallePersonal($club->fresh(), $request->user()));
    }

    public function prorroga(Request $request, Club $club)
    {
        $this->exigirVer($request->user(), $club);
        $v = $request->validate(['horas' => 'required|integer|min:1|max:168', 'motivo' => 'required|string|max:1000'], [], ['horas' => 'horas', 'motivo' => 'motivo']);
        RevisionClub::prorroga($club, $request->user(), (int) $v['horas'], $v['motivo']);

        return response()->json(self::detallePersonal($club->fresh(), $request->user()));
    }

    public function vistoBueno(Request $request, Club $club)
    {
        $this->exigirAceptar($request->user(), $club);
        RevisionClub::vistoBueno($club, $request->user());

        return response()->json(self::detallePersonal($club->fresh(), $request->user()));
    }

    public function comite(Request $request, Club $club)
    {
        $this->exigirAceptar($request->user(), $club);
        $v = $request->validate(['resultado' => 'required|in:aceptado,no_aceptado', 'motivo' => 'nullable|string|max:2000'], [], ['motivo' => 'motivo']);
        RevisionClub::comite($club, $request->user(), $v['resultado'], $v['motivo'] ?? null);

        return response()->json(self::detallePersonal($club->fresh(), $request->user()));
    }

    // ─────────── Acta del comité (una por convocatoria) ───────────

    public function subirActa(Request $request, Convocatoria $convocatoria)
    {
        abort_unless(Especie::esEspecie($convocatoria->loadMissing('tipoPrograma')), 404);
        // E70: también la persona asignada a una etapa de la convocatoria (pedido del usuario).
        abort_unless(RevisionClub::puedeSubirActa($request->user(), $convocatoria->id), 404);
        $request->validate(['archivo' => 'required|file|max:'.(10 * 1024)]);
        $ext = TiposArchivo::validar($request->file('archivo'), ['pdf'], 10, 'archivo');
        $cfg = $convocatoria->especieConfig ?? abort(404);
        $interno = Str::random(40).'.'.$ext;
        Storage::disk('local')->put(self::DIR_ACTAS.'/'.$convocatoria->id.'/'.$interno, file_get_contents($request->file('archivo')->getPathname()));
        $anterior = $cfg->acta_comite;
        $cfg->forceFill([
            'acta_comite' => $interno,
            'acta_comite_nombre' => mb_substr(preg_replace('/[^\pL\pN ._\-()]/u', '_', (string) $request->file('archivo')->getClientOriginalName()), 0, 200),
            'acta_comite_at' => now(), 'acta_comite_por' => $request->user()->id,
        ])->save();
        // Se conserva el acta anterior en el disco (historial); solo cambia la vigente.
        Audit::log('especie.acta_comite', $convocatoria, ['reemplaza' => (bool) $anterior]);

        return response()->json(['acta_comite' => ['nombre' => $cfg->acta_comite_nombre, 'subida_at' => $cfg->acta_comite_at]], 201);
    }

    public function descargarActa(Request $request, Convocatoria $convocatoria)
    {
        abort_unless(Alcance::puedeVerConvocatoria($request->user(), $convocatoria->id), 404);
        $cfg = $convocatoria->especieConfig;
        abort_unless($cfg && $cfg->acta_comite && preg_match('/^[A-Za-z0-9]{40}\.pdf$/', $cfg->acta_comite), 404);
        $ruta = self::DIR_ACTAS.'/'.$convocatoria->id.'/'.$cfg->acta_comite;
        abort_unless(Storage::disk('local')->exists($ruta), 404);

        return response()->file(Storage::disk('local')->path($ruta), [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="acta-comite-'.$convocatoria->id.'.pdf"',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    // ─────────── Apoyos ───────────

    private function exigirVer(User $u, Club $club): void
    {
        abort_unless(Alcance::puedeVerConvocatoria($u, (int) $club->convocatoria_id), 404);
    }

    private function exigirAceptar(User $u, Club $club): void
    {
        $this->exigirVer($u, $club);
        abort_unless(RevisionClub::puedeAceptar($u, (int) $club->convocatoria_id), 403);
    }

    /** Ficha completa del club para el personal: datos, avance, historial con quién resolvió y qué puede hacer esta persona. */
    public static function detallePersonal(Club $club, User $u): array
    {
        $club->loadMissing(['escuela', 'lider:id,name,email,telefono,cargo,municipio', 'integrantes', 'documentos', 'convocatoria.tipoPrograma', 'etapaActual']);
        $cfg = $club->convocatoria->especieConfig ?? new EspecieConfig();
        $puedeAceptar = RevisionClub::puedeAceptar($u, (int) $club->convocatoria_id);

        return [
            'club' => [
                'id' => $club->id, 'folio' => $club->folio, 'nombre' => $club->nombre, 'estado' => $club->estadoVisible(),
                'logo_url' => $club->logo_url, 'datos' => $club->datos ?? [], 'enviado_at' => $club->enviado_at,
                'escuela' => $club->escuela, 'lider' => $club->lider, 'convocatoria_corto' => $club->convocatoria->nombre_corto,
            ] + ClubController::avance($club),
            'integrantes' => $club->integrantes->values(),
            'documentos' => $club->documentos->map(fn ($d) => ['clave' => $d->clave, 'nombre_original' => $d->nombre_original, 'subido_at' => $d->updated_at])->values(),
            'config' => EspecieConfigController::payloadPersonal($club->convocatoria, $cfg),
            'faltantes' => $club->estado === 'borrador' ? app(ClubController::class)->faltantes($club) : [],
            'historial' => $club->revisiones()->with(['etapa:id,nombre', 'usuario:id,name'])->get()->map(fn ($r) => [
                'resultado' => $r->resultado, 'etapa' => $r->etapa?->nombre, 'ronda' => $r->ronda, 'comentario' => $r->comentario,
                'horas' => $r->horas, 'vence_at' => $r->vence_at, 'fecha' => $r->created_at, 'rol' => $r->rol, 'quien' => $r->usuario?->name,
            ])->values(),
            'logistica' => \App\Support\LogisticaClub::aplica($club) ? \App\Support\LogisticaClub::estado($club) : null,
            // E70: quién revisa la etapa actual y cuántas aprobaciones van (solo personal; lista blanca de nombres).
            'aprobaciones' => $club->etapaActual ? (function () use ($club, $u) {
                $dadas = RevisionClub::aprobacionesActuales($club);
                $asignados = $club->etapaActual->revisores()->get(['users.id', 'users.name']);

                return [
                    'requeridas' => max(1, (int) $club->etapaActual->aprobaciones_requeridas), 'dadas' => $dadas->count(),
                    'ya_aprobe' => $dadas->contains((int) $u->id),
                    'asignados' => $asignados->map(fn ($x) => ['nombre' => $x->name, 'aprobo' => $dadas->contains((int) $x->id)])->values(),
                ];
            })() : null,
            'permisos' => [
                'logistica' => $puedeAceptar && \App\Support\LogisticaClub::aplica($club),
                'resolver' => RevisionClub::puedeResolver($u, $club) && ! $club->vencido(),
                'observar' => RevisionClub::puedeResolver($u, $club) && ! $club->vencido() && $club->etapaActual && $club->ronda < $club->etapaActual->max_subsanaciones,
                'rechazar' => RevisionClub::puedeResolver($u, $club),
                'prorroga' => RevisionClub::puedeResolver($u, $club) && $club->vencido(),
                'visto_bueno' => $puedeAceptar && $club->estado === 'aprobado_revision' && ! $club->visto_bueno_at,
                'comite' => $puedeAceptar && $club->estado === 'aprobado_revision' && (bool) $club->visto_bueno_at && (bool) $cfg->acta_comite,
                'acta' => RevisionClub::puedeSubirActa($u, (int) $club->convocatoria_id),
            ],
        ];
    }
}
