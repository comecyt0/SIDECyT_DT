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
        // E67 (08/10/2026): una solicitud RECHAZADA ya no bloquea (la persona puede corregir, p. ej. el rol, y volver a
        // registrarse). Bloquean una cuenta existente o una solicitud pendiente con ese correo o esa CURP.
        $duplicado = User::whereRaw('LOWER(email) = ?', [$email])->exists()
            || User::where('curp', $curp)->exists()
            || SolicitudAcceso::where('estado', 'pendiente')
                ->where(fn ($q) => $q->whereRaw('LOWER(email) = ?', [$email])->orWhere('curp', $curp))->exists();
        if ($duplicado) {
            // 06/10/2026: antes solo quedaba en nivel `info` (el log está en `warning`) y nadie se enteraba: la persona veía
            // «recibido» y no pasaba nada. Ahora queda en el log y le llega un aviso al correo escrito (la pantalla no cambia).
            $this->avisarDuplicado($request, $email, 'correo o CURP ya registrados');

            return response()->json($respuesta, 201);
        }

        // E67: desde el 3.er rechazo (por correo o CURP), pausa de 24 h. La pantalla responde igual; el aviso va al correo.
        if ($hasta = \App\Support\ReintentoRegistro::pausaHasta($email, $curp)) {
            [$local, $dominio] = array_pad(explode('@', $email, 2), 2, '');
            Log::channel('security')->warning('Registro general en pausa (3 o más rechazos)', ['email' => mb_substr($local, 0, 1).'***@'.$dominio, 'ip' => $request->ip()]);
            if (\Illuminate\Support\Facades\Cache::add('registro-pausa:'.hash('sha256', $email), 1, now()->addMinutes(30))) {
                \Illuminate\Support\Facades\Notification::route('mail', $email)
                    ->notify(new \App\Notifications\RegistroEstadoAviso('pausa', ['hasta' => \App\Support\ReintentoRegistro::fecha($hasta)]));
            }

            return response()->json($respuesta, 201);
        }
        $intento = \App\Support\ReintentoRegistro::rechazos($email, $curp) + 1;

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
            // Dos envíos simultáneos con el mismo correo: mismo trato que un duplicado. Si fuera otro error de la base,
            // queda en el log (sin datos personales) en lugar de perderse.
            if (! in_array($e->getCode(), ['23505', '23000'], true)) {
                Log::error('Registro general: no se pudo guardar la solicitud', ['codigo' => $e->getCode(), 'error' => mb_substr($e->getMessage(), 0, 300)]);
            }
            $this->avisarDuplicado($request, $email, 'guardado simultáneo o error de base');

            return response()->json($respuesta, 201);
        }

        foreach (User::where('rol_id', config('comecyt.roles.admin'))->where('activo', true)->get() as $admin) {
            $admin->notify(new NuevaSolicitudAcceso($s));
        }
        // E67: correo a la persona: registro recibido, con folio, rol y si es un reintento.
        \Illuminate\Support\Facades\Notification::route('mail', $email)->notify(new \App\Notifications\RegistroEstadoAviso('recibido', [
            'nombre' => $s->nombre, 'folio' => $s->id, 'intento' => $intento,
            'rol' => \App\Notifications\RolSolicitudAviso::ETIQUETAS[$rol] ?? $rol,
        ]));

        return response()->json($respuesta, 201);
    }

    /** Registro que no se creó: log de seguridad (correo enmascarado) y aviso al correo escrito, uno cada 30 min por correo. */
    private function avisarDuplicado(Request $request, string $email, string $motivo): void
    {
        [$local, $dominio] = array_pad(explode('@', $email, 2), 2, '');
        Log::channel('security')->warning('Registro general no creado: '.$motivo, [
            'email' => mb_substr($local, 0, 1).'***@'.$dominio, 'ip' => $request->ip(),
        ]);
        if (! \Illuminate\Support\Facades\Cache::add('registro-duplicado:'.hash('sha256', $email), 1, now()->addMinutes(30))) {
            return;
        }
        try {
            \Illuminate\Support\Facades\Notification::route('mail', $email)->notify(new \App\Notifications\RegistroDuplicadoAviso());
        } catch (\Throwable $e) {
            Log::warning('Registro general: no se pudo encolar el aviso de duplicado', ['error' => $e->getMessage()]);
        }
    }
}
