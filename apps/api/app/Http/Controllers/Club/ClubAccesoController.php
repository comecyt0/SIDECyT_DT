<?php

namespace App\Http\Controllers\Club;

use App\Http\Controllers\Controller;
use App\Models\Club;
use App\Models\ClubAcceso;
use App\Models\User;
use App\Models\UsuarioRol;
use App\Notifications\ClubAviso;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

/**
 * E61 — El líder da acceso a su club a un «Acompañante de club»: líder B y, opcional, el director de la escuela (no son
 * integrantes). Decisiones del usuario: el líder define nombre, correo y contraseña; si el correo ya tiene cuenta solo
 * se le da el acceso (su contraseña NO cambia y no se revela si la cuenta existía); uno de cada tipo y se puede cambiar;
 * el director puede compartir el rol de líder (colíder) cuando el líder lo active, en cualquier momento.
 * Solo el líder (lider_id) usa estos endpoints.
 */
class ClubAccesoController extends Controller
{
    private const ROL = 9; // acompanante_club

    public function index(Request $request, Club $club)
    {
        $this->soloLider($request, $club);

        return response()->json(self::listado($club));
    }

    public function store(Request $request, Club $club)
    {
        $lider = $this->soloLider($request, $club);
        $request->merge(['email' => mb_strtolower(trim((string) $request->input('email')))]);
        $v = $request->validate([
            'tipo' => 'required|in:'.implode(',', ClubAcceso::TIPOS),
            'nombre' => ['required', 'string', 'min:3', 'max:150', 'regex:/^[\pL\pM .\'-]+$/u'],
            'email' => 'required|email:rfc|max:255',
            // Siempre se pide (aunque la cuenta exista) para no revelar qué correos tienen cuenta.
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
        ], ['nombre.regex' => 'El nombre solo lleva letras, espacios, puntos y guiones.'],
            ['tipo' => 'tipo de acceso', 'nombre' => 'nombre', 'email' => 'correo', 'password' => 'contraseña']);

        if ($v['email'] === mb_strtolower((string) $lider->email)) {
            throw ValidationException::withMessages(['email' => 'Ese es tu correo: tú ya eres el líder del club.']);
        }

        $nuevaCuenta = false;
        DB::transaction(function () use ($club, $lider, $v, &$nuevaCuenta, &$acceso, &$usuario) {
            $usuario = User::whereRaw('LOWER(email) = ?', [$v['email']])->lockForUpdate()->first();
            if ($usuario && ! $usuario->activo) {
                throw ValidationException::withMessages(['email' => 'No se puede dar acceso a ese correo. Pide a la persona que se comunique con el COMECYT.']);
            }
            $otro = $usuario ? ClubAcceso::where('club_id', $club->id)->where('user_id', $usuario->id)->where('tipo', '!=', $v['tipo'])->first() : null;
            if ($otro) {
                throw ValidationException::withMessages(['email' => 'Esa persona ya es '.ClubAcceso::ETIQUETAS[$otro->tipo].' de este club.']);
            }
            // Uno por tipo: si ya había otra persona, se le retira el acceso (cambio de líder B o de director).
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
        });

        Audit::log('club.acceso_otorgado', $club, ['tipo' => $v['tipo'], 'user_id' => $usuario->id, 'cuenta_nueva' => $nuevaCuenta]);
        $usuario->notify(new ClubAviso($club, 'acceso_otorgado', ['rol' => ClubAcceso::ETIQUETAS[$v['tipo']], 'quien' => $lider->name]));

        return response()->json([
            // Mismo mensaje exista o no la cuenta (no se revela).
            'message' => 'Listo: le enviamos un correo a '.$v['email'].' con el acceso. Si ya tenía cuenta en SIDECyT entra con su contraseña de siempre; si no, con la que definiste y la cambiará al entrar.',
            'accesos' => self::listado($club->fresh()),
        ], 201);
    }

    public function destroy(Request $request, Club $club, string $tipo)
    {
        $lider = $this->soloLider($request, $club);
        abort_unless(in_array($tipo, ClubAcceso::TIPOS, true), 404);
        $a = ClubAcceso::where('club_id', $club->id)->where('tipo', $tipo)->firstOrFail();
        DB::transaction(fn () => self::revocar($a, $lider));

        return response()->json(['message' => 'Acceso retirado.', 'accesos' => self::listado($club->fresh())]);
    }

    /** El director comparte (o deja de compartir) el rol de líder. */
    public function colider(Request $request, Club $club)
    {
        $lider = $this->soloLider($request, $club);
        $v = $request->validate(['colider' => 'required|boolean']);
        $a = ClubAcceso::where('club_id', $club->id)->where('tipo', 'director')->first();
        if (! $a) throw ValidationException::withMessages(['colider' => 'Primero registra al director.']);
        $activo = (bool) $v['colider'];
        if ($a->colider !== $activo) {
            $a->forceFill(['colider' => $activo, 'colider_desde' => $activo ? now() : null])->save();
            Audit::log($activo ? 'club.colider_activado' : 'club.colider_retirado', $club, ['user_id' => $a->user_id]);
            $a->usuario?->notify(new ClubAviso($club, $activo ? 'colider_activado' : 'colider_retirado'));
        }

        return response()->json(['message' => $activo ? 'El director ya comparte el rol de líder.' : 'Retomaste el rol de líder.', 'accesos' => self::listado($club->fresh())]);
    }

    /** Retira el acceso; si la persona ya no acompaña ningún club, se le quita el rol (y si era su único rol, la cuenta). */
    public static function revocar(ClubAcceso $a, User $quien): void
    {
        $club = $a->club;
        $u = $a->usuario;
        $tipo = $a->tipo;
        $a->delete();
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

    /** Lista blanca: nombre, correo y si comparte el rol de líder. */
    public static function listado(Club $club): array
    {
        $accesos = ClubAcceso::where('club_id', $club->id)->with('usuario:id,name,email')->get()->keyBy('tipo');

        return collect(ClubAcceso::TIPOS)->mapWithKeys(fn ($t) => [$t => ($a = $accesos->get($t)) ? [
            'nombre' => $a->usuario?->name, 'email' => $a->usuario?->email, 'colider' => (bool) $a->colider,
            'colider_desde' => $a->colider_desde, 'desde' => $a->created_at,
        ] : null])->all();
    }

    private function soloLider(Request $request, Club $club): User
    {
        $u = $request->user();
        abort_unless((int) $club->lider_id === (int) $u->id && $u->tieneRol('lider_club'), 404);

        return $u;
    }
}
