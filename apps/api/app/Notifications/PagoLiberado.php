<?php

namespace App\Notifications;

use App\Notifications\Channels\CampanaChannel;
use App\Models\Ministracion;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PagoLiberado extends Notification implements ShouldQueue
{
    use Queueable;

    protected $ministracion;

    protected $solicitud;

    /**
     * Create a new notification instance.
     */
    public function __construct(Ministracion $ministracion)
    {
        $this->ministracion = $ministracion;
        $this->solicitud = $ministracion->solicitud;
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
        // 02/10/2026: plantilla única de SIGAE (sin datos bancarios en el correo).
        $s = $this->solicitud;
        $m = $this->ministracion;

        return \App\Support\CorreoSigae::nuevo("Se liberó un pago de {$s->folio}")
            ->titulo('¡Se liberó un pago de tu proyecto!', $s->titulo_proyecto)->estado('Pago liberado', 'verde')
            ->saludo($notifiable->name ?? '')
            ->linea('El COMECYT liberó una ministración de tu convenio.')
            ->detalle(['Folio' => $s->folio, 'Monto' => '$'.number_format((float) $m->monto_aprobado, 2),
                'Ministración' => $m->numero_ministracion.' de '.$m->convenio?->ministraciones()->count(),
                'Fecha' => \Carbon\Carbon::parse($m->fecha_autorizacion ?? now())->format('d/m/Y')])
            ->progreso(['Enviada', 'Revisión', 'Evaluación', 'Convenio', 'Pagos'], 4)
            ->pasos(['Revisa el detalle en «Ministraciones».', 'Sube los comprobantes del gasto cuando se te pidan.'])
            ->boton('Ver mis ministraciones', \App\Support\EnlaceAviso::ruta($notifiable, '/solicitante/ministraciones') ?? \App\Support\EnlaceAviso::solicitud($notifiable, (int) $s->id, $s->folio) ?? '/login')->mail();
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
            'ministracion_id' => $this->ministracion->id,
            'folio' => $this->solicitud->folio,
            'tipo' => 'pago_liberado',
            'monto' => $this->ministracion->monto_aprobado,
            'asunto' => 'Se liberó un pago de tu solicitud',
            'mensaje' => 'Se liberó un pago de $'.number_format((float) $this->ministracion->monto_aprobado, 2)." de tu solicitud {$this->solicitud->folio}. Revisa tus ministraciones para ver el detalle y subir tus comprobantes.",
            'enlace' => \App\Support\EnlaceAviso::ruta($notifiable, '/solicitante/ministraciones') ?? \App\Support\EnlaceAviso::solicitud($notifiable, (int) $this->solicitud->id, $this->solicitud->folio),
            'url' => '/solicitante/ministraciones',
        ];
    }
}
