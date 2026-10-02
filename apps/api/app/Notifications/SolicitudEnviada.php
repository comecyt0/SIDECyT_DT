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
        // 02/10/2026: plantilla única de SIGAE.
        $s = $this->solicitud;

        return \App\Support\CorreoSigae::nuevo("Recibimos tu solicitud {$s->folio}")
            ->titulo('¡Recibimos tu solicitud!', $s->titulo_proyecto)->estado('En revisión', 'verde')
            ->saludo($notifiable->name ?? '')
            ->linea('Tu solicitud se envió a revisión. Te avisaremos por aquí y en tu panel de cada cambio.')
            ->detalle(['Folio' => $s->folio, 'Proyecto' => $s->titulo_proyecto,
                'Monto solicitado' => $s->monto_solicitado ? '$'.number_format((float) $s->monto_solicitado, 2) : null, 'Enviada' => now('America/Mexico_City')->format('d/m/Y H:i')])
            ->progreso(['Enviada', 'Revisión', 'Evaluación', 'Convenio', 'Pagos'], 1)
            ->pasos(['El equipo de revisión verifica tus documentos.', 'Si algo falta, te pediremos correcciones con un plazo.', 'Después pasa a evaluación técnica.'])
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
