<?php

namespace App\Notifications;

use App\Models\Solicitud;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SolicitudObservada extends Notification implements ShouldQueue
{
    use Queueable;

    protected $solicitud;

    protected $observaciones;

    /**
     * Create a new notification instance.
     */
    public function __construct(Solicitud $solicitud, $observaciones = '')
    {
        $this->solicitud = $solicitud;
        $this->observaciones = $observaciones;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("Solicitud Devuelta para Correcciones - Folio {$this->solicitud->folio}")
            ->markdown('emails.solicitud-observada', [
                'user_name' => $notifiable->name,
                'folio' => $this->solicitud->folio,
                'titulo_proyecto' => $this->solicitud->titulo_proyecto,
                'fecha_observacion' => now(),
                'observaciones' => $this->observaciones,
                'solicitud_id' => $this->solicitud->id,
                'app_url' => env('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
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
            'tipo' => 'solicitud_observada',
            'mensaje' => 'Tu solicitud ha sido devuelta con observaciones.',
            'url' => "/solicitante/solicitudes/{$this->solicitud->id}",
        ];
    }
}
