<?php

namespace App\Http\Controllers;

use App\Events\MensajeBuzonEnviado;
use App\Jobs\AvisoMensajeNoLeido;
use App\Models\Convocatoria;
use App\Models\Conversacion;
use App\Models\ConversacionMensaje;
use App\Models\NotificacionLog;
use App\Models\Solicitud;
use App\Models\User;
use App\Support\Alcance;
use App\Support\Audit;
use App\Support\Buzon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * E45 (punto 2) — Buzón de sugerencias con chat en tiempo real.
 * Hilos por tema (asunto + categoría, abierto/resuelto), solo texto. Participan el solicitante dueño del hilo, los
 * admins generales y los admin de convocatoria de esa convocatoria (App\Support\Buzon). Todo acceso fuera de eso → 404.
 */
class BuzonController extends Controller
{
    /** Convocatorias en las que el solicitante puede abrir un hilo: donde tiene alguna solicitud. */
    public function convocatoriasDisponibles(Request $request)
    {
        $user = $request->user();
        abort_unless($user->tieneRol('solicitante'), 403);

        $ids = Solicitud::where('user_id', $user->id)->pluck('convocatoria_id')->filter()->unique();
        $convs = Convocatoria::whereIn('id', $ids)->whereNull('deleted_at')->orderByDesc('id')->get(['id', 'nombre'])
            ->map(fn ($c) => [
                'id' => $c->id,
                'nombre' => $c->nombre,
                // Quién atiende (nombre y foto): el solicitante sabe con quién habla.
                'equipo' => Buzon::equipo($c->id)->map(fn ($u) => ['id' => $u->id, 'name' => $u->name,
                    'avatar_url' => User::find($u->id)?->avatar_url])->values(),
            ]);

        return response()->json($convs);
    }

    public function index(Request $request)
    {
        $data = $request->validate([
            'estado' => ['nullable', 'in:abierta,resuelta,todas'],
            'convocatoria_id' => ['nullable', 'integer'],
        ]);
        $user = $request->user();
        $q = Conversacion::with([
            'solicitante:id,name,email,avatar_path',
            'convocatoria:id,nombre',
            'ultimoMensaje',
        ])->orderByDesc('ultimo_mensaje_at');

        if ($user->tieneRol('solicitante')) {
            $q->where('solicitante_id', $user->id);
        } else {
            Alcance::aplicar($q, $user);
        }
        if (($data['estado'] ?? 'todas') !== 'todas') {
            $q->where('estado', $data['estado']);
        }
        if (! empty($data['convocatoria_id'])) {
            $q->where('convocatoria_id', (int) $data['convocatoria_id']);
        }

        $hilos = $q->limit(200)->get();
        $noLeidos = $this->noLeidosPorHilo($user, $hilos->pluck('id')->all());

        return response()->json($hilos->map(function (Conversacion $c) use ($noLeidos) {
            $a = $c->toArray();
            $a['no_leidos'] = (int) ($noLeidos[$c->id] ?? 0);

            return $a;
        })->values());
    }

    public function store(Request $request)
    {
        $user = $request->user();
        abort_unless($user->tieneRol('solicitante'), 403, 'Solo los solicitantes abren hilos nuevos.');

        $data = $request->validate([
            'convocatoria_id' => ['required', 'integer'],
            'categoria' => ['required', 'in:'.implode(',', Conversacion::CATEGORIAS)],
            'asunto' => ['required', 'string', 'min:5', 'max:160'],
            'mensaje' => ['required', 'string', 'min:2', 'max:'.ConversacionMensaje::MAX_CARACTERES],
        ]);
        // Solo en convocatorias donde tiene solicitud (el id viene del cliente: se revisa aquí).
        $tiene = Solicitud::where('user_id', $user->id)->where('convocatoria_id', (int) $data['convocatoria_id'])->exists();
        if (! $tiene) {
            return response()->json(['message' => 'Solo puedes escribir sobre convocatorias en las que tienes una solicitud.'], 422);
        }

        $c = DB::transaction(function () use ($data, $user) {
            $c = Conversacion::create([
                'convocatoria_id' => (int) $data['convocatoria_id'],
                'solicitante_id' => $user->id,
                'asunto' => trim(strip_tags($data['asunto'])),
                'categoria' => $data['categoria'],
            ]);
            $c->forceFill(['ultimo_mensaje_at' => now()])->save();
            $this->crearMensaje($c, $user, $data['mensaje']);

            return $c;
        });
        Audit::log('buzon.hilo_abierto', $c, ['categoria' => $c->categoria]);

        return response()->json($this->hiloConMensajes($c->fresh(), $user), 201);
    }

    public function show(Request $request, Conversacion $conversacion)
    {
        $user = $request->user();
        abort_unless(Buzon::participa($user, $conversacion), 404);

        return response()->json($this->hiloConMensajes($conversacion, $user));
    }

    public function mensaje(Request $request, Conversacion $conversacion)
    {
        $user = $request->user();
        abort_unless(Buzon::participa($user, $conversacion), 404);
        $data = $request->validate([
            'cuerpo' => ['required', 'string', 'min:1', 'max:'.ConversacionMensaje::MAX_CARACTERES],
        ]);

        // Si el solicitante escribe en un hilo resuelto, se reabre.
        if ($conversacion->estado === 'resuelta' && $user->tieneRol('solicitante')) {
            $conversacion->forceFill(['estado' => 'abierta', 'resuelta_por' => null, 'resuelta_at' => null])->save();
        } elseif ($conversacion->estado === 'resuelta') {
            return response()->json(['message' => 'El hilo está resuelto. Reábrelo para responder.'], 422);
        }

        $m = $this->crearMensaje($conversacion, $user, $data['cuerpo']);

        return response()->json($this->formatear($m), 201);
    }

    /** Marca como leídos los mensajes del OTRO lado. */
    public function leer(Request $request, Conversacion $conversacion)
    {
        $user = $request->user();
        abort_unless(Buzon::participa($user, $conversacion), 404);
        $n = $this->mensajesDelOtroLado($conversacion, $user)->whereNull('leido_at')->update(['leido_at' => now()]);
        // Leer el hilo apaga también sus avisos en la campana (solo los propios).
        NotificacionLog::where('user_id', $user->id)->where('conversacion_id', $conversacion->id)
            ->whereNull('leida_at')->update(['leida_at' => now()]);

        return response()->json(['leidos' => $n]);
    }

    public function resolver(Request $request, Conversacion $conversacion)
    {
        $user = $request->user();
        abort_unless(Buzon::participa($user, $conversacion) && Buzon::esEquipo($user), 404);
        $conversacion->forceFill(['estado' => 'resuelta', 'resuelta_por' => $user->id, 'resuelta_at' => now()])->save();
        Audit::log('buzon.hilo_resuelto', $conversacion);

        return response()->json(['message' => 'Hilo marcado como resuelto.', 'estado' => 'resuelta']);
    }

    public function reabrir(Request $request, Conversacion $conversacion)
    {
        $user = $request->user();
        abort_unless(Buzon::participa($user, $conversacion), 404);
        $conversacion->forceFill(['estado' => 'abierta', 'resuelta_por' => null, 'resuelta_at' => null])->save();

        return response()->json(['message' => 'Hilo reabierto.', 'estado' => 'abierta']);
    }

    // ───────────────────────── internos ─────────────────────────

    private function crearMensaje(Conversacion $c, User $autor, string $texto): ConversacionMensaje
    {
        // Solo texto: se quitan etiquetas y caracteres de control (React además escapa al pintar).
        $limpio = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', strip_tags($texto)) ?? '');
        abort_if($limpio === '', 422, 'El mensaje está vacío.');

        $m = ConversacionMensaje::create(['conversacion_id' => $c->id, 'user_id' => $autor->id, 'cuerpo' => $limpio]);
        $c->forceFill(['ultimo_mensaje_at' => $m->created_at])->save();
        $m->load('autor:id,name,avatar_path,rol_id');

        // 1) Tiempo real a quienes tienen el hilo abierto.
        try {
            broadcast(new MensajeBuzonEnviado($this->formatear($m), $c->id))->toOthers();
        } catch (\Throwable $e) {
            Log::warning('Buzón: broadcast falló', ['conversacion' => $c->id, 'error' => $e->getMessage()]);
        }

        // 2) Campana: el otro lado (solicitante, o el equipo de la convocatoria).
        $delSolicitante = (int) $autor->id === (int) $c->solicitante_id;
        $destinos = $delSolicitante ? Buzon::equipo((int) $c->convocatoria_id)->pluck('id') : collect([$c->solicitante_id]);
        foreach ($destinos->unique() as $uid) {
            if ((int) $uid === (int) $autor->id) {
                continue;
            }
            NotificacionLog::create([
                'user_id' => $uid,
                'tipo' => 'buzon_mensaje',
                'conversacion_id' => $c->id,
                'asunto' => 'Nuevo mensaje en el buzón: '.mb_substr($c->asunto, 0, 100),
                'mensaje' => $autor->name.' escribió en «'.mb_substr($c->asunto, 0, 100).'».',
                'correo_destino' => User::find($uid)?->email ?? '',
                'enviado' => false,
            ]);
        }

        // 3) Correo si sigue sin leerse en 30 minutos.
        AvisoMensajeNoLeido::dispatch($m->id)->delay(now()->addMinutes(30));

        return $m;
    }

    private function formatear(ConversacionMensaje $m): array
    {
        return [
            'id' => $m->id,
            'conversacion_id' => $m->conversacion_id,
            'cuerpo' => $m->cuerpo,
            'created_at' => $m->created_at?->toIso8601String(),
            'leido_at' => $m->leido_at?->toIso8601String(),
            'autor' => $m->autor ? [
                'id' => $m->autor->id,
                'name' => $m->autor->name,
                'avatar_url' => $m->autor->avatar_url,
                'rol_id' => $m->autor->rol_id,
            ] : null,
        ];
    }

    private function hiloConMensajes(Conversacion $c, User $user): array
    {
        $c->load(['solicitante:id,name,email,avatar_path', 'convocatoria:id,nombre']);
        $mensajes = $c->mensajes()->with('autor:id,name,avatar_path,rol_id')->orderByDesc('id')->limit(300)->get()->reverse()->values();

        return $c->toArray() + [
            'mensajes' => $mensajes->map(fn ($m) => $this->formatear($m))->values(),
            'equipo' => Buzon::equipo((int) $c->convocatoria_id)->map(fn ($u) => ['id' => $u->id, 'name' => $u->name,
                'avatar_url' => User::find($u->id)?->avatar_url])->values(),
            'puede_resolver' => Buzon::esEquipo($user),
        ];
    }

    private function mensajesDelOtroLado(Conversacion $c, User $user)
    {
        $q = ConversacionMensaje::where('conversacion_id', $c->id);

        return (int) $user->id === (int) $c->solicitante_id
            ? $q->where('user_id', '!=', $c->solicitante_id)
            : $q->where('user_id', $c->solicitante_id);
    }

    /** @return array<int,int> hilo => mensajes no leídos por este usuario */
    private function noLeidosPorHilo(User $user, array $ids): array
    {
        if (! $ids) {
            return [];
        }
        $q = DB::table('conversacion_mensajes as m')->join('conversaciones as c', 'c.id', '=', 'm.conversacion_id')
            ->whereIn('m.conversacion_id', $ids)->whereNull('m.leido_at');
        $user->tieneRol('solicitante')
            ? $q->whereColumn('m.user_id', '!=', 'c.solicitante_id')
            : $q->whereColumn('m.user_id', 'c.solicitante_id');

        return $q->groupBy('m.conversacion_id')->select('m.conversacion_id', DB::raw('count(*) as n'))
            ->pluck('n', 'm.conversacion_id')->map(fn ($n) => (int) $n)->all();
    }
}
