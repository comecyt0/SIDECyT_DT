<?php

namespace App\Notifications;

use App\Notifications\Channels\CampanaChannel;
use App\Models\Convenio;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ConvenioCreado extends Notification implements ShouldQueue
{
    use Queueable;

    protected $convenio;

    protected $solicitud;

    /**
     * Create a new notification instance.
     */
    public function __construct(Convenio $convenio)
    {
        $this->convenio = $convenio;
        $this->solicitud = $convenio->solicitud;
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
        $c = $this->convenio;
        $fecha = fn ($d) => $d ? \Carbon\Carbon::parse($d)->format('d/m/Y') : null;

        return \App\Support\CorreoSigae::nuevo("Tu convenio de {$s->folio} está listo")
            ->titulo('¡Tu convenio está listo para firmar!', $s->titulo_proyecto)->estado('Convenio generado', 'verde')
            ->saludo($notifiable->name ?? '')
            ->linea('Generamos el convenio de tu proyecto. Revísalo, descárgalo y fírmalo.')
            ->detalle(['Folio' => $s->folio, 'Número de convenio' => $c->numero_convenio, 'Monto aprobado' => '$'.number_format((float) $c->monto_aprobado, 2),
                'Entregas (ministraciones)' => $c->ministraciones()->count(), 'Vigencia' => trim(($fecha($c->fecha_inicio) ?? '').' — '.($fecha($c->fecha_termino) ?? ''), ' —')])
            ->progreso(['Enviada', 'Revisión', 'Evaluación', 'Convenio', 'Pagos'], 3)
            ->pasos(['Abre tu solicitud y descarga el convenio.', 'Fírmalo y entrégalo como te indique el COMECYT.', 'Después se liberan las ministraciones.'])
            ->boton('Ver mi convenio', \App\Support\EnlaceAviso::solicitud($notifiable, (int) $s->id, $s->folio) ?? '/login')->mail();
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
            'convenio_id' => $this->convenio->id,
            'folio' => $this->solicitud->folio,
            'tipo' => 'convenio_creado',
            'monto' => $this->convenio->monto_aprobado,
            'asunto' => 'Tu convenio está listo para firmar',
            'mensaje' => "Se generó el convenio de tu solicitud {$this->solicitud->folio} por $".number_format((float) $this->convenio->monto_aprobado, 2).'. Ábrela para revisarlo y firmarlo.',
            'enlace' => \App\Support\EnlaceAviso::solicitud($notifiable, (int) $this->solicitud->id, $this->solicitud->folio),
            'url' => "/solicitante/solicitudes/{$this->solicitud->id}",
        ];
    }
}
