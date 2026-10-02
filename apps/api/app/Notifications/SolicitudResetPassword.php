<?php

namespace App\Notifications;

use App\Models\PasswordResetRequest;
use App\Notifications\Channels\CampanaChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SolicitudResetPassword extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly PasswordResetRequest $resetRequest
    ) {}

    public function via(object $notifiable): array
    {
        // Campana además del correo (24/09/2026): el único admin tenía un correo de dominio sin MX y la solicitud
        // quedaba pendiente sin que nadie se enterara. Así el aviso llega al panel aunque el correo no llegue.
        return ['mail', CampanaChannel::class];
    }

    public function toCampana(object $notifiable): array
    {
        return [
            'tipo' => 'reset_password',
            'asunto' => 'Solicitud de recuperación de contraseña',
            'mensaje' => "{$this->resetRequest->email} pidió recuperar su contraseña. Ábrela para aprobarla o rechazarla.",
            'enlace' => \App\Support\EnlaceAviso::ruta($notifiable, '/admin/reset-requests'),
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        // 02/10/2026: plantilla única de SIGAE.
        return \App\Support\CorreoSigae::nuevo('Solicitud de recuperación de contraseña')
            ->titulo('Alguien pidió recuperar su contraseña')->estado('Por revisar', 'oro')
            ->saludo($notifiable->name ?? '')
            ->linea('Una persona pidió recuperar su contraseña. Revisa la solicitud y apruébala o recházala.')
            ->detalle(['Cuenta' => $this->resetRequest->email])
            ->pasos(['Abre «Recuperación de contraseñas».', 'Si la reconoces, apruébala: el sistema le envía el enlace.', 'Si no la reconoces, recházala.'])
            ->boton('Revisar la solicitud', '/admin/reset-requests')->mail();
    }
}
