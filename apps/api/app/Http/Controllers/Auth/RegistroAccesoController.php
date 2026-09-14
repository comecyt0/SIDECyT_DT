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
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

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
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email'),
                Rule::unique('solicitudes_acceso', 'email'),
            ],
            'password' => 'required|string|min:8|confirmed',
            'empresa_nombre' => 'required|string|max:255',
            'cargo' => 'nullable|string|max:255',
            'telefono' => 'nullable|string|max:20',
            'motivo' => 'nullable|string',

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

        // Notify all admin users
        $admins = User::where('rol_id', 1)->where('activo', true)->get();
        foreach ($admins as $admin) {
            $admin->notify(new NuevaSolicitudAcceso($solicitudAcceso));
        }

        return response()->json([
            'message' => 'Tu solicitud de acceso ha sido recibida. Te notificaremos por correo cuando sea revisada.',
            'solicitud_id' => $solicitudAcceso->id,
        ], 201);
    }

    /**
     * Admin only — list all access requests ordered by creation date.
     */
    public function index()
    {
        $solicitudes = SolicitudAcceso::with('revisadoPor:id,name,email')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($solicitudes);
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

        DB::transaction(function () use ($solicitudAcceso) {
            $empresaDatos = (array) ($solicitudAcceso->empresa_datos ?? []);

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

            // Create the user account (rol_id=4 = solicitante)
            $user = User::create([
                'name' => $solicitudAcceso->nombre,
                'email' => $solicitudAcceso->email,
                'password' => $solicitudAcceso->password, // already hashed
                'rol_id' => config('comecyt.roles.solicitante'),
                'empresa_id' => $empresa->id,
                'activo' => true,
                'cargo' => $solicitudAcceso->cargo,
                'telefono' => $solicitudAcceso->telefono,
                'terminos_aceptados_at' => $solicitudAcceso->terminos_aceptados ? now() : null,
            ]);

            // Mark request as approved
            $solicitudAcceso->update([
                'estado' => 'aprobada',
                'revisado_por' => auth()->id(),
                'revisado_at' => now(),
            ]);

            // Notify applicant
            $user->notify(new AccesoAprobado($solicitudAcceso));
        });

        return response()->json([
            'message' => 'Solicitud aprobada. La cuenta de usuario ha sido creada.',
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

        $solicitudAcceso->update([
            'estado' => 'rechazada',
            'motivo_rechazo' => $request->motivo_rechazo,
            'revisado_por' => auth()->id(),
            'revisado_at' => now(),
        ]);

        // Send rejection email directly via Mail facade (applicant has no User account yet)
        Mail::to($solicitudAcceso->email)
            ->queue(new AccesoRechazadoMail($solicitudAcceso));

        return response()->json([
            'message' => 'Solicitud rechazada. Se ha notificado al solicitante.',
        ]);
    }
}
