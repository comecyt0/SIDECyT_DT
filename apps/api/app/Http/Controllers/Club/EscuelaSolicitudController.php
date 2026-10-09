<?php

namespace App\Http\Controllers\Club;

use App\Http\Controllers\Controller;
use App\Models\Club;
use App\Models\Convocatoria;
use App\Models\Escuela;
use App\Models\EscuelaSolicitud;
use App\Models\User;
use App\Notifications\EscuelaSolicitudAviso;
use App\Support\Alcance;
use App\Support\Audit;
use App\Support\Especie;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * E55 (02/10/2026) — Solicitud de registro de escuela (decisiones del usuario):
 *  - El líder la envía con los datos del catálogo + contacto (dirección, teléfono, director/a). Si la CCT ya está en el
 *    catálogo o ya la pidió alguien, se avisa que ya se registró y que contacte a la dirección escolar o al COMECYT.
 *  - Mientras está pendiente, su club puede quedar con la escuela «en revisión» (no se puede enviar).
 *  - La resuelven admin y admin de convocatoria (solo las de sus convocatorias; a los demás, 404). Al aceptar pueden
 *    corregir los datos; la escuela entra al catálogo y se asigna sola a los clubes que la esperaban. Al rechazar, motivo
 *    obligatorio; el líder puede corregir y volver a solicitar, o elegir otra escuela.
 *  - Avisos por campana y correo a ambos lados. Todo queda en la bitácora.
 */
class EscuelaSolicitudController extends Controller
{
    /** Pendientes por líder (evita usar el formulario como canal de spam). */
    public const MAX_PENDIENTES_POR_LIDER = 3;

    public const AVISO_YA_REGISTRADA = 'Esta escuela ya está registrada en el catálogo. Búscala por su CCT; si no puedes elegirla, comunícate con la dirección escolar o con un administrador del COMECYT.';

    public const AVISO_YA_SOLICITADA = 'Esta escuela ya fue solicitada por otra persona y está en revisión. Comunícate con la dirección escolar o con un administrador del COMECYT.';

    // ─────────────────────────── Líder ───────────────────────────

    public function misSolicitudes(Request $request)
    {
        return response()->json(EscuelaSolicitud::where('user_id', $request->user()->id)->orderByDesc('id')->limit(20)
            ->get(['id', 'convocatoria_id', 'cct', 'nombre', 'municipio', 'nivel', 'sistema', 'estado', 'motivo', 'escuela_id', 'created_at', 'revisado_at']));
    }

    public function store(Request $request)
    {
        $u = $request->user();
        // E61: las solicitudes de escuela las hace el líder (el acompañante solo sigue el club).
        abort_unless($u->tieneRol('lider_club'), 403, 'Solo el líder del club puede solicitar el registro de una escuela.');
        $v = $this->validarDatos($request, true);
        $conv = Convocatoria::with('tipoPrograma')->whereNull('deleted_at')->find($v['convocatoria_id']);
        if (! $conv || ! Especie::esEspecie($conv)) {
            throw ValidationException::withMessages(['convocatoria_id' => 'Esa convocatoria no registra clubes escolares.']);
        }
        if (EscuelaSolicitud::where('user_id', $u->id)->where('estado', 'pendiente')->count() >= self::MAX_PENDIENTES_POR_LIDER) {
            throw ValidationException::withMessages(['cct' => 'Ya tienes '.self::MAX_PENDIENTES_POR_LIDER.' solicitudes de escuela en revisión. Espera la respuesta del COMECYT.']);
        }
        $this->exigirCctLibre($v['cct']);

        try {
            $s = new EscuelaSolicitud($v);
            $s->forceFill(['user_id' => $u->id, 'convocatoria_id' => $conv->id, 'estado' => 'pendiente'])->save();
        } catch (\Illuminate\Database\QueryException $e) {
            // Índice único parcial: otra persona la pidió en el mismo instante.
            if (in_array($e->getCode(), ['23505', '23000'], true)) throw ValidationException::withMessages(['cct' => self::AVISO_YA_SOLICITADA]);
            throw $e;
        }
        Audit::log('escuela.solicitud_enviada', $s, ['cct' => $s->cct, 'convocatoria_id' => $conv->id]);
        foreach (self::revisoresDe($conv->id) as $staff) $staff->notify(new EscuelaSolicitudAviso($s, 'nueva'));

        return response()->json($s->only(['id', 'convocatoria_id', 'cct', 'nombre', 'municipio', 'nivel', 'sistema', 'estado', 'created_at']), 201);
    }

    // ─────────────────────────── Personal ───────────────────────────

    public function index(Request $request)
    {
        $request->validate(['estado' => ['nullable', Rule::in([...EscuelaSolicitud::ESTADOS, 'todas'])]]);
        $estado = $request->input('estado', 'pendiente');
        $base = fn () => Alcance::aplicar(EscuelaSolicitud::query(), $request->user());
        $q = $base()->with(['lider:id,name,email,telefono', 'convocatoria:id,nombre', 'revisor:id,name', 'escuela:id,cct,nombre'])->withCount('clubes');
        if ($estado !== 'todas') $q->where('estado', $estado);

        return response()->json([
            'solicitudes' => $q->orderByRaw("CASE WHEN estado = 'pendiente' THEN 0 ELSE 1 END")->orderByDesc('id')->limit(200)->get(),
            'conteo' => collect(EscuelaSolicitud::ESTADOS)->mapWithKeys(fn ($e) => [$e => $base()->where('estado', $e)->count()]),
        ]);
    }

    public function aceptar(Request $request, EscuelaSolicitud $solicitud)
    {
        $this->exigirAlcance($request, $solicitud);
        $v = $this->validarDatos($request, false);
        $u = $request->user();

        $escuela = DB::transaction(function () use ($solicitud, $v, $u) {
            $s = EscuelaSolicitud::whereKey($solicitud->id)->lockForUpdate()->first();
            if ($s->estado !== 'pendiente') throw ValidationException::withMessages(['solicitud' => 'Esta solicitud ya fue resuelta.']);
            if (Escuela::where('cct', $v['cct'])->exists()) {
                throw ValidationException::withMessages(['cct' => 'Ya existe una escuela con esa CCT en el catálogo. Corrige la CCT o rechaza la solicitud.']);
            }
            $e = Escuela::create(['cct' => $v['cct'], 'nombre' => $v['nombre'], 'municipio' => $v['municipio'], 'nivel' => $v['nivel'], 'sistema' => $v['sistema'], 'activo' => true]);
            $s->forceFill(['estado' => 'aceptada', 'escuela_id' => $e->id, 'revisado_por' => $u->id, 'revisado_at' => now(), 'motivo' => null])->save();
            // La escuela se asigna sola a los clubes que la esperaban (decisión del usuario).
            Club::where('escuela_solicitud_id', $s->id)->whereNull('escuela_id')->update(['escuela_id' => $e->id]);

            return $e;
        });
        $solicitud->refresh();
        Audit::log('escuela.solicitud_aceptada', $solicitud, ['escuela_id' => $escuela->id, 'cct' => $escuela->cct, 'corregida' => $this->corregida($solicitud, $v)]);
        Audit::log('escuela.creada', $escuela, ['cct' => $escuela->cct, 'origen' => 'solicitud '.$solicitud->id]);
        $this->avisar($solicitud, 'aceptada');

        return response()->json(['solicitud' => $solicitud->fresh(['escuela:id,cct,nombre']), 'escuela' => $escuela]);
    }

    public function rechazar(Request $request, EscuelaSolicitud $solicitud)
    {
        $this->exigirAlcance($request, $solicitud);
        $v = $request->validate(['motivo' => 'required|string|min:10|max:1000'],
            ['motivo.required' => 'Escribe el motivo del rechazo.', 'motivo.min' => 'Explica el motivo (al menos 10 caracteres).'], ['motivo' => 'motivo']);
        DB::transaction(function () use ($solicitud, $v, $request) {
            $s = EscuelaSolicitud::whereKey($solicitud->id)->lockForUpdate()->first();
            if ($s->estado !== 'pendiente') throw ValidationException::withMessages(['solicitud' => 'Esta solicitud ya fue resuelta.']);
            $s->forceFill(['estado' => 'rechazada', 'motivo' => trim(strip_tags($v['motivo'])), 'revisado_por' => $request->user()->id, 'revisado_at' => now()])->save();
        });
        $solicitud->refresh();
        Audit::log('escuela.solicitud_rechazada', $solicitud, ['cct' => $solicitud->cct]);
        $this->avisar($solicitud, 'rechazada');

        return response()->json(['solicitud' => $solicitud]);
    }

    /**
     * 08/10/2026 (pedido del usuario): el aviso al líder llega también a los acompañantes (líder A/B, director) de los
     * clubes que esperaban esta escuela, si están dados de alta.
     */
    private function avisar(EscuelaSolicitud $s, string $evento): void
    {
        $ids = collect([$s->user_id]);
        foreach (Club::where('escuela_solicitud_id', $s->id)->get() as $club) {
            $ids = $ids->merge($club->destinatarios()->pluck('id'));
        }
        foreach (\App\Models\User::whereIn('id', $ids->filter()->unique()->all())->where('activo', true)->get() as $u) {
            $u->notify(new EscuelaSolicitudAviso($s, $evento));
        }
    }

    // ─────────────────────────── Apoyos ───────────────────────────

    /** Datos de la escuela (los del catálogo; el líder también manda contacto y convocatoria). */
    private function validarDatos(Request $request, bool $delLider): array
    {
        $request->merge(['cct' => mb_strtoupper(trim((string) $request->input('cct')))]);
        $reglas = [
            'cct' => ['required', 'string', 'size:10', 'regex:'.Escuela::PATRON_CCT],
            'nombre' => 'required|string|min:5|max:255',
            'municipio' => 'required|string|max:120',
            'nivel' => ['required', Rule::in(Escuela::NIVELES)],
            'sistema' => ['required', Rule::in(Escuela::SISTEMAS)],
        ];
        if ($delLider) {
            $reglas += [
                'convocatoria_id' => 'required|integer',
                'direccion' => 'required|string|min:10|max:300',
                'telefono' => ['required', 'string', 'regex:/^\d{10}$/'],
                'director' => 'required|string|min:5|max:150',
            ];
        }
        $v = $request->validate($reglas, [
            'cct.regex' => 'La CCT debe ser del Estado de México: 10 caracteres, p. ej. 15EPR0001A.',
            'cct.size' => 'La CCT tiene 10 caracteres, p. ej. 15EPR0001A.',
            'telefono.regex' => 'Escribe el teléfono de la escuela a 10 dígitos, sin espacios.',
        ], ['cct' => 'CCT', 'nombre' => 'nombre de la escuela', 'municipio' => 'municipio', 'nivel' => 'nivel', 'sistema' => 'sistema',
            'direccion' => 'dirección', 'telefono' => 'teléfono', 'director' => 'nombre de la directora o director', 'convocatoria_id' => 'convocatoria']);
        $mun = Escuela::municipioCanonico($v['municipio']);
        if (! $mun) throw ValidationException::withMessages(['municipio' => 'Ese municipio no existe en el Estado de México.']);
        $v['municipio'] = $mun;
        foreach (['nombre', 'direccion', 'director'] as $c) {
            if (isset($v[$c])) $v[$c] = Escuela::textoSeguro($v[$c]);
        }

        return $v;
    }

    /** CCT ya en el catálogo o ya pedida por alguien → aviso del usuario (contactar a la dirección escolar o al COMECYT). */
    private function exigirCctLibre(string $cct): void
    {
        if (Escuela::where('cct', $cct)->exists()) throw ValidationException::withMessages(['cct' => self::AVISO_YA_REGISTRADA]);
        if (EscuelaSolicitud::where('cct', $cct)->where('estado', 'pendiente')->exists()) throw ValidationException::withMessages(['cct' => self::AVISO_YA_SOLICITADA]);
    }

    private function exigirAlcance(Request $request, EscuelaSolicitud $s): void
    {
        abort_unless(Alcance::puedeVerConvocatoria($request->user(), (int) $s->convocatoria_id), 404);
    }

    /** Personal que recibe el aviso: admins activos y admins de esa convocatoria. */
    public static function revisoresDe(int $convocatoriaId)
    {
        return User::where('activo', true)->whereIn('rol_id', [config('comecyt.roles.admin'), config('comecyt.roles.admin_convocatoria')])->get()
            ->filter(fn (User $u) => $u->tieneRol('admin') || Alcance::puedeVerConvocatoria($u, $convocatoriaId))->values();
    }

    private function corregida(EscuelaSolicitud $s, array $v): bool
    {
        foreach (['cct', 'nombre', 'municipio', 'nivel', 'sistema'] as $c) {
            if ((string) $s->{$c} !== (string) $v[$c]) return true;
        }

        return false;
    }
}
