<?php

namespace App\Notifications;

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
        return ['mail', 'database'];
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
            'tipo' => 'evaluacion_completada',
            'puntaje' => $this->puntaje,
            'aprobado' => $this->aprobado,
            'mensaje' => $this->aprobado ? 'Tu evaluación ha sido aprobada.' : 'Tu evaluación no fue aprobada.',
            'url' => "/solicitante/solicitudes/{$this->solicitud->id}",
        ];
    }
}
