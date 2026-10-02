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
            'nueva' => ['Solicitud de registro de escuela', "Un líder de club pidió dar de alta la escuela {$escuela}, de {$s->municipio}. Ábrela para aceptarla o rechazarla."],
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
        // 02/10/2026: el personal va a las solicitudes de escuela; el líder, al club que la esperaba.
        $clubId = $this->evento === 'nueva' ? null : \App\Models\Club::where('escuela_solicitud_id', $this->solicitud->id)->value('id');
        $enlace = $this->evento === 'nueva'
            ? \App\Support\EnlaceAviso::ruta($notifiable, '/admin/escuelas?tab=solicitudes')
            : ($clubId ? \App\Support\EnlaceAviso::club($notifiable, (int) $clubId) : \App\Support\EnlaceAviso::ruta($notifiable, '/club/dashboard'));

        return ['tipo' => $tipo, 'asunto' => $asunto, 'mensaje' => $mensaje, 'enlace' => $enlace];
    }

    public function toMail(object $notifiable): MailMessage
    {
        // 02/10/2026: plantilla única de SIGAE.
        [$asunto, $mensaje] = $this->textos();
        $s = $this->solicitud;
        $destino = $this->toCampana($notifiable)['enlace'] ?? ($this->evento === 'nueva' ? '/admin/escuelas?tab=solicitudes' : '/club/dashboard');
        $m = \App\Support\CorreoSigae::nuevo($asunto)->etiqueta('SIGAE · Apoyo en especie')->titulo($asunto, $s->nombre)
            ->saludo($notifiable->name ?? '')->linea($mensaje)
            ->detalle(['Escuela' => $s->nombre, 'CCT' => $s->cct, 'Municipio' => $s->municipio]);
        match ($this->evento) {
            'nueva' => $m->estado('Por revisar', 'oro'),
            'aceptada' => $m->estado('Dada de alta', 'verde')->pasos(['Abre tu club: la escuela ya quedó asignada.', 'Completa los datos que falten y envía tu registro.']),
            'rechazada' => $m->estado('No aceptada', 'rojo')->cita('Motivo', $s->motivo)->pasos(['Corrige los datos de la escuela y vuelve a enviarla, o elige otra del catálogo.']),
            default => $m,
        };

        return $m->boton($this->evento === 'nueva' ? 'Revisar la solicitud' : 'Abrir mi club', $destino)->mail();
    }
}
