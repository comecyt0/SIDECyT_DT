<?php

namespace App\Notifications;

use App\Models\PasswordResetRequest;
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
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $appUrl = rtrim(env('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'), '/');

        return (new MailMessage)
            ->subject('⚠️ Solicitud de Recuperación de Contraseña — COMECYT')
            ->greeting('Hola, Administrador')
            ->line("El usuario **{$this->resetRequest->email}** ha solicitado recuperar su contraseña en el sistema COMECYT.")
            ->line('Por favor accede al panel de administración para revisar y aprobar (o rechazar) esta solicitud.')
            ->action('Ver Solicitudes de Recuperación', $appUrl.'/admin/reset-requests')
            ->line('Si apruebas la solicitud, el sistema enviará automáticamente el enlace de recuperación al correo del usuario.')
            ->line('Si no reconoces esta solicitud, puedes rechazarla sin problema.')
            ->salutation('COMECYT — Sistema de Gestión de Apoyo Científico');
    }
}
