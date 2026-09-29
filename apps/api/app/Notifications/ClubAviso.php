<?php

namespace App\Notifications;

use App\Models\Club;
use App\Notifications\Channels\CampanaChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * E52 — Avisos del flujo de clubes (Apoyo en especie). Campana siempre; correo en los eventos que el usuario pidió
 * para el líder (observaciones y plazo, aceptación, QR habilitado, fecha y lugar del kit — F2/F3/F4).
 * `evento` decide el texto; `extra` lleva datos del evento (plazo, fecha, lugar…), siempre texto plano.
 */
class ClubAviso extends Notification implements ShouldQueue
{
    use Queueable;

    /** Si el registro se borró antes de enviarse (p. ej. datos de prueba), el aviso se descarta sin fallar. */
    public bool $deleteWhenMissingModels = true;

    /** Eventos que además van por correo al líder. */
    public const CON_CORREO = ['observado', 'prorroga', 'aceptado', 'qr_habilitado', 'kit_asignado'];

    public function __construct(public readonly Club $club, public readonly string $evento, public readonly array $extra = []) {}

    public function via(object $notifiable): array
    {
        return in_array($this->evento, self::CON_CORREO, true) ? ['mail', CampanaChannel::class] : [CampanaChannel::class];
    }

    private function textos(): array
    {
        $c = $this->club;
        $x = $this->extra;

        return match ($this->evento) {
            'enviado' => ['Nuevo club enviado a revisión', "El club «{$c->nombre}» ({$c->folio}) se envió a revisión."],
            'por_revisar' => ['Club por revisar', "El club «{$c->nombre}» ({$c->folio}) espera revisión".(isset($x['etapa']) ? " en «{$x['etapa']}»" : '').'.'],
            'observado' => ['Tu club tiene observaciones', "Revisa las observaciones de «{$c->nombre}» y corrígelas antes del ".($x['vence'] ?? 'plazo indicado').'.'],
            'prorroga' => ['Nuevo plazo para corregir tu club', "Se amplió el plazo para corregir «{$c->nombre}»: ahora tienes hasta el ".($x['vence'] ?? 'plazo indicado').'.'],
            'etapa_aprobada' => ['Tu club avanzó en la revisión', "«{$c->nombre}» aprobó una etapa de revisión. Te avisaremos del siguiente paso."],
            'aprobado_revision' => ['Club listo para visto bueno y comité', "El club «{$c->nombre}» ({$c->folio}) aprobó todas las revisiones."],
            'subsanado' => ['Club corregido', "El club «{$c->nombre}» ({$c->folio}) envió sus correcciones."],
            'aceptado' => ['¡Tu club fue aceptado!', "El registro de «{$c->nombre}» fue aceptado. Entra a tu panel para ver los siguientes pasos."],
            'rechazado' => ['Tu club no fue aceptado', "El registro de «{$c->nombre}» no fue aceptado.".(isset($x['motivo']) ? ' Motivo: '.$x['motivo'] : '')],
            'qr_habilitado' => ['Tu QR del club ya está disponible', "Descarga la credencial con el QR de «{$c->nombre}» desde tu panel."],
            'kit_asignado' => ['Fecha y lugar de entrega de tu kit', "Tu kit se entrega el ".($x['fecha'] ?? '—').' en '.($x['lugar'] ?? '—').'.'],
            default => ['Aviso de tu club', "Hay novedades en «{$c->nombre}»."],
        };
    }

    public function toCampana(object $notifiable): array
    {
        [$asunto, $mensaje] = $this->textos();

        return ['tipo' => 'club_'.$this->evento, 'asunto' => $asunto, 'mensaje' => $mensaje];
    }

    public function toMail(object $notifiable): MailMessage
    {
        [$asunto, $mensaje] = $this->textos();
        $url = rtrim((string) config('app.frontend_url'), '/');

        $m = (new MailMessage)
            ->subject($asunto.' — SIDECyT')
            ->greeting('Hola, '.($notifiable->name ?? ''))
            ->line($mensaje);
        // Observaciones y prórroga: el comentario general del revisor (texto plano; el correo escapa el contenido).
        if (in_array($this->evento, ['observado', 'prorroga'], true) && ! empty($this->extra['comentario'])) {
            $m->line($this->evento === 'observado' ? 'Qué debes corregir:' : 'Motivo:')->line(mb_substr((string) $this->extra['comentario'], 0, 1500));
        }

        return $m->action('Entrar a mi panel', $url.'/club/clubes/'.$this->club->id)
            ->salutation('COMECYT — SIDECyT');
    }
}
