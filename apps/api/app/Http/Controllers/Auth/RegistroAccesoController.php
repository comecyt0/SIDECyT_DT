<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\AccesoRechazadoMail;
use App\Models\Empresa;
use App\Models\SolicitudAcceso;
use App\Models\User;
use App\Notifications\AccesoAprobado;
use App\Notifications\NuevaSolicitudAcceso;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class RegistroAccesoController extends Controller
{
    /**
     * Public endpoint — submit a new access request.
     *
     * Recibe datos extendidos del postulante:
     *   - cuenta:    nombre, email, password
     *   - empresa:   empresa_nombre, rfc, tipo_persona, rol_supervision
     *   - contactos: { responsable, legal, administrativo, tecnico } cada uno {nombre, telefono, correo}
     *   - terminos:  terminos_aceptados (bool, required = true)
     */
    public function store(Request $request)
    {
        $request->validate([
            'nombre' => 'required|string|max:255',
            // SEGURIDAD (24/09/2026): sin Rule::unique — su 422 "ya está registrado" revelaba qué correos tienen
            // cuenta. El duplicado se detecta abajo y recibe la misma respuesta que una solicitud nueva.
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'confirmed', \Illuminate\Validation\Rules\Password::defaults()],
            'empresa_nombre' => 'required|string|max:255',
            'cargo' => 'nullable|string|max:255',
            'telefono' => 'nullable|string|max:20',
            'motivo' => 'nullable|string|max:2000',

            // Datos de la empresa
            'empresa_datos' => 'nullable|array',
            'empresa_datos.rfc' => 'nullable|string|max:13',
            'empresa_datos.tipo_persona' => 'nullable|in:fisica,moral,asociacion_civil,otro',
            'empresa_datos.rol_supervision' => 'nullable|string|max:255',

            // Contactos por rol
            'contactos' => 'nullable|array',
            'contactos.responsable.nombre' => 'nullable|string|max:255',
            'contactos.responsable.telefono' => 'nullable|string|max:20',
            'contactos.responsable.correo' => 'nullable|email|max:255',
            'contactos.legal.nombre' => 'nullable|string|max:255',
            'contactos.legal.telefono' => 'nullable|string|max:20',
            'contactos.legal.correo' => 'nullable|email|max:255',
            'contactos.administrativo.nombre' => 'nullable|string|max:255',
            'contactos.administrativo.telefono' => 'nullable|string|max:20',
            'contactos.administrativo.correo' => 'nullable|email|max:255',
            'contactos.tecnico.nombre' => 'nullable|string|max:255',
            'contactos.tecnico.telefono' => 'nullable|string|max:20',
            'contactos.tecnico.correo' => 'nullable|email|max:255',

            // Términos y condiciones — REQUIRED
            'terminos_aceptados' => 'required|accepted',
        ], [
            'terminos_aceptados.required' => 'Debes aceptar los términos y condiciones para continuar.',
            'terminos_aceptados.accepted' => 'Debes aceptar los términos y condiciones para continuar.',
        ]);

        $respuesta = [
            'message' => 'Tu solicitud de acceso ha sido recibida. Te notificaremos por correo cuando sea revisada.',
        ];

        $email = mb_strtolower(trim((string) $request->email));
        $yaExiste = User::whereRaw('LOWER(email) = ?', [$email])->exists()
            // Cualquier estado: la columna es única en BD; un create() duplicado daría 500 (otra forma de enumerar).
            || SolicitudAcceso::whereRaw('LOWER(email) = ?', [$email])->exists();
        if ($yaExiste) {
            Log::channel('security')->info('Solicitud de acceso duplicada ignorada', ['ip' => $request->ip()]);

            return response()->json($respuesta, 201);
        }

        try {
            $solicitudAcceso = SolicitudAcceso::create([
            'nombre' => $request->nombre,
            'email' => $request->email,
            'password' => $request->password, // cast 'hashed' del modelo se encarga
            'empresa_nombre' => $request->empresa_nombre,
            'cargo' => $request->cargo,
            'telefono' => $request->telefono,
            'motivo' => $request->motivo,
            'empresa_datos' => $request->empresa_datos,
            'contactos' => $request->contactos,
            'terminos_aceptados' => true,
            'estado' => 'pendiente',
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            // Dos envíos simultáneos con el mismo correo: mismo trato que un duplicado.
            return response()->json($respuesta, 201);
        }

        // Notify all admin users
        $admins = User::where('rol_id', 1)->where('activo', true)->get();
        foreach ($admins as $admin) {
            $admin->notify(new NuevaSolicitudAcceso($solicitudAcceso));
        }

        return response()->json($respuesta, 201);
    }

    /**
     * Admin only — list all access requests ordered by creation date.
     */
    public function index()
    {
        $solicitudes = SolicitudAcceso::with('revisadoPor:id,name,email')
            ->orderBy('created_at', 'desc')
            ->get();

        // E52: nombre del área de conocimiento del evaluador y si trae CV (el archivo solo se descarga por cv()).
        $areas = DB::table('areas_conocimiento')->pluck('nombre', 'id');
        $solicitudes->each(function ($s) use ($areas, $solicitudes) {
            // E67: ¿es un reintento? Rechazos anteriores con el mismo correo o la misma CURP (y el último motivo).
            $previas = $solicitudes->filter(fn ($o) => $o->id < $s->id && $o->estado === 'rechazada'
                && (mb_strtolower((string) $o->email) === mb_strtolower((string) $s->email) || ($s->curp && $o->curp === $s->curp)))->sortByDesc('id');
            $s->setAttribute('rechazos_previos', $previas->count());
            $s->setAttribute('motivo_rechazo_previo', $previas->first()?->motivo_rechazo);
            $d = (array) ($s->datos_rol ?? []);
            $s->setAttribute('area_nombre', isset($d['area_conocimiento_id']) ? ($areas[$d['area_conocimiento_id']] ?? null) : null);
            $s->setAttribute('tiene_cv', \App\Support\RegistroRoles::cvValido($d['cv'] ?? null));
            if (isset($d['cv'])) {
                unset($d['cv']);
                $s->setAttribute('datos_rol', $d);
            }
        });

        return response()->json($solicitudes);
    }

    /** E52 — Admin: descarga el CV (PDF) que adjuntó un evaluador en su registro. Disco privado; 404 si no hay. */
    public function cv(SolicitudAcceso $solicitudAcceso)
    {
        $nombre = ((array) ($solicitudAcceso->datos_rol ?? []))['cv'] ?? null;
        $ruta = \App\Support\RegistroRoles::DIR_CV.'/'.$nombre;
        if (! \App\Support\RegistroRoles::cvValido($nombre) || ! \Illuminate\Support\Facades\Storage::disk('local')->exists($ruta)) {
            abort(404);
        }
        \App\Support\Audit::log('acceso.cv_descargado', $solicitudAcceso);

        return response()->file(\Illuminate\Support\Facades\Storage::disk('local')->path($ruta), [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="cv-'.$solicitudAcceso->id.'.pdf"',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    /**
     * Admin only — approve an access request and create the user account.
     * Copia los datos extendidos (empresa_datos, contactos) a la nueva
     * Empresa y User creados.
     */
    public function aprobar(SolicitudAcceso $solicitudAcceso)
    {
        if ($solicitudAcceso->estado !== 'pendiente') {
            return response()->json([
                'message' => 'Esta solicitud ya fue procesada.',
            ], 422);
        }

        $cuentaYaExistiaResp = false;
        // E52: el rol lo eligió la persona al registrarse (registro general). Las solicitudes anteriores eran todas de
        // solicitante (columna con valor por defecto).
        $rol = $solicitudAcceso->rol_solicitado ?: 'solicitante';
        if (! in_array($rol, \App\Support\RegistroRoles::rolesAutoservicio(), true)) {
            return response()->json(['message' => 'El rol solicitado no es válido.'], 422);
        }
        if ($solicitudAcceso->curp
            && User::where('curp', $solicitudAcceso->curp)->where('email', '!=', $solicitudAcceso->email)->exists()) {
            return response()->json(['message' => 'Ya existe otra cuenta con esa CURP. Revisa con la persona antes de aprobar.'], 422);
        }

        DB::transaction(function () use ($solicitudAcceso, &$cuentaYaExistiaResp, $rol) {
            $empresaDatos = (array) ($solicitudAcceso->empresa_datos ?? []);
            $empresa = null;
            if ($rol === 'solicitante' && $solicitudAcceso->empresa_nombre) {

            // Find or create empresa con los datos extendidos
            $empresa = Empresa::firstOrCreate(
                ['nombre' => $solicitudAcceso->empresa_nombre],
                [
                    'nombre' => $solicitudAcceso->empresa_nombre,
                    'rfc' => $empresaDatos['rfc'] ?? null,
                    'tipo_persona' => $empresaDatos['tipo_persona'] ?? null,
                    'rol_supervision' => $empresaDatos['rol_supervision'] ?? null,
                ]
            );

            // Si la empresa ya existía y nos llegaron datos nuevos, mergeamos los faltantes
            if ($empresa->wasRecentlyCreated === false && ! empty($empresaDatos)) {
                $empresa->fill(array_filter([
                    'rfc' => $empresa->rfc ?: ($empresaDatos['rfc'] ?? null),
                    'tipo_persona' => $empresa->tipo_persona ?: ($empresaDatos['tipo_persona'] ?? null),
                    'rol_supervision' => $empresa->rol_supervision ?: ($empresaDatos['rol_supervision'] ?? null),
                ]))->save();
            }
            }

            // La cuenta puede existir ya (p. ej. un admin la dio de alta a mano en /admin/usuarios
            // antes de que alguien aprobara esta misma solicitud). Sin este chequeo, User::create()
            // truena con "duplicate key value violates unique constraint users_email_unique" (23505)
            // y la solicitud queda atascada en "pendiente" para siempre — ver docs/ESTADO_ACTUAL.md.
            $user = User::where('email', $solicitudAcceso->email)->first();
            $cuentaYaExistia = $user !== null;
            $cuentaYaExistiaResp = $cuentaYaExistia;

            $rolId = (int) config("comecyt.roles.{$rol}");
            if (! $user) {
                // E52: la cuenta nace con el rol que eligió al registrarse y sus datos personales.
                $user = User::create([
                    'name' => $solicitudAcceso->nombre,
                    'email' => $solicitudAcceso->email,
                    'password' => $solicitudAcceso->password, // already hashed
                    'rol_id' => $rolId,
                    'empresa_id' => $empresa?->id,
                    'activo' => true,
                    'cargo' => $solicitudAcceso->cargo,
                    'telefono' => $solicitudAcceso->telefono,
                    'terminos_aceptados_at' => $solicitudAcceso->terminos_aceptados ? now() : null,
                ]);
                $user->forceFill([
                    'curp' => $solicitudAcceso->curp,
                    'codigo_postal' => $solicitudAcceso->codigo_postal,
                    'municipio' => $solicitudAcceso->municipio,
                    'colonia' => $solicitudAcceso->colonia,
                    'datos_registro' => $rol === 'evaluador' ? $solicitudAcceso->datos_rol : null,
                    // 08/10/2026: se registró como director(a) de la escuela (Club De Robótica).
                    'es_director' => $rol === 'lider_club' && (($solicitudAcceso->datos_rol['es_director'] ?? false) === true),
                ])->save();
            } else {
                Log::warning('RegistroAccesoController::aprobar — cuenta ya existía, se cierra la solicitud sin duplicarla', [
                    'solicitud_id' => $solicitudAcceso->id,
                    'email' => $solicitudAcceso->email,
                    'user_id' => $user->id,
                ]);
            }
            // E52: el rol queda entre los roles otorgados de la persona (puede tener varios y cambiar entre ellos).
            \App\Models\UsuarioRol::otorgar($user->id, $rolId, auth()->id());
            \App\Support\Audit::log('acceso.aprobado', $user, ['rol' => $rol, 'solicitud_acceso_id' => $solicitudAcceso->id]);

            // Mark request as approved.
            // forceFill(), NO update(): 'estado'/'revisado_por'/'revisado_at' están en $guarded a
            // propósito (SEV-1, evita que el público los mande en store()), pero eso bloqueaba TAMBIÉN
            // esta escritura legítima del propio controlador — update() los descartaba en silencio y
            // la solicitud se quedaba en "pendiente" para siempre aunque la respuesta dijera
            // "aprobada" (E30 en CLAUDE.md; ninguna solicitud de acceso se había cerrado nunca).
            $solicitudAcceso->forceFill([
                'estado' => 'aprobada',
                'revisado_por' => auth()->id(),
                'revisado_at' => now(),
            ])->save();

            // Notify applicant — solo si la cuenta se creó ahora. Si ya existía y estaba activa,
            // reenviar "tu acceso fue aprobado" confundiría a alguien que ya usa el sistema.
            if (! $cuentaYaExistia) {
                $user->notify(new AccesoAprobado($solicitudAcceso));
            }
        });

        return response()->json([
            'message' => $cuentaYaExistiaResp
                ? 'Solicitud aprobada. La cuenta de usuario ya existía y quedó vinculada.'
                : 'Solicitud aprobada. La cuenta de usuario ha sido creada.',
        ]);
    }

    /**
     * Admin only — reject an access request with a reason.
     */
    public function rechazar(Request $request, SolicitudAcceso $solicitudAcceso)
    {
        $request->validate([
            'motivo_rechazo' => 'required|string',
        ]);

        if ($solicitudAcceso->estado !== 'pendiente') {
            return response()->json([
                'message' => 'Esta solicitud ya fue procesada.',
            ], 422);
        }

        // forceFill(), no update() — mismo motivo que en aprobar(): esos campos están en $guarded
        // para el público, pero esta escritura es del propio controlador. Ver E30 en CLAUDE.md.
        $solicitudAcceso->forceFill([
            'estado' => 'rechazada',
            'motivo_rechazo' => $request->motivo_rechazo,
            'revisado_por' => auth()->id(),
            'revisado_at' => now(),
        ])->save();

        // Send rejection email directly via Mail facade (applicant has no User account yet)
        Mail::to($solicitudAcceso->email)
            ->queue(new AccesoRechazadoMail($solicitudAcceso));

        return response()->json([
            'message' => 'Solicitud rechazada. Se ha notificado al solicitante.',
        ]);
    }
}
