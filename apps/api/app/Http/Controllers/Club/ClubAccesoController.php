<?php

namespace App\Http\Controllers\Club;

use App\Http\Controllers\Controller;
use App\Models\Club;
use App\Models\ClubAcceso;
use App\Models\User;
use App\Models\UsuarioRol;
use App\Notifications\ClubAviso;
use App\Support\Audit;
use App\Support\LiderBIntegrante;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

/**
 * E61 — El dueño del club da acceso a sus acompañantes. Decisiones del usuario: define nombre, correo y contraseña; si el
 * correo ya tiene cuenta solo se le da el acceso (su contraseña NO cambia y no se revela si la cuenta existía); uno de
 * cada tipo y se puede cambiar.
 *
 * 08/10/2026 (pedido del usuario) — Dos formas de club:
 *  - lo registra un docente: él es el líder A (dueño) y da de alta al líder B y, opcional, al director;
 *  - lo registra el director («Soy director» en el registro; clubes.dueno_director): da de alta al líder A y al líder B.
 * Permisos en cadena director → líder A → líder B, de dos formas:
 *  - compartir: el otro también opera (editar, enviar, logística) hasta que se lo retiren; nadie pierde su acceso;
 *  - ceder: intercambian lugar, rol y permisos (si el líder A cede al líder B, el B pasa a ser el A y viceversa).
 */
class ClubAccesoController extends Controller
{
    private const ROL = 9; // acompanante_club

    private const ROL_LIDER = 7; // lider_club

    public function index(Request $request, Club $club)
    {
        $u = $this->veAccesos($request, $club);

        return response()->json(self::listado($club, $u));
    }

    public function store(Request $request, Club $club)
    {
        $lider = $this->soloDueno($request, $club);
        $request->merge(['email' => mb_strtolower(trim((string) $request->input('email')))]);
        $v = $request->validate([
            'tipo' => 'required|in:'.implode(',', ClubAcceso::tiposDe($club)),
            'nombre' => ['required', 'string', 'min:3', 'max:150', 'regex:/^[\pL\pM .\'-]+$/u'],
            'email' => 'required|email:rfc|max:255',
            // Siempre se pide (aunque la cuenta exista) para no revelar qué correos tienen cuenta.
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
        ], ['nombre.regex' => 'El nombre solo lleva letras, espacios, puntos y guiones.'],
            ['tipo' => 'tipo de acceso', 'nombre' => 'nombre', 'email' => 'correo', 'password' => 'contraseña']);

        if ($v['email'] === mb_strtolower((string) $lider->email)) {
            throw ValidationException::withMessages(['email' => 'Ese es tu correo: tú ya eres el responsable del club.']);
        }

        $nuevaCuenta = false;
        DB::transaction(function () use ($club, $lider, $v, &$nuevaCuenta, &$usuario) {
            $usuario = User::whereRaw('LOWER(email) = ?', [$v['email']])->lockForUpdate()->first();
            if ($usuario && ! $usuario->activo) {
                throw ValidationException::withMessages(['email' => 'No se puede dar acceso a ese correo. Pide a la persona que se comunique con el COMECYT.']);
            }
            $otro = $usuario ? ClubAcceso::where('club_id', $club->id)->where('user_id', $usuario->id)->where('tipo', '!=', $v['tipo'])->first() : null;
            if ($otro) {
                throw ValidationException::withMessages(['email' => 'Esa persona ya es '.ClubAcceso::ETIQUETAS[$otro->tipo].' de este club.']);
            }
            // Los líderes cuentan como integrantes; con el club lleno no se pueden dar de alta.
            LiderBIntegrante::exigirCupo($club, $v['tipo']);
            // Uno por tipo: si ya había otra persona, se le retira el acceso.
            $actual = ClubAcceso::where('club_id', $club->id)->where('tipo', $v['tipo'])->lockForUpdate()->first();
            if ($actual && (! $usuario || $actual->user_id !== $usuario->id)) {
                self::revocar($actual, $lider);
                $actual = null;
            }
            if (! $usuario) {
                $usuario = new User();
                $usuario->forceFill([
                    'name' => trim(preg_replace('/\s+/u', ' ', strip_tags($v['nombre']))), 'email' => $v['email'],
                    'password' => Hash::make($v['password']), 'rol_id' => self::ROL, 'activo' => true, 'debe_cambiar_password' => true,
                ])->save();
                $nuevaCuenta = true;
            }
            UsuarioRol::otorgar($usuario->id, self::ROL, $lider->id);
            $acceso = $actual ?? new ClubAcceso();
            $acceso->forceFill(['club_id' => $club->id, 'user_id' => $usuario->id, 'tipo' => $v['tipo'], 'otorgado_por' => $lider->id])->save();
            LiderBIntegrante::sincronizar($club, $usuario, $v['tipo']);
        });

        Audit::log('club.acceso_otorgado', $club, ['tipo' => $v['tipo'], 'user_id' => $usuario->id, 'cuenta_nueva' => $nuevaCuenta]);
        $usuario->notify(new ClubAviso($club, 'acceso_otorgado', ['rol' => ClubAcceso::ETIQUETAS[$v['tipo']], 'quien' => $lider->name]));

        return response()->json([
            // Mismo mensaje exista o no la cuenta (no se revela).
            'message' => 'Listo: le enviamos un correo a '.$v['email'].' con el acceso. Si ya tenía cuenta en SIDECyT entra con su contraseña de siempre; si no, con la que definiste y la cambiará al entrar.',
            'accesos' => self::listado($club->fresh(), $lider),
        ], 201);
    }

    public function destroy(Request $request, Club $club, string $tipo)
    {
        $lider = $this->soloDueno($request, $club);
        abort_unless(in_array($tipo, ClubAcceso::TIPOS, true), 404);
        $a = ClubAcceso::where('club_id', $club->id)->where('tipo', $tipo)->firstOrFail();
        DB::transaction(fn () => self::revocar($a, $lider));

        return response()->json(['message' => 'Acceso retirado.', 'accesos' => self::listado($club->fresh(), $lider)]);
    }

    /** E61 (compatibilidad): el director comparte o deja de compartir el rol de líder. */
    public function colider(Request $request, Club $club)
    {
        return $this->compartir($request, $club, 'director');
    }

    /** 08/10/2026 — Compartir (o retirar) el permiso de operar con un acompañante. */
    public function compartir(Request $request, Club $club, string $tipo)
    {
        $u = $request->user();
        abort_unless(in_array($tipo, ClubAcceso::TIPOS, true), 404);
        $v = $request->validate(['colider' => 'required|boolean']);
        if (! in_array($tipo, self::puede($club, $u)['compartir'], true)) {
            abort_unless($club->puedeVer($u), 404);
            abort(response()->json(['message' => 'No puedes compartir el permiso con esa persona.'], 403));
        }
        $a = ClubAcceso::where('club_id', $club->id)->where('tipo', $tipo)->first();
        if (! $a) throw ValidationException::withMessages(['colider' => 'Primero registra al '.ClubAcceso::ETIQUETAS[$tipo].'.']);
        $activo = (bool) $v['colider'];
        if ($a->colider !== $activo) {
            $a->forceFill(['colider' => $activo, 'colider_desde' => $activo ? now() : null])->save();
            Audit::log($activo ? 'club.colider_activado' : 'club.colider_retirado', $club, ['user_id' => $a->user_id, 'tipo' => $tipo, 'por' => $u->id]);
            $a->usuario?->notify(new ClubAviso($club, $activo ? 'colider_activado' : 'colider_retirado', ['quien' => $u->name]));
        }

        return response()->json(['message' => $activo ? 'Listo: ya comparte el permiso de operar el club.' : 'Retiraste el permiso compartido.', 'accesos' => self::listado($club->fresh(), $u)]);
    }

    /**
     * 08/10/2026 — Ceder: intercambian lugar, rol y permisos.
     *  - dueño docente (líder A) → líder B: el B pasa a ser el dueño y el A queda como líder B;
     *  - dueño director → líder A: el A pasa a ser el dueño y el director queda como director acompañante;
     *  - líder A (club del director) → líder B: intercambian sus accesos.
     */
    public function ceder(Request $request, Club $club)
    {
        $u = $request->user();
        $v = $request->validate(['tipo' => 'required|in:'.implode(',', ClubAcceso::TIPOS), 'confirmar' => 'accepted'],
            ['confirmar.accepted' => 'Confirma que quieres ceder tu lugar.']);
        $tipo = $v['tipo'];
        if (! in_array($tipo, self::puede($club, $u)['ceder'], true)) {
            abort_unless($club->puedeVer($u), 404);
            abort(response()->json(['message' => 'No puedes ceder tu lugar a esa persona.'], 403));
        }

        $otro = DB::transaction(function () use ($club, $u, $tipo) {
            $club = Club::whereKey($club->id)->lockForUpdate()->firstOrFail();
            $a = ClubAcceso::where('club_id', $club->id)->where('tipo', $tipo)->lockForUpdate()->first();
            if (! $a) throw ValidationException::withMessages(['tipo' => 'Primero registra al '.ClubAcceso::ETIQUETAS[$tipo].'.']);
            $otro = User::findOrFail($a->user_id);

            if ((int) $club->lider_id === (int) $u->id) {
                // El dueño cambia de lugar con el acompañante.
                if (Club::where('convocatoria_id', $club->convocatoria_id)->where('lider_id', $otro->id)->where('id', '!=', $club->id)->exists()) {
                    throw ValidationException::withMessages(['tipo' => "{$otro->name} ya es responsable de otro club en esta convocatoria."]);
                }
                $eraDirector = (bool) $club->dueno_director;
                $club->forceFill(['lider_id' => $otro->id, 'dueno_director' => false])->save();
                // Director → líder A: el director queda como «director»; docente → líder B: el docente queda como líder B.
                $a->forceFill(['user_id' => $u->id, 'tipo' => $eraDirector ? 'director' : $tipo, 'otorgado_por' => $otro->id])->save();
                if (! $eraDirector) LiderBIntegrante::intercambiarEtiquetas($club);
                UsuarioRol::otorgar($otro->id, self::ROL_LIDER, $u->id);
                UsuarioRol::otorgar($u->id, self::ROL, $otro->id);
                // Los permisos se leen con el rol activo: el nuevo dueño entra como líder de club y, si quien cedió ya no
                // es dueño de ningún club, como acompañante (puede cambiar de rol desde «Mis roles»).
                if ((int) $otro->rol_id === self::ROL) $otro->forceFill(['rol_id' => self::ROL_LIDER])->save();
                if (! Club::where('lider_id', $u->id)->exists()) $u->forceFill(['rol_id' => self::ROL])->save();
            } else {
                // Líder A (acompañante) ↔ líder B: se intercambian las filas con un tipo temporal (índice único club+tipo).
                $mio = ClubAcceso::where('club_id', $club->id)->where('user_id', $u->id)->lockForUpdate()->firstOrFail();
                $tipoMio = $mio->tipo;
                $mio->forceFill(['tipo' => '_cambio'])->save();
                $a->forceFill(['tipo' => $tipoMio])->save();
                $mio->forceFill(['tipo' => $tipo])->save();
                // Los permisos van con el lugar: cada quien queda con el permiso compartido que tenía el otro.
                [$cm, $dm, $ca, $da] = [$mio->colider, $mio->colider_desde, $a->colider, $a->colider_desde];
                $mio->forceFill(['colider' => $ca, 'colider_desde' => $da])->save();
                $a->forceFill(['colider' => $cm, 'colider_desde' => $dm])->save();
                LiderBIntegrante::intercambiarEtiquetas($club);
            }

            return $otro;
        });

        Audit::log('club.lugar_cedido', $club, ['de' => $u->id, 'a' => $otro->id, 'tipo' => $tipo]);
        $otro->notify(new ClubAviso($club->fresh(), 'lugar_cedido', ['quien' => $u->name]));

        return response()->json([
            'message' => "Listo: intercambiaste tu lugar con {$otro->name}.",
            'accesos' => self::listado($club->fresh(), $u),
            'acceso' => $club->fresh()->accesoDe($u),
        ]);
    }

    /** Retira el acceso; si la persona ya no acompaña ningún club, se le quita el rol (y si era su único rol, la cuenta). */
    public static function revocar(ClubAcceso $a, User $quien): void
    {
        $club = $a->club;
        $u = $a->usuario;
        $tipo = $a->tipo;
        $a->delete();
        // Su tarjeta de integrante se va con el acceso (al cambiar de persona, sincronizar() crea la nueva).
        if ($club) LiderBIntegrante::quitar($club, $tipo);
        if ($u && ! ClubAcceso::where('user_id', $u->id)->exists()) {
            UsuarioRol::where('user_id', $u->id)->where('rol_id', self::ROL)->delete();
            if ((int) $u->rol_id === self::ROL) {
                $otro = UsuarioRol::where('user_id', $u->id)->orderBy('id')->value('rol_id');
                $u->forceFill($otro ? ['rol_id' => $otro] : ['activo' => false])->save();
            }
        }
        Audit::log('club.acceso_retirado', $club, ['tipo' => $tipo, 'user_id' => $u?->id]);
        if ($u && $u->activo) $u->notify(new ClubAviso($club, 'acceso_retirado', ['rol' => ClubAcceso::ETIQUETAS[$tipo]]));
    }

    /**
     * Qué puede hacer quien mira con los accesos: gestionar (alta, cambio y baja: solo el dueño), compartir y ceder.
     * Cadena: el dueño comparte con cualquiera de sus acompañantes y cede al siguiente (director → líder A; líder A
     * docente → líder B); el líder A de un club del director cede al líder B y le comparte solo si él mismo opera.
     */
    public static function puede(Club $club, ?User $u): array
    {
        $nada = ['gestionar' => false, 'compartir' => [], 'ceder' => []];
        if (! $u) return $nada;
        if ((int) $club->lider_id === (int) $u->id) {
            return ['gestionar' => true, 'compartir' => ClubAcceso::tiposDe($club), 'ceder' => [$club->dueno_director ? 'lider_a' : 'lider_b']];
        }
        $acceso = $club->accesoDe($u);
        if ($club->dueno_director && in_array($acceso, ['lider_a', 'lider_a_colider'], true)) {
            return ['gestionar' => false, 'compartir' => $acceso === 'lider_a_colider' ? ['lider_b'] : [], 'ceder' => ['lider_b']];
        }

        return $nada;
    }

    /** Lista blanca: nombre, correo y si comparte el permiso; más qué puede hacer quien mira. */
    public static function listado(Club $club, ?User $u = null): array
    {
        $accesos = ClubAcceso::where('club_id', $club->id)->with('usuario:id,name,email')->get()->keyBy('tipo');
        $tipos = ClubAcceso::tiposDe($club);

        return [
            'dueno_director' => (bool) $club->dueno_director,
            'tipos' => $tipos,
            'puede' => self::puede($club, $u),
            'items' => collect($tipos)->mapWithKeys(fn ($t) => [$t => ($a = $accesos->get($t)) ? [
                'nombre' => $a->usuario?->name, 'email' => $a->usuario?->email, 'colider' => (bool) $a->colider,
                'colider_desde' => $a->colider_desde, 'desde' => $a->created_at,
            ] : null])->all(),
        ];
    }

    /** Ve la lista de accesos: el dueño y el líder A de un club del director. */
    private function veAccesos(Request $request, Club $club): User
    {
        $u = $request->user();
        $p = self::puede($club, $u);
        abort_unless($p['gestionar'] || $p['ceder'] !== [], 404);

        return $u;
    }

    private function soloDueno(Request $request, Club $club): User
    {
        $u = $request->user();
        abort_unless((int) $club->lider_id === (int) $u->id && $u->tieneRol('lider_club'), 404);

        return $u;
    }
}
