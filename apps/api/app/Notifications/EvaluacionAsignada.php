<?php

namespace App\Notifications;

use App\Models\AsignacionEvaluador;
use App\Notifications\Channels\CampanaChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * E72 paso 5 — Aviso a la persona evaluadora: nueva asignación ('asignada') o recordatorio de fecha límite
 * ('previo' = 2 días antes, 'hoy' = el día que vence). Lleva al panel compartido /evaluador.
 * Sustituye el NotificacionLog suelto que solo iba a la campana (sin correo).
 */
class EvaluacionAsignada extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly AsignacionEvaluador $asignacion, private readonly string $motivo = 'asignada') {}

    public function via(object $notifiable): array
    {
        return ['mail', CampanaChannel::class];
    }

    private function fecha(): string
    {
        return $this->asignacion->fecha_limite?->locale('es')->isoFormat('D [de] MMMM [de] YYYY') ?? 'sin fecha';
    }

    private function asunto(): string
    {
        $folio = $this->asignacion->solicitud?->folio;

        return match ($this->motivo) {
            'previo' => "Tu evaluación de {$folio} vence en 2 días",
            'hoy' => "Hoy vence tu evaluación de {$folio}",
            default => "Te asignaron la solicitud {$folio} para evaluar",
        };
    }

    public function toMail(object $notifiable): MailMessage
    {
        $s = $this->asignacion->solicitud;

        return \App\Support\CorreoSigae::nuevo($this->asunto())
            ->titulo($this->motivo === 'asignada' ? 'Tienes una nueva evaluación' : 'Recordatorio de fecha límite', $s?->titulo_proyecto)
            ->estado($this->motivo === 'hoy' ? 'Vence hoy' : 'Por evaluar', $this->motivo === 'hoy' ? 'rojo' : 'oro')
            ->saludo($notifiable->name ?? '')
            ->linea($this->motivo === 'hoy' ? 'Hoy es el último día para enviar tu dictamen; mañana ya no se podrá.' : 'Revisa el expediente y envía tu dictamen antes de la fecha límite.')
            ->detalle(['Folio' => $s?->folio, 'Convocatoria' => $s?->convocatoria?->nombre, 'Fecha límite' => $this->fecha()])
            ->pasos(['Entra al panel de evaluación.', 'Revisa respuestas y documentos.', 'Califica la rúbrica y acepta la carta de imparcialidad.'])
            ->boton('Ir al panel de evaluación', '/evaluador?sistema=sigae')->mail();
    }

    public function toArray(object $notifiable): array
    {
        $s = $this->asignacion->solicitud;

        return [
            'solicitud_id' => $s?->id,
            'folio' => $s?->folio,
            'tipo' => $this->motivo === 'asignada' ? 'nueva_asignacion' : 'recordatorio_evaluacion',
            'asunto' => $this->asunto(),
            'mensaje' => $this->asunto().". Fecha límite: {$this->fecha()}. Ábrela para revisarla y calificarla.",
            'enlace' => '/evaluador?sistema=sigae',
        ];
    }
}
