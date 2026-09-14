<?php

namespace App\Notifications;

use App\Models\SolicitudAcceso;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NuevaSolicitudAcceso extends Notification implements ShouldQueue
{
    use Queueable;

    protected SolicitudAcceso $solicitudAcceso;

    public function __construct(SolicitudAcceso $solicitudAcceso)
    {
        $this->solicitudAcceso = $solicitudAcceso;
    }

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("Nueva Solicitud de Acceso — {$this->solicitudAcceso->nombre}")
            ->view('emails.nueva-solicitud-acceso', [
                'solicitud' => $this->solicitudAcceso,
                'admin_name' => $notifiable->name,
                'app_url' => env('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
            ]);
    }

    public function toArray(object $notifiable): array
    {
        return [
            'tipo' => 'nueva_solicitud_acceso',
            'solicitud_acceso_id' => $this->solicitudAcceso->id,
            'nombre' => $this->solicitudAcceso->nombre,
            'email' => $this->solicitudAcceso->email,
            'empresa' => $this->solicitudAcceso->empresa_nombre,
            'mensaje' => "Nueva solicitud de acceso de {$this->solicitudAcceso->nombre} ({$this->solicitudAcceso->email})",
            'url' => '/admin/solicitudes-acceso',
        ];
    }
}
