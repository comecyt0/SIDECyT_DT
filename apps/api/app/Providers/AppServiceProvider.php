<?php

namespace App\Providers;

use App\Notifications\ResetPasswordNotification;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // SEGURIDAD (24/09/2026): política única de contraseñas (alta de usuarios, cambio, restablecimiento y
        // solicitud de acceso). Antes Password::defaults() no estaba definida: bastaban 8 caracteres cualesquiera.
        // Sin `uncompromised()`: consulta un servicio externo que este servidor no alcanza.
        // El front valida lo mismo (lib/password-policy.ts) para avisar antes de enviar.
        \Illuminate\Validation\Rules\Password::defaults(function () {
            return \Illuminate\Validation\Rules\Password::min(10)->letters()->mixedCase()->numbers();
        });

        // Use the COMECYT-branded password reset email template
        ResetPassword::toMailUsing(
            function (object $notifiable, string $token) {
                return (new ResetPasswordNotification($token))->toMail($notifiable);
            }
        );
    }
}
