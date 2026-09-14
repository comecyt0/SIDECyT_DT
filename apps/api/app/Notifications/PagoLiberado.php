<?php

namespace App\Notifications;

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
        return ['mail', 'database'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("Pago Liberado - Folio {$this->solicitud->folio}")
            ->markdown('emails.pago-liberado', [
                'user_name' => $notifiable->name,
                'folio' => $this->solicitud->folio,
                'titulo_proyecto' => $this->solicitud->titulo_proyecto,
                'monto_ministrado' => $this->ministracion->monto_aprobado,
                'numero_tranche' => $this->ministracion->numero_ministracion,
                'total_tranches' => $this->ministracion->convenio->ministraciones()->count(),
                'fecha_liberacion' => $this->ministracion->fecha_autorizacion ?? now(),
                'banco_nombre' => 'Sistema Bancario COMECYT',
                'numero_cuenta' => $notifiable->empresa?->numero_cuenta ?? 'No disponible',
                'titular_cuenta' => $notifiable->empresa?->nombre ?? 'Tu Institución',
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
            'ministracion_id' => $this->ministracion->id,
            'folio' => $this->solicitud->folio,
            'tipo' => 'pago_liberado',
            'monto' => $this->ministracion->monto_aprobado,
            'mensaje' => "Se ha liberado un pago de \${$this->ministracion->monto_aprobado}.",
            'url' => '/solicitante/ministeraciones',
        ];
    }
}
