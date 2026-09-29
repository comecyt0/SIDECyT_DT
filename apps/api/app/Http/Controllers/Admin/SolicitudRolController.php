<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\ListaNegra;
use App\Models\Rol;
use App\Models\SolicitudRol;
use App\Models\User;
use App\Models\UsuarioRol;
use App\Notifications\RolSolicitudAviso;
use App\Support\Alcance;
use App\Support\Audit;
use App\Support\RegistroRoles;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * E52 · Fase 5 — Admin: solicitudes de rol de personas que YA tienen cuenta ("Mis roles") y roles otorgados por cuenta.
 * Solo admin (grupo 'admin' en routes/api.php). Toda acción queda en la bitácora.
 */
class SolicitudRolController extends Controller
{
    public function index()
    {
        $areas = DB::table('areas_conocimiento')->pluck('nombre', 'id');
        $items = SolicitudRol::with(['user:id,name,email,telefono,cargo,municipio,empresa_id', 'user.empresa:id,nombre', 'revisadoPor:id,name'])
            ->latest()->limit(200)->get()
            ->map(function (SolicitudRol $s) use ($areas) {
                $d = (array) ($s->datos_rol ?? []);
                $tieneCv = RegistroRoles::cvValido($d['cv'] ?? null);
                unset($d['cv']);

                return [
                    'id' => $s->id,
                    'rol_solicitado' => $s->rol_solicitado,
                    'estado' => $s->estado,
                    'motivo_rechazo' => $s->motivo_rechazo,
                    'datos_rol' => $d,
                    'area_nombre' => isset($d['area_conocimiento_id']) ? ($areas[$d['area_conocimiento_id']] ?? null) : null,
                    'tiene_cv' => $tieneCv,
                    'created_at' => $s->created_at,
                    'revisado_at' => $s->revisado_at,
                    'revisado_por' => $s->revisadoPor?->name,
                    'user' => $s->user ? [
                        'id' => $s->user->id, 'name' => $s->user->name, 'email' => $s->user->email,
                        'telefono' => $s->user->telefono, 'cargo' => $s->user->cargo, 'municipio' => $s->user->municipio,
                        'empresa' => $s->user->empresa?->nombre,
                    ] : null,
                ];
            });

        return response()->json($items);
    }

    public function aprobar(SolicitudRol $solicitudRol)
    {
        if ($solicitudRol->estado !== 'pendiente') {
            return response()->json(['message' => 'Esta solicitud ya fue procesada.'], 422);
        }
        $user = $solicitudRol->user;
        if (! $user) {
            return response()->json(['message' => 'La cuenta ya no existe.'], 422);
        }
        $rol = $solicitudRol->rol_solicitado;
        $rolId = (int) config("comecyt.roles.{$rol}");
        $datos = (array) ($solicitudRol->datos_rol ?? []);

        DB::transaction(function () use ($solicitudRol, $user, $rol, $rolId, $datos) {
            if ($rol === 'solicitante' && ! $user->empresa_id && ! empty($datos['empresa_nombre'])) {
                $ed = (array) ($datos['empresa_datos'] ?? []);
                $empresa = Empresa::firstOrCreate(['nombre' => $datos['empresa_nombre']], [
                    'rfc' => $ed['rfc'] ?? null, 'tipo_persona' => $ed['tipo_persona'] ?? null, 'rol_supervision' => $ed['rol_supervision'] ?? null,
                ]);
                if (! ListaNegra::where('empresa_id', $empresa->id)->exists()) {
                    $user->forceFill(['empresa_id' => $empresa->id])->save();
                }
            }
            if ($rol === 'evaluador') {
                $user->forceFill(['datos_registro' => array_merge((array) ($user->datos_registro ?? []), $datos)])->save();
            }
            UsuarioRol::otorgar($user->id, $rolId, auth()->id());
            $solicitudRol->forceFill(['estado' => 'aprobada', 'revisado_por' => auth()->id(), 'revisado_at' => now()])->save();
        });
        Audit::log('rol.aprobado', $user, ['rol' => $rol, 'solicitud_rol_id' => $solicitudRol->id]);
        $user->notify(new RolSolicitudAviso($solicitudRol->fresh(), 'aprobada'));

        return response()->json(['message' => 'Rol aprobado. La persona ya puede cambiar a ese rol.']);
    }

    public function rechazar(Request $request, SolicitudRol $solicitudRol)
    {
        $request->validate(['motivo_rechazo' => 'required|string|max:1000']);
        if ($solicitudRol->estado !== 'pendiente') {
            return response()->json(['message' => 'Esta solicitud ya fue procesada.'], 422);
        }
        $solicitudRol->forceFill([
            'estado' => 'rechazada', 'motivo_rechazo' => $request->input('motivo_rechazo'),
            'revisado_por' => auth()->id(), 'revisado_at' => now(),
        ])->save();
        Audit::log('rol.rechazado', $solicitudRol->user, ['rol' => $solicitudRol->rol_solicitado, 'solicitud_rol_id' => $solicitudRol->id]);
        $solicitudRol->user?->notify(new RolSolicitudAviso($solicitudRol, 'rechazada'));

        return response()->json(['message' => 'Solicitud rechazada. Se notificó a la persona.']);
    }

    public function cv(SolicitudRol $solicitudRol)
    {
        $nombre = ((array) ($solicitudRol->datos_rol ?? []))['cv'] ?? null;
        $ruta = RegistroRoles::DIR_CV.'/'.$nombre;
        if (! RegistroRoles::cvValido($nombre) || ! Storage::disk('local')->exists($ruta)) {
            abort(404);
        }
        Audit::log('rol.cv_descargado', $solicitudRol);

        return response()->file(Storage::disk('local')->path($ruta), [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="cv-rol-'.$solicitudRol->id.'.pdf"',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    /** Roles otorgados a una cuenta (para "Usuarios"). */
    public function rolesDeUsuario(User $user)
    {
        return response()->json(UsuarioRol::with('rol:id,slug,nombre')->where('user_id', $user->id)->get()
            ->map(fn ($r) => ['rol_id' => $r->rol_id, 'slug' => $r->rol?->slug, 'nombre' => $r->rol?->nombre, 'activo' => (int) $r->rol_id === (int) $user->rol_id]));
    }

    /** Retira un rol otorgado (nunca el activo: para eso se cambia el rol en Usuarios). */
    public function revocar(User $user, Rol $rol)
    {
        if ((int) $user->rol_id === (int) $rol->id) {
            return response()->json(['message' => 'Es el rol activo de la cuenta. Cambia primero su rol en Usuarios.'], 422);
        }
        $borrados = UsuarioRol::where('user_id', $user->id)->where('rol_id', $rol->id)->delete();
        Alcance::olvidar($user->id);
        if ($borrados) {
            Audit::log('rol.revocado', $user, ['rol' => $rol->slug]);
        }

        return response()->json(['message' => 'Rol retirado.']);
    }
}
