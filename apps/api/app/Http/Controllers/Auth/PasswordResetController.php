<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\PasswordResetRequest;
use App\Models\User;
use App\Notifications\SolicitudResetPassword;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class PasswordResetController extends Controller
{
    /**
     * User requests password reset.
     * Creates a pending request and notifies the admin.
     */
    public function sendResetLink(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        // Verify the email belongs to a registered user
        $user = User::where('email', $request->email)->first();
        if (! $user) {
            return response()->json([
                'message' => 'Este correo electrónico no está registrado en el sistema. Si necesitas acceso, usa la opción "Solicitar Acceso".',
            ], 404);
        }

        // Create or replace pending request (only one active at a time per email)
        PasswordResetRequest::where('email', $request->email)
            ->where('status', 'pending')
            ->delete();

        $resetRequest = PasswordResetRequest::create([
            'email' => $request->email,
            'nombre' => $user->name,
            'status' => 'pending',
        ]);

        // Notify all admin users
        try {
            $admins = User::where('rol_id', config('comecyt.roles.admin'))->get();
            foreach ($admins as $admin) {
                $admin->notify(new SolicitudResetPassword($resetRequest));
            }
        } catch (\Throwable $e) {
            Log::warning('SolicitudResetPassword notification failed', ['error' => $e->getMessage()]);
        }

        return response()->json([
            'message' => 'Tu solicitud ha sido enviada al administrador. Recibirás el enlace de recuperación una vez que sea aprobada.',
        ]);
    }

    /**
     * Admin approves a password reset request.
     * Uses Laravel's built-in mechanism to send the actual reset link to the user.
     */
    public function adminApprove(Request $request, PasswordResetRequest $resetRequest)
    {
        if ($resetRequest->status !== 'pending') {
            return response()->json(['error' => 'Esta solicitud ya fue procesada.'], 422);
        }

        // Clear any existing throttle so admin approval always goes through
        DB::table('password_reset_tokens')->where('email', $resetRequest->email)->delete();

        $status = Password::sendResetLink(['email' => $resetRequest->email]);

        if ($status === Password::RESET_LINK_SENT) {
            $resetRequest->update([
                'status' => 'approved',
                'approved_at' => now(),
            ]);

            return response()->json(['message' => "Solicitud aprobada. Se ha enviado el enlace de recuperación a {$resetRequest->email}."]);
        }

        return response()->json(['error' => 'No se pudo enviar el enlace. Verifica que el correo esté registrado.'], 500);
    }

    /**
     * Admin rejects a password reset request.
     */
    public function adminReject(Request $request, PasswordResetRequest $resetRequest)
    {
        if ($resetRequest->status !== 'pending') {
            return response()->json(['error' => 'Esta solicitud ya fue procesada.'], 422);
        }

        $resetRequest->update(['status' => 'rejected']);

        return response()->json(['message' => 'Solicitud rechazada.']);
    }

    /**
     * Admin lists all password reset requests.
     */
    public function adminIndex(Request $request)
    {
        $requests = PasswordResetRequest::orderBy('created_at', 'desc')
            ->limit(100)
            ->get();

        return response()->json($requests);
    }

    /**
     * Reset the user's password using the valid token sent via email.
     */
    public function reset(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|min:8|confirmed',
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();
                event(new PasswordReset($user));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Contraseña actualizada exitosamente.']);
        }

        return response()->json(['message' => 'Token inválido o expirado.'], 422);
    }
}
