<?php

namespace App\Notifications;

use App\Models\Solicitud;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SolicitudEstadoActualizado extends Notification implements ShouldQueue
{
    use Queueable;

    protected $solicitud;

    protected $mensajeCustom;

    /**
     * Create a new notification instance.
     */
    public function __construct(Solicitud $solicitud, $mensajeCustom = null)
    {
        $this->solicitud = $solicitud;
        $this->mensajeCustom = $mensajeCustom;
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
        $estado = str_replace('_', ' ', strtoupper($this->solicitud->estado));

        return (new MailMessage)
            ->subject("Actualización de Estado - Folio {$this->solicitud->folio}")
            ->greeting("Hola, {$notifiable->name}")
            ->line("Te informamos que el estado de tu solicitud con folio **{$this->solicitud->folio}** ha cambiado a: **{$estado}**.")
            ->when($this->mensajeCustom, function ($mail) {
                return $mail->line('Observaciones: '.$this->mensajeCustom);
            })
            ->action('Ver Solicitud', url(env('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')."/solicitante/solicitudes/{$this->solicitud->id}"))
            ->line('Gracias por usar el sistema COMECYT.');
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
            'nuevo_estado' => $this->solicitud->estado,
            'mensaje' => $this->mensajeCustom ?? "La solicitud ha cambiado a {$this->solicitud->estado}",
        ];
    }
}
