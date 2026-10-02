<?php

namespace App\Notifications;

use App\Notifications\Channels\CampanaChannel;
use App\Models\Solicitud;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SolicitudEnviada extends Notification implements ShouldQueue
{
    use Queueable;

    protected $solicitud;

    /**
     * Create a new notification instance.
     */
    public function __construct(Solicitud $solicitud)
    {
        $this->solicitud = $solicitud;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', CampanaChannel::class];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("Solicitud Enviada - Folio {$this->solicitud->folio}")
            ->markdown('emails.solicitud-enviada', [
                'user_name' => $notifiable->name,
                'folio' => $this->solicitud->folio,
                'titulo_proyecto' => $this->solicitud->titulo_proyecto,
                'monto_solicitado' => $this->solicitud->monto_solicitado,
                'fecha_envio' => now(),
                'solicitud_id' => $this->solicitud->id,
                'app_url' => config('app.frontend_url'),
            ]);
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'solicitud_id' => $this->solicitud->id,
            'folio' => $this->solicitud->folio,
            'tipo' => 'solicitud_enviada',
            'asunto' => 'Solicitud enviada a revisión',
            'mensaje' => \App\Support\EnlaceAviso::panel($notifiable) === '/solicitante'
                ? "Tu solicitud {$this->solicitud->folio} se envió a revisión. Te avisaremos de cada cambio."
                : "La solicitud {$this->solicitud->folio} se envió a revisión. Ábrela para revisarla.",
            'enlace' => \App\Support\EnlaceAviso::solicitud($notifiable, (int) $this->solicitud->id, $this->solicitud->folio),
            'url' => "/solicitante/solicitudes/{$this->solicitud->id}",
        ];
    }
}
