<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class PasswordResetController extends Controller
{
    /** Enlaces por correo por hora (además de los 60 s del broker y del throttle por IP de la ruta). */
    private const ENLACES_POR_HORA = 5;

    /**
     * E68 (08/10/2026, pedido del usuario): la persona pide el enlace y le llega solo, sin que un administrador apruebe
     * nada (antes se creaba un PasswordResetRequest que el admin aprobaba en /admin/reset-requests).
     *
     * Seguridad: misma respuesta y misma duración exista o no la cuenta (el correo va por la cola); correo sin distinguir
     * mayúsculas; cuentas inactivas no reciben enlace; tope de enlaces por correo y hora (evita bombardear un buzón
     * desde muchas IP); el enlace vence en 60 min, es de un solo uso y al usarlo se invalidan las sesiones anteriores.
     */
    public function sendResetLink(Request $request)
    {
        $request->validate(['email' => 'required|email|max:255']);

        $respuesta = [
            'message' => 'Si el correo está registrado, en unos minutos recibirás un enlace para crear una contraseña nueva. Revisa también tu carpeta de spam.',
        ];

        $email = mb_strtolower(trim((string) $request->input('email')));
        $user = User::whereRaw('LOWER(email) = ?', [$email])->first();
        if (! $user || ! $user->activo) {
            Log::channel('security')->info('Password reset requested for unknown or inactive email', ['ip' => $request->ip()]);

            return response()->json($respuesta);
        }

        $clave = 'reset-enlaces:'.hash('sha256', $email);
        Cache::add($clave, 0, now()->addHour());
        if (Cache::increment($clave) > self::ENLACES_POR_HORA) {
            Log::channel('security')->warning('Password reset: tope de enlaces por hora', ['user_id' => $user->id, 'ip' => $request->ip()]);

            return response()->json($respuesta);
        }

        // Si se pidió hace menos de 60 s el broker responde "throttled": no se manda otro, la respuesta es la misma.
        $estado = Password::sendResetLink(['email' => $user->email]);
        if ($estado !== Password::RESET_LINK_SENT && $estado !== Password::RESET_THROTTLED) {
            Log::warning('Password reset link not sent', ['user_id' => $user->id, 'status' => $estado]);
        }

        return response()->json($respuesta);
    }

    /**
     * Reset the user's password using the valid token sent via email.
     */
    public function reset(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => ['required', 'confirmed', \Illuminate\Validation\Rules\Password::defaults()],
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
