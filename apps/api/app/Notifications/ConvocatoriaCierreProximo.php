<?php

namespace App\Notifications;

use App\Notifications\Channels\CampanaChannel;
use App\Models\Convocatoria;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Notifica que una convocatoria está por cerrar.
 *
 * Se envía a:
 *   - todos los admins (informativo)
 *   - solicitantes con borradores en esa convocatoria (acción requerida)
 *
 * En T-7, T-3 y T-1 días.
 */
class ConvocatoriaCierreProximo extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        protected Convocatoria $convocatoria,
        protected int $diasRestantes
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail', CampanaChannel::class];
    }

    public function toMail(object $notifiable): MailMessage
    {
        // 02/10/2026: plantilla única de SIGAE.
        $diasText = $this->diasRestantes === 1 ? 'mañana' : "en {$this->diasRestantes} días";
        $cierre = $this->convocatoria->fecha_cierre_efectiva ? \Carbon\Carbon::parse($this->convocatoria->fecha_cierre_efectiva)->format('d/m/Y') : null;

        return \App\Support\CorreoSigae::nuevo("La convocatoria «{$this->convocatoria->nombre}» cierra {$diasText}")
            ->titulo("La convocatoria cierra {$diasText}", $this->convocatoria->nombre)
            ->estado($this->diasRestantes <= 1 ? 'Último día' : ($this->diasRestantes <= 3 ? 'Quedan pocos días' : 'Aviso'), $this->diasRestantes <= 3 ? 'rojo' : 'oro')
            ->saludo($notifiable->name ?? '')
            ->linea('Si tienes una solicitud en borrador o con correcciones pendientes, complétala y envíala antes del cierre.')
            ->detalle(['Convocatoria' => $this->convocatoria->nombre, 'Fecha de cierre' => $cierre])
            ->pasos(['Revisa que tus datos y documentos estén completos.', 'Envía tu solicitud antes de la fecha de cierre.'])
            ->boton('Ver mis solicitudes', \App\Support\EnlaceAviso::ruta($notifiable, '/admin/convocatorias/'.$this->convocatoria->id) ?? '/solicitante/solicitudes')->mail();
    }

    public function toArray(object $notifiable): array
    {
        return [
            'convocatoria_id' => $this->convocatoria->id,
            'tipo' => 'convocatoria_cierre_proximo',
            'dias_restantes' => $this->diasRestantes,
            'asunto' => "La convocatoria «{$this->convocatoria->nombre}» está por cerrar",
            'mensaje' => "La convocatoria «{$this->convocatoria->nombre}» cierra en {$this->diasRestantes} día".($this->diasRestantes == 1 ? '' : 's').'. Revisa que tu solicitud esté completa y enviada.',
            'enlace' => \App\Support\EnlaceAviso::ruta($notifiable, '/admin/convocatorias/'.$this->convocatoria->id)
                ?? \App\Support\EnlaceAviso::ruta($notifiable, '/solicitante/solicitudes'),
            'url' => '/solicitante/solicitudes',
        ];
    }
}
