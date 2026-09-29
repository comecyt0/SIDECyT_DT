<?php

namespace App\Notifications;

use App\Models\SolicitudRol;
use App\Notifications\Channels\CampanaChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * E52 — Avisos de "pedir otro rol": al admin cuando alguien lo pide (`nueva`) y a la persona cuando se resuelve
 * (`aprobada` / `rechazada`). Campana + correo.
 */
class RolSolicitudAviso extends Notification implements ShouldQueue
{
    use Queueable;

    public const ETIQUETAS = ['solicitante' => 'Participante (SIGAE)', 'lider_club' => 'Líder de club', 'evaluador' => 'Evaluador'];

    public function __construct(public readonly SolicitudRol $solicitud, public readonly string $evento) {}

    public function via(object $notifiable): array
    {
        return ['mail', CampanaChannel::class];
    }

    private function rol(): string
    {
        return self::ETIQUETAS[$this->solicitud->rol_solicitado] ?? $this->solicitud->rol_solicitado;
    }

    public function toCampana(object $notifiable): array
    {
        return match ($this->evento) {
            'nueva' => [
                'tipo' => 'nueva_solicitud_rol',
                'asunto' => 'Solicitud de rol: '.$this->rol(),
                'mensaje' => ($this->solicitud->user?->name ?? 'Una persona').' pidió el rol «'.$this->rol().'». Revísala en «Solicitudes de Acceso».',
            ],
            'aprobada' => [
                'tipo' => 'rol_aprobado',
                'asunto' => 'Tu rol «'.$this->rol().'» fue aprobado',
                'mensaje' => 'Ya puedes cambiar a este rol desde «Mi cuenta → Mis roles».',
            ],
            default => [
                'tipo' => 'rol_rechazado',
                'asunto' => 'Tu solicitud del rol «'.$this->rol().'» no fue aprobada',
                'mensaje' => (string) ($this->solicitud->motivo_rechazo ?? ''),
            ],
        };
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = rtrim((string) config('app.frontend_url'), '/');
        $m = (new MailMessage)->salutation('COMECYT — SIDECyT');

        return match ($this->evento) {
            'nueva' => $m->subject('Nueva solicitud de rol — SIDECyT')
                ->line(($this->solicitud->user?->name ?? 'Una persona').' pidió el rol «'.$this->rol().'».')
                ->action('Revisar solicitudes', $url.'/admin/solicitudes-acceso'),
            'aprobada' => $m->subject('Tu rol «'.$this->rol().'» fue aprobado — SIDECyT')
                ->line('Tu solicitud del rol «'.$this->rol().'» fue aprobada.')
                ->line('Entra a tu panel y cambia de rol desde «Mi cuenta → Mis roles».')
                ->action('Entrar a SIDECyT', $url.'/login'),
            default => $m->subject('Actualización de tu solicitud de rol — SIDECyT')
                ->line('Tu solicitud del rol «'.$this->rol().'» no fue aprobada.')
                ->line('Motivo: '.($this->solicitud->motivo_rechazo ?? '—')),
        };
    }
}
