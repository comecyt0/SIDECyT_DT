<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword as BaseResetPassword;
use Illuminate\Notifications\Messages\MailMessage;

class ResetPasswordNotification extends BaseResetPassword
{
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
            ->titulo('Recupera tu contraseña', 'Un administrador aprobó tu solicitud')->tono('azul')
            ->saludo($notifiable->name ?? '')
            ->linea('Pulsa el botón para crear una contraseña nueva. El enlace vence en 60 minutos y solo sirve una vez.')
            ->detalle(['Cuenta' => $notifiable->getEmailForPasswordReset()])
            ->pasos(['Pulsa «Crear contraseña nueva».', 'Escribe una contraseña de al menos 10 caracteres, con mayúsculas, minúsculas y un número.', 'Entra a SIGAE con tu nueva contraseña.'])
            ->linea('Si no pediste este cambio, ignora este correo: tu contraseña actual sigue funcionando.')
            ->boton('Crear contraseña nueva', $url)->mail();
    }
}
