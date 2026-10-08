<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword as BaseResetPassword;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;

/**
 * E68 (08/10/2026) — Enlace de recuperación automático (ya no lo aprueba un administrador). Va por la cola para que
 * forgot-password tarde lo mismo exista o no la cuenta.
 */
class ResetPasswordNotification extends BaseResetPassword implements ShouldQueue
{
    use Queueable;

    /** Un solo intento: si falla, la persona puede volver a pedirlo (un enlace viejo reintentado más tarde confunde). */
    public int $tries = 1;

    /**
     * Build the mail representation of the notification.
     * Uses the COMECYT-branded password-reset template.
     */
    public function toMail($notifiable): MailMessage
    {
        $frontendUrl = rtrim(config('app.frontend_url'), '/');
        $url = $frontendUrl.'/reset-password?token='.$this->token.'&email='.urlencode($notifiable->getEmailForPasswordReset());

        // 02/10/2026: plantilla única de SIGAE.
        return \App\Support\CorreoSigae::nuevo('Recupera tu contraseña')
            ->titulo('Recupera tu contraseña', 'Pediste crear una contraseña nueva')->tono('azul')
            ->saludo($notifiable->name ?? '')
            ->linea('Pulsa el botón para crear una contraseña nueva. El enlace vence en 60 minutos y solo sirve una vez.')
            ->detalle(['Cuenta' => $notifiable->getEmailForPasswordReset()])
            ->pasos(['Pulsa «Crear contraseña nueva».', 'Escribe una contraseña de al menos 10 caracteres, con mayúsculas, minúsculas y un número.', 'Entra a SIGAE con tu nueva contraseña.'])
            ->linea('Si no pediste este cambio, ignora este correo: tu contraseña actual sigue funcionando y nadie puede cambiarla sin este enlace.')
            ->boton('Crear contraseña nueva', $url)->mail();
    }
}
