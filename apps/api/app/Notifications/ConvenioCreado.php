<?php

namespace App\Notifications;

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
        return ['mail', 'database'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("Convenio Generado - Folio {$this->solicitud->folio}")
            ->markdown('emails.convenio-creado', [
                'user_name' => $notifiable->name,
                'folio' => $this->solicitud->folio,
                'convenio_numero' => $this->convenio->numero_convenio,
                'titulo_proyecto' => $this->solicitud->titulo_proyecto,
                'monto_aprobado' => $this->convenio->monto_aprobado,
                'num_tranches' => $this->convenio->ministraciones()->count(),
                'fecha_generacion' => $this->convenio->created_at,
                'fecha_inicio' => $this->convenio->fecha_inicio,
                'fecha_termino' => $this->convenio->fecha_termino,
                'institucion_nombre' => $this->solicitud->empresa->nombre ?? 'Tu Institución',
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
            'convenio_id' => $this->convenio->id,
            'folio' => $this->solicitud->folio,
            'tipo' => 'convenio_creado',
            'monto' => $this->convenio->monto_aprobado,
            'mensaje' => 'Tu convenio ha sido generado y está listo para firmar.',
            'url' => "/solicitante/solicitudes/{$this->solicitud->id}",
        ];
    }
}
