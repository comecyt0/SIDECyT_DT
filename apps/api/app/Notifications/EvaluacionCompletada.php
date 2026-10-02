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
        return (new MailMessage)
            ->subject($this->aprobado ? "Evaluación Aprobada - Folio {$this->solicitud->folio}" : "Evaluación No Aprobada - Folio {$this->solicitud->folio}")
            ->markdown('emails.evaluacion-completada', [
                'user_name' => $notifiable->name,
                'folio' => $this->solicitud->folio,
                'titulo_proyecto' => $this->solicitud->titulo_proyecto,
                'puntaje_total' => $this->puntaje,
                'aprobado' => $this->aprobado,
                'fecha_evaluacion' => now(),
                'evaluador_nombre' => $this->evaluador,
                'comentarios_evaluador' => $this->comentarios,
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
