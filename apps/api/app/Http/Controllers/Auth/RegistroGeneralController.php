<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\SolicitudAcceso;
use App\Models\User;
use App\Notifications\NuevaSolicitudAcceso;
use App\Support\RegistroRoles;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

/**
 * E52 · Fase 5 — Registro general de SIDECyT (reemplaza "Solicitar acceso").
 *
 * Una cuenta con datos personales (nombre, correo, contraseña, teléfono, CURP, CP + colonia del Estado de México, cargo)
 * y el ROL elegido al registrarse: Participante (SIGAE; pide los datos de la empresa), Líder de club (Apoyo en especie)
 * o Evaluador (área, institución, grado y CV en PDF). Un admin aprueba la cuenta con su rol (decisión del usuario).
 *
 * Seguridad: endpoint público con throttle, lista blanca de campos, municipio resuelto en el servidor, CV verificado por
 * contenido y guardado en disco privado. Correo o CURP ya registrados reciben la MISMA respuesta que un registro nuevo
 * (no se revela qué personas tienen cuenta, igual que E44 con el correo).
 */
class RegistroGeneralController extends Controller
{
    /** Opciones públicas del formulario (áreas de conocimiento y grados). Solo id y nombre: nada sensible. */
    public function opciones()
    {
        return response()->json([
            'areas' => \Illuminate\Support\Facades\DB::table('areas_conocimiento')->orderBy('nombre')->get(['id', 'nombre']),
            'grados' => array_values((array) config('comecyt.registro.grados_academicos')),
            'cv_max_mb' => (int) config('comecyt.registro.cv_max_mb', 5),
        ])->header('Cache-Control', 'public, max-age=3600');
    }

    public function registrar(Request $request)
    {
        $roles = RegistroRoles::rolesAutoservicio();
        $base = Validator::make($request->all(), [
            'rol_solicitado' => 'required|in:'.implode(',', $roles),
        ]);
        $base->validate();
        $rol = (string) $request->input('rol_solicitado');

        // Normalizar antes de validar.
        $request->merge([
            'curp' => mb_strtoupper(trim((string) $request->input('curp'))),
            'email' => mb_strtolower(trim((string) $request->input('email'))),
        ]);

        $request->validate(array_merge(
            RegistroRoles::reglasPersona(),
            [
                'rol_solicitado' => 'required|in:'.implode(',', $roles),
                'email' => ['required', 'email', 'max:255'],
                'password' => ['required', 'string', 'confirmed', Password::defaults()],
                'terminos_aceptados' => 'required|accepted',
            ],
            RegistroRoles::reglasRol($rol),
        ), array_merge(RegistroRoles::mensajes(), [
            'terminos_aceptados.required' => 'Debes aceptar los términos y el aviso de privacidad.',
            'terminos_aceptados.accepted' => 'Debes aceptar los términos y el aviso de privacidad.',
        ]));

        $domicilio = RegistroRoles::resolverDomicilio((string) $request->input('codigo_postal'), (string) $request->input('colonia'));

        $respuesta = ['message' => 'Tu registro fue recibido. Un administrador revisará tu cuenta y te avisaremos por correo cuando esté aprobada.'];

        $email = (string) $request->input('email');
        $curp = (string) $request->input('curp');
        $duplicado = User::whereRaw('LOWER(email) = ?', [$email])->exists()
            || User::where('curp', $curp)->exists()
            || SolicitudAcceso::whereRaw('LOWER(email) = ?', [$email])->exists()
            || SolicitudAcceso::where('curp', $curp)->where('estado', 'pendiente')->exists();
        if ($duplicado) {
            Log::channel('security')->info('Registro general duplicado ignorado (correo o CURP)', ['ip' => $request->ip()]);

            return response()->json($respuesta, 201);
        }

        $cv = $rol === 'evaluador' ? RegistroRoles::guardarCv($request->file('cv')) : null;
        $datosRol = RegistroRoles::datosRol($request, $rol, $cv);

        try {
            $s = new SolicitudAcceso();
            $s->forceFill([
                'nombre' => trim((string) $request->input('nombre')),
                'email' => $email,
                'password' => (string) $request->input('password'), // cast 'hashed'
                'rol_solicitado' => $rol,
                'cargo' => trim((string) $request->input('cargo')),
                'telefono' => (string) $request->input('telefono'),
                'curp' => $curp,
                'codigo_postal' => $domicilio['codigo_postal'],
                'municipio' => $domicilio['municipio'],
                'colonia' => $domicilio['colonia'],
                'empresa_nombre' => $rol === 'solicitante' ? $datosRol['empresa_nombre'] : null,
                'empresa_datos' => $rol === 'solicitante' ? $datosRol['empresa_datos'] : null,
                'contactos' => $rol === 'solicitante' ? $datosRol['contactos'] : null,
                'datos_rol' => $rol === 'evaluador' ? $datosRol : null,
                'terminos_aceptados' => true,
                'estado' => 'pendiente',
            ])->save();
        } catch (\Illuminate\Database\QueryException $e) {
            // Dos envíos simultáneos con el mismo correo: mismo trato que un duplicado.
            return response()->json($respuesta, 201);
        }

        foreach (User::where('rol_id', config('comecyt.roles.admin'))->where('activo', true)->get() as $admin) {
            $admin->notify(new NuevaSolicitudAcceso($s));
        }

        return response()->json($respuesta, 201);
    }
}
