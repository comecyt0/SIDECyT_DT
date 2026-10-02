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
    public const CON_CORREO = ['observado', 'prorroga', 'aceptado', 'qr_habilitado', 'kit_asignado', 'acceso_otorgado', 'colider_activado'];

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
            // 02/10/2026: cada texto dice qué cambió, en qué club y qué hacer; el aviso lleva a la ficha del club.
            'enviado' => ['Nuevo club enviado a revisión', "El club «{$c->nombre}» ({$c->folio}) se envió a revisión. Ábrelo para revisarlo."],
            'por_revisar' => ['Club por revisar', "El club «{$c->nombre}» ({$c->folio}) espera tu revisión".(isset($x['etapa']) ? " en la etapa «{$x['etapa']}»" : '').'. Ábrelo para aprobar, pedir correcciones o rechazar.'],
            'observado' => ['Tu club tiene observaciones', "Revisa las observaciones de «{$c->nombre}» y corrígelas antes del ".($x['vence'] ?? 'plazo indicado').'. Ábrelo para ver qué corregir.'],
            'prorroga' => ['Nuevo plazo para corregir tu club', "Se amplió el plazo para corregir «{$c->nombre}»: ahora tienes hasta el ".($x['vence'] ?? 'plazo indicado').'.'],
            'etapa_aprobada' => ['Tu club avanzó en la revisión', "«{$c->nombre}» aprobó ".(isset($x['etapa']) ? "la etapa «{$x['etapa']}»" : 'una etapa de revisión').'. Te avisaremos del siguiente paso.'],
            'aprobado_revision' => ['Club listo para visto bueno y comité', "El club «{$c->nombre}» ({$c->folio}) aprobó todas las revisiones: falta el visto bueno y la decisión del comité."],
            'subsanado' => ['Club corregido', "El club «{$c->nombre}» ({$c->folio}) envió sus correcciones. Ábrelo para revisarlas."],
            'aceptado' => ['¡Tu club fue aceptado!', "El registro de «{$c->nombre}» fue aceptado. Entra a tu panel para ver los siguientes pasos."],
            'rechazado' => ['Tu club no fue aceptado', "El registro de «{$c->nombre}» no fue aceptado.".(isset($x['motivo']) ? ' Motivo: '.$x['motivo'] : '')],
            'qr_habilitado' => ['Tu QR del club ya está disponible', "Descarga la credencial con el QR de «{$c->nombre}» desde tu panel y llévala impresa o en tu celular a los eventos."],
            'qr_revocado' => ['El QR de tu club se desactivó', "El QR de «{$c->nombre}» ya no es válido. Si fue un error, comunícate con el COMECYT."],
            'kit_asignado' => ['Fecha y lugar de entrega de tu kit', "El kit de «{$c->nombre}» se entrega el ".($x['fecha'] ?? '—').' en '.($x['lugar'] ?? '—').'.'],
            'kit_entregado' => ['Kit entregado', "Registramos la entrega del kit de «{$c->nombre}». ¡Mucho éxito!"],
            'firmado_subido' => ['Documento firmado por revisar', "El club «{$c->nombre}» ({$c->folio}) subió ".self::doc($x['tipo'] ?? '').' firmado'.(! empty($x['evento']) ? " del evento «{$x['evento']}»" : '').'. Ábrelo para aprobarlo o rechazarlo.'],
            'firmado_aprobado' => ['Documento aprobado', 'Se aprobó '.self::doc($x['tipo'] ?? '')." de «{$c->nombre}»."],
            'firmado_rechazado' => ['Documento por corregir', 'Se rechazó '.self::doc($x['tipo'] ?? '')." de «{$c->nombre}»".(! empty($x['motivo']) ? ': '.$x['motivo'] : '').'. Sube una versión nueva.'],
            // E61 — acompañantes del club (líder B y director). Nunca llevan contraseñas.
            'acceso_otorgado' => ['Te dieron acceso a un club', ($x['quien'] ?? 'El líder')." te registró como ".($x['rol'] ?? 'acompañante')." del club «{$c->nombre}» ({$c->folio}). Entra a SIDECyT con tu correo: si ya tenías cuenta, con tu contraseña de siempre; si es nueva, con la que te dio el líder (te pediremos cambiarla)."],
            'acceso_retirado' => ['Ya no tienes acceso a un club', "El líder retiró tu acceso como ".($x['rol'] ?? 'acompañante')." del club «{$c->nombre}»."],
            'colider_activado' => ['Ahora compartes el rol de líder', "El líder de «{$c->nombre}» te dio el rol de líder del club mientras no pueda asistir: ya puedes editar, enviar y atender la logística."],
            'colider_retirado' => ['Ya no compartes el rol de líder', "El líder de «{$c->nombre}» retomó el rol de líder. Sigues como acompañante del club."],
            default => ['Aviso de tu club', "Hay novedades en «{$c->nombre}»."],
        };
    }

    private static function doc(string $tipo): string
    {
        return $tipo === 'resguardo' ? 'la carta de resguardo' : 'el formato de transporte y box lunch';
    }

    public function toCampana(object $notifiable): array
    {
        [$asunto, $mensaje] = $this->textos();

        // 02/10/2026: lleva a la ficha del club en el panel de quien recibe (líder, revisor o personal).
        return ['tipo' => 'club_'.$this->evento, 'asunto' => $asunto, 'mensaje' => $mensaje,
            'enlace' => \App\Support\EnlaceAviso::club($notifiable, (int) $this->club->id)];
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
