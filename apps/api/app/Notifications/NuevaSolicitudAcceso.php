<?php

namespace App\Notifications;

use App\Notifications\Channels\CampanaChannel;
use App\Models\SolicitudAcceso;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NuevaSolicitudAcceso extends Notification implements ShouldQueue
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
        return ['mail', CampanaChannel::class];
    }

    public function toMail(object $notifiable): MailMessage
    {
        // 02/10/2026: plantilla única de SIGAE.
        $s = $this->solicitudAcceso;

        return \App\Support\CorreoSigae::nuevo('Nueva solicitud de acceso')
            ->titulo('Nueva solicitud de acceso', $s->nombre)->estado('Por revisar', 'oro')
            ->saludo($notifiable->name ?? '')
            ->linea("{$s->nombre} pidió acceso a SIGAE. Revisa sus datos y apruébala o recházala.")
            ->detalle(['Nombre' => $s->nombre, 'Correo' => $s->email, 'Empresa o institución' => $s->empresa_nombre ?? null])
            ->boton('Revisar la solicitud', '/admin/solicitudes-acceso')->mail();
    }

    public function toArray(object $notifiable): array
    {
        return [
            'tipo' => 'nueva_solicitud_acceso',
            'solicitud_acceso_id' => $this->solicitudAcceso->id,
            'nombre' => $this->solicitudAcceso->nombre,
            'email' => $this->solicitudAcceso->email,
            'empresa' => $this->solicitudAcceso->empresa_nombre,
            'asunto' => 'Nueva solicitud de acceso',
            'mensaje' => "{$this->solicitudAcceso->nombre} ({$this->solicitudAcceso->email}) pidió acceso al sistema. Ábrela para aprobarla o rechazarla.",
            'enlace' => \App\Support\EnlaceAviso::ruta($notifiable, '/admin/solicitudes-acceso'),
            'url' => '/admin/solicitudes-acceso',
        ];
    }
}
