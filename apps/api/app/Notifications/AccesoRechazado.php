<?php

namespace App\Notifications;

use App\Models\SolicitudAcceso;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AccesoRechazado extends Notification implements ShouldQueue
{
    use Queueable;

    protected SolicitudAcceso $solicitudAcceso;

    public function __construct(SolicitudAcceso $solicitudAcceso)
    {
        $this->solicitudAcceso = $solicitudAcceso;
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Actualización sobre tu solicitud de acceso — COMECYT')
            ->view('emails.acceso-rechazado', [
                'nombre' => $this->solicitudAcceso->nombre,
                'motivo_rechazo' => $this->solicitudAcceso->motivo_rechazo,
                'app_url' => env('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
            ]);
    }
}
