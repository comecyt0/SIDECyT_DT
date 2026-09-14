<?php

namespace App\Notifications;

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
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $institutionName = env('NEXT_PUBLIC_INSTITUTION_NAME', 'COMECYT');
        $urgencia = $this->diasRestantes <= 1 ? 'URGENTE' : ($this->diasRestantes <= 3 ? 'IMPORTANTE' : 'AVISO');
        $diasText = $this->diasRestantes === 1 ? 'mañana' : "en {$this->diasRestantes} días";

        return (new MailMessage)
            ->subject("[{$urgencia}] La convocatoria '{$this->convocatoria->nombre}' cierra {$diasText}")
            ->greeting("Hola {$notifiable->name},")
            ->line("Te informamos que la convocatoria **{$this->convocatoria->nombre}** cierra {$diasText} ({$this->convocatoria->fecha_cierre}).")
            ->line('Si tienes solicitudes en borrador o pendientes de subsanación, complétalas antes de la fecha de cierre.')
            ->action('Ver convocatoria', env('NEXT_PUBLIC_APP_URL', 'http://localhost:3000') . '/solicitante/solicitudes')
            ->line("— Equipo {$institutionName}")
            ->salutation('Atentamente');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'convocatoria_id' => $this->convocatoria->id,
            'tipo' => 'convocatoria_cierre_proximo',
            'dias_restantes' => $this->diasRestantes,
            'mensaje' => "La convocatoria '{$this->convocatoria->nombre}' cierra en {$this->diasRestantes} día(s).",
            'url' => '/solicitante/solicitudes',
        ];
    }
}
