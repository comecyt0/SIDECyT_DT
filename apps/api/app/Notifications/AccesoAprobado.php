<?php

namespace App\Notifications;

use App\Models\SolicitudAcceso;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AccesoAprobado extends Notification implements ShouldQueue
{
    use Queueable;

    /** Si el registro se borró antes de enviarse (p. ej. datos de prueba), el aviso se descarta sin fallar. */
    public bool $deleteWhenMissingModels = true;

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
            ->subject('Tu acceso a COMECYT ha sido aprobado')
            ->view('emails.acceso-aprobado', [
                'nombre' => $this->solicitudAcceso->nombre,
                'email' => $this->solicitudAcceso->email,
                'app_url' => config('app.frontend_url'),
            ]);
    }
}
