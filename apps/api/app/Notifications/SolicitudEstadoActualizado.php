<?php

namespace App\Notifications;

use App\Notifications\Channels\CampanaChannel;
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
        return ['mail', CampanaChannel::class];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        // 02/10/2026: plantilla única de SIGAE, con estado legible, color y línea de avance.
        $s = $this->solicitud;
        $e = (string) $s->estado;
        $estado = ucfirst(str_replace('_', ' ', $e));
        $tono = match (true) {
            in_array($e, ['aprobada', 'convenio', 'ministracion', 'concluida', 'finalizada'], true) => 'verde',
            in_array($e, ['rechazada', 'cancelada', 'no_aprobada'], true) => 'rojo',
            in_array($e, ['observada', 'en_subsanacion'], true) => 'oro',
            default => 'vino',
        };
        $paso = match (true) {
            in_array($e, ['enviada', 'en_revision', 'observada', 'en_subsanacion'], true) => 1,
            in_array($e, ['en_evaluacion', 'evaluada'], true) => 2,
            in_array($e, ['aprobada', 'convenio'], true) => 3,
            in_array($e, ['ministracion', 'concluida', 'finalizada'], true) => 4,
            default => 0,
        };

        return \App\Support\CorreoSigae::nuevo("Tu solicitud {$s->folio} cambió de estado")
            ->titulo('Tu solicitud cambió de estado', $s->titulo_proyecto)->estado($estado, $tono)
            ->saludo($notifiable->name ?? '')
            ->linea("Tu solicitud {$s->folio} pasó a «{$estado}».")
            ->cita('Comentario', $this->mensajeCustom)
            ->detalle(['Folio' => $s->folio, 'Proyecto' => $s->titulo_proyecto, 'Estado' => $estado])
            ->progreso(['Enviada', 'Revisión', 'Evaluación', 'Convenio', 'Pagos'], $paso)
            ->boton('Ver mi solicitud', \App\Support\EnlaceAviso::solicitud($notifiable, (int) $s->id, $s->folio) ?? '/login')->mail();
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        // 02/10/2026: dice de qué solicitud, a qué estado pasó (legible) y lleva a ella.
        $estado = str_replace('_', ' ', (string) $this->solicitud->estado);
        $base = "La solicitud {$this->solicitud->folio} pasó a «{$estado}».";

        return [
            'solicitud_id' => $this->solicitud->id,
            'folio' => $this->solicitud->folio,
            'nuevo_estado' => $this->solicitud->estado,
            'tipo' => 'solicitud_estado',
            'asunto' => "Tu solicitud {$this->solicitud->folio} cambió de estado",
            'mensaje' => $this->mensajeCustom ? $base.' '.$this->mensajeCustom : $base.' Ábrela para ver el detalle.',
            'enlace' => \App\Support\EnlaceAviso::solicitud($notifiable, (int) $this->solicitud->id, $this->solicitud->folio),
        ];
    }
}
