<?php

namespace App\Notifications;

use App\Notifications\Channels\CampanaChannel;
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
        return ['mail', CampanaChannel::class];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        // 02/10/2026: plantilla única de SIGAE.
        $s = $this->solicitud;
        $obs = is_array($this->observaciones) ? implode("\n", array_map(fn ($o) => is_array($o) ? (string) ($o['comentario'] ?? $o['texto'] ?? json_encode($o)) : (string) $o, $this->observaciones)) : (string) $this->observaciones;

        return \App\Support\CorreoSigae::nuevo("Tu solicitud {$s->folio} tiene observaciones")
            ->titulo('Tu solicitud tiene observaciones', $s->titulo_proyecto)->estado('Con observaciones', 'oro')
            ->saludo($notifiable->name ?? '')
            ->linea('Revisamos tu solicitud y necesita correcciones antes de continuar.')
            ->cita('Qué debes corregir', $obs)
            ->detalle(['Folio' => $s->folio, 'Proyecto' => $s->titulo_proyecto])
            ->progreso(['Enviada', 'Revisión', 'Evaluación', 'Convenio', 'Pagos'], 1)
            ->pasos(['Abre tu solicitud y lee las observaciones.', 'Corrige los datos o vuelve a subir los documentos.', 'Envíala de nuevo a revisión.'])
            ->boton('Corregir mi solicitud', \App\Support\EnlaceAviso::solicitud($notifiable, (int) $s->id, $s->folio) ?? '/login')->mail();
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
            'asunto' => 'Tu solicitud tiene observaciones',
            'mensaje' => "Tu solicitud {$this->solicitud->folio} regresó con observaciones. Ábrela para ver qué corregir y vuelve a enviarla.",
            'enlace' => \App\Support\EnlaceAviso::solicitud($notifiable, (int) $this->solicitud->id, $this->solicitud->folio),
            'url' => "/solicitante/solicitudes/{$this->solicitud->id}",
        ];
    }
}
