<?php

namespace App\Notifications;

use App\Notifications\Channels\CampanaChannel;
use App\Models\Solicitud;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EvaluacionCompletada extends Notification implements ShouldQueue
{
    use Queueable;

    protected $solicitud;

    protected $puntaje;

    protected $aprobado;

    protected $comentarios;

    protected $evaluador;

    /**
     * Create a new notification instance.
     */
    public function __construct(Solicitud $solicitud, $puntaje, $aprobado, $comentarios = '', $evaluador_nombre = 'COMECYT')
    {
        $this->solicitud = $solicitud;
        $this->puntaje = $puntaje;
        $this->aprobado = $aprobado;
        $this->comentarios = $comentarios;
        $this->evaluador = $evaluador_nombre;
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

        return \App\Support\CorreoSigae::nuevo($this->aprobado ? "Tu solicitud {$s->folio} aprobó la evaluación" : "Resultado de la evaluación de {$s->folio}")
            ->titulo($this->aprobado ? '¡Tu solicitud aprobó la evaluación técnica!' : 'Tu solicitud no aprobó la evaluación técnica', $s->titulo_proyecto)
            ->estado($this->aprobado ? 'Aprobada' : 'No aprobada', $this->aprobado ? 'verde' : 'rojo')
            ->saludo($notifiable->name ?? '')
            ->linea($this->aprobado ? 'La evaluación técnica de tu proyecto fue favorable.' : 'La evaluación técnica de tu proyecto no alcanzó el puntaje mínimo.')
            ->detalle(['Folio' => $s->folio, 'Proyecto' => $s->titulo_proyecto, 'Puntaje' => $this->puntaje])
            ->cita('Comentarios de la evaluación', is_string($this->comentarios) ? $this->comentarios : null)
            ->progreso(['Enviada', 'Revisión', 'Evaluación', 'Convenio', 'Pagos'], $this->aprobado ? 3 : 2)
            ->pasos($this->aprobado ? ['El COMECYT preparará tu convenio.', 'Te avisaremos cuando esté listo para firmar.'] : [])
            ->boton('Ver mi solicitud', \App\Support\EnlaceAviso::solicitud($notifiable, (int) $s->id, $s->folio) ?? '/login')->mail();
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
            'tipo' => 'evaluacion_completada',
            'puntaje' => $this->puntaje,
            'aprobado' => $this->aprobado,
            'asunto' => $this->aprobado ? 'Tu solicitud aprobó la evaluación técnica' : 'Tu solicitud no aprobó la evaluación técnica',
            'mensaje' => "La evaluación técnica de tu solicitud {$this->solicitud->folio} ".($this->aprobado ? 'fue aprobada' : 'no fue aprobada').' (puntaje: '.$this->puntaje.'). Ábrela para ver el detalle.',
            'enlace' => \App\Support\EnlaceAviso::solicitud($notifiable, (int) $this->solicitud->id, $this->solicitud->folio),
            'url' => "/solicitante/solicitudes/{$this->solicitud->id}",
        ];
    }
}
