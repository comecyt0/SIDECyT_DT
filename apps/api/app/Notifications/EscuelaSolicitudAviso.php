<?php

namespace App\Notifications;

use App\Models\EscuelaSolicitud;
use App\Notifications\Channels\CampanaChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * E55 — Avisos de la solicitud de registro de escuela (campana + correo, decisión del usuario):
 *  - `nueva`: al personal que la revisa (admin y admin de la convocatoria);
 *  - `aceptada` / `rechazada` (con motivo): al líder que la pidió.
 * Texto plano; el correo escapa el contenido.
 */
class EscuelaSolicitudAviso extends Notification implements ShouldQueue
{
    use Queueable;

    public bool $deleteWhenMissingModels = true;

    public function __construct(public readonly EscuelaSolicitud $solicitud, public readonly string $evento) {}

    public function via(object $notifiable): array
    {
        return ['mail', CampanaChannel::class];
    }

    private function textos(): array
    {
        $s = $this->solicitud;
        $escuela = "«{$s->nombre}» (CCT {$s->cct})";

        return match ($this->evento) {
            'nueva' => ['Solicitud de registro de escuela', "Un líder de club pidió dar de alta la escuela {$escuela}, de {$s->municipio}. Revísala en Escuelas → Solicitudes de registro."],
            'aceptada' => ['Tu escuela ya está en el catálogo', "La escuela {$escuela} fue dada de alta y quedó asignada a tu club. Ya puedes completar y enviar tu registro."],
            'rechazada' => ['Tu solicitud de escuela no fue aceptada', "La solicitud de la escuela {$escuela} no fue aceptada. Motivo: ".mb_substr((string) $s->motivo, 0, 1000).' Puedes corregirla y enviarla de nuevo, o elegir una escuela del catálogo.'],
            default => ['Aviso de escuela', "Hay novedades en la solicitud de la escuela {$escuela}."],
        };
    }

    public function toCampana(object $notifiable): array
    {
        [$asunto, $mensaje] = $this->textos();
        // El personal recibe `escuela_solicitud` (su campana lleva a Escuelas); el líder `club_escuela_*` (lleva a su club).
        $tipo = $this->evento === 'nueva' ? 'escuela_solicitud' : 'club_escuela_'.$this->evento;

        return ['tipo' => $tipo, 'asunto' => $asunto, 'mensaje' => $mensaje];
    }

    public function toMail(object $notifiable): MailMessage
    {
        [$asunto, $mensaje] = $this->textos();
        $url = rtrim((string) config('app.frontend_url'), '/').($this->evento === 'nueva' ? '/admin/escuelas?tab=solicitudes' : '/club/dashboard');

        return (new MailMessage)
            ->subject($asunto.' — SIDECyT')
            ->greeting('Hola, '.($notifiable->name ?? ''))
            ->line($mensaje)
            ->action($this->evento === 'nueva' ? 'Revisar la solicitud' : 'Entrar a mi panel', $url)
            ->salutation('COMECYT — SIDECyT');
    }
}
