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

    /** Si el registro se borró antes de enviarse (p. ej. datos de prueba), el aviso se descarta sin fallar. */
    public bool $deleteWhenMissingModels = true;

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
        // 02/10/2026: el personal va a «Solicitudes de acceso»; la persona, a «Mi cuenta» de su panel.
        $panel = \App\Support\EnlaceAviso::panel($notifiable);
        $enlace = $this->evento === 'nueva' ? \App\Support\EnlaceAviso::ruta($notifiable, '/admin/solicitudes-acceso')
            : ($panel ? \App\Support\EnlaceAviso::valido($panel.'/cuenta') : null);

        return ['enlace' => $enlace] + match ($this->evento) {
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
        // 02/10/2026: plantilla única de SIGAE.
        $rol = $this->rol();

        return match ($this->evento) {
            'nueva' => \App\Support\CorreoSigae::nuevo('Nueva solicitud de rol')->titulo('Nueva solicitud de rol', $rol)->estado('Por revisar', 'oro')
                ->saludo($notifiable->name ?? '')->linea(($this->solicitud->user?->name ?? 'Una persona').' pidió el rol «'.$rol.'». Revísala y apruébala o recházala.')
                ->boton('Revisar la solicitud', '/admin/solicitudes-acceso')->mail(),
            'aprobada' => \App\Support\CorreoSigae::nuevo('Tu rol «'.$rol.'» fue aprobado')->titulo('¡Tu nuevo rol fue aprobado!', $rol)->estado('Aprobado', 'verde')
                ->saludo($notifiable->name ?? '')->linea('Ya puedes usar el rol «'.$rol.'».')
                ->pasos(['Entra a SIGAE.', 'Ve a «Mi cuenta → Mis roles».', 'Cambia al rol «'.$rol.'».'])
                ->boton('Entrar a SIGAE', '/login')->mail(),
            default => \App\Support\CorreoSigae::nuevo('Tu solicitud de rol no fue aprobada')->titulo('Tu solicitud de rol no fue aprobada', $rol)->estado('No aprobada', 'rojo')
                ->saludo($notifiable->name ?? '')->linea('Revisamos tu solicitud del rol «'.$rol.'» y por ahora no fue aprobada.')
                ->cita('Motivo', $this->solicitud->motivo_rechazo)->boton('Entrar a SIGAE', '/login')->mail(),
        };
    }
}
