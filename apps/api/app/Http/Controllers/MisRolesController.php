<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Auth\AuthController;
use App\Models\Rol;
use App\Models\SolicitudRol;
use App\Models\User;
use App\Models\UsuarioRol;
use App\Notifications\RolSolicitudAviso;
use App\Support\Alcance;
use App\Support\Audit;
use App\Support\RegistroRoles;
use Illuminate\Http\Request;

/**
 * E52 · Fase 5 — "Mis roles": una persona con cuenta ve sus roles, cambia de rol activo y pide otro rol.
 * El rol ACTIVO es users.rol_id (todo el sistema lo usa); cambiar de rol reemite la sesión (el JWT lleva el claim `rol`
 * que proxy.ts usa para mostrar el panel). Solo se puede cambiar a un rol otorgado (usuario_roles). Pedir un rol nuevo
 * crea una solicitud que aprueba un admin (decisión del usuario: todo rol requiere aprobación).
 */
class MisRolesController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $otorgados = UsuarioRol::with('rol:id,slug,nombre')->where('user_id', $user->id)->get()
            ->map(fn ($r) => ['slug' => $r->rol?->slug, 'nombre' => $r->rol?->nombre])
            ->filter(fn ($r) => $r['slug'])->values();
        // El rol activo siempre cuenta como otorgado (cuentas dadas de alta antes de E52).
        $activo = Rol::find($user->rol_id);
        if ($activo && ! $otorgados->contains('slug', $activo->slug)) {
            $otorgados->push(['slug' => $activo->slug, 'nombre' => $activo->nombre]);
        }
        $solicitudes = SolicitudRol::where('user_id', $user->id)->latest()->limit(20)
            ->get(['id', 'rol_solicitado', 'estado', 'motivo_rechazo', 'created_at', 'revisado_at']);
        $pendientes = $solicitudes->where('estado', 'pendiente')->pluck('rol_solicitado')->all();
        $disponibles = array_values(array_filter(RegistroRoles::rolesAutoservicio(),
            fn ($r) => ! $otorgados->contains('slug', $r) && ! in_array($r, $pendientes, true)));

        return response()->json([
            'activo' => $activo?->slug,
            'roles' => $otorgados->values(),
            'disponibles' => $disponibles,
            'solicitudes' => $solicitudes->values(),
            'tiene_empresa' => (bool) $user->empresa_id,
        ]);
    }

    public function solicitar(Request $request)
    {
        $user = $request->user();
        $request->validate(['rol_solicitado' => 'required|in:'.implode(',', RegistroRoles::rolesAutoservicio())]);
        $rol = (string) $request->input('rol_solicitado');
        $rolId = (int) config("comecyt.roles.{$rol}");

        if ((int) $user->rol_id === $rolId || UsuarioRol::where('user_id', $user->id)->where('rol_id', $rolId)->exists()) {
            return response()->json(['message' => 'Ya tienes ese rol.'], 422);
        }
        if (SolicitudRol::where('user_id', $user->id)->where('rol_solicitado', $rol)->where('estado', 'pendiente')->exists()) {
            return response()->json(['message' => 'Ya pediste ese rol; está en revisión.'], 422);
        }

        // Participante: los datos de la empresa solo si la cuenta aún no tiene empresa.
        $reglas = RegistroRoles::reglasRol($rol);
        if ($rol === 'solicitante' && $user->empresa_id) {
            $reglas = [];
        }
        $request->validate($reglas, RegistroRoles::mensajes());

        $cv = $rol === 'evaluador' ? RegistroRoles::guardarCv($request->file('cv')) : null;
        $datos = $rol === 'solicitante' && $user->empresa_id ? null : RegistroRoles::datosRol($request, $rol, $cv);

        $s = new SolicitudRol(['user_id' => $user->id, 'rol_solicitado' => $rol, 'datos_rol' => $datos]);
        $s->save();
        Audit::log('rol.solicitado', $s, ['rol' => $rol]);
        foreach (User::where('rol_id', config('comecyt.roles.admin'))->where('activo', true)->get() as $admin) {
            $admin->notify(new RolSolicitudAviso($s, 'nueva'));
        }

        return response()->json(['message' => 'Tu solicitud fue enviada. Un administrador la revisará.'], 201);
    }

    public function cambiar(Request $request)
    {
        $request->validate(['rol' => 'required|string|max:30']);
        $user = $request->user();
        $rol = Rol::where('slug', (string) $request->input('rol'))->first();
        if (! $rol) {
            return response()->json(['message' => 'Ese rol no existe.'], 422);
        }
        $otorgado = (int) $user->rol_id === (int) $rol->id
            || UsuarioRol::where('user_id', $user->id)->where('rol_id', $rol->id)->exists();
        if (! $otorgado) {
            return response()->json(['message' => 'No tienes ese rol.'], 403);
        }

        $anterior = $user->rol_id;
        $user->forceFill(['rol_id' => $rol->id])->save();
        Alcance::olvidar($user->id);
        Audit::log('rol.cambiado', $user, ['de' => $anterior, 'a' => $rol->id]);

        // Nueva sesión con el rol nuevo en el JWT; la anterior queda invalidada.
        try {
            auth()->guard('api')->invalidate(true);
        } catch (\Throwable $e) {
            // ya inválido
        }
        $token = auth()->guard('api')->login($user->fresh());

        return app(AuthController::class)->callRespondWithToken($token);
    }
}
