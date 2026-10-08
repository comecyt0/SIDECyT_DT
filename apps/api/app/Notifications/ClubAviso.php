<?php

namespace App\Notifications;

use App\Models\Club;
use App\Notifications\Channels\CampanaChannel;
use App\Support\CorreoSigae;
use App\Support\EnlaceAviso;
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
    public const CON_CORREO = ['observado', 'prorroga', 'aceptado', 'qr_habilitado', 'kit_asignado', 'acceso_otorgado', 'colider_activado', 'lugar_cedido'];

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
            'colider_activado' => ['Te compartieron el permiso del club', ($x['quien'] ?? 'El líder')." te compartió el permiso de operar «{$c->nombre}»: ya puedes editar, enviar y atender la logística."],
            'colider_retirado' => ['Ya no compartes el permiso del club', ($x['quien'] ?? 'El líder')." retiró el permiso compartido de «{$c->nombre}». Sigues como acompañante del club."],
            // 08/10/2026: ceder = intercambiar lugar, rol y permisos.
            'lugar_cedido' => ['Te cedieron su lugar en el club', ($x['quien'] ?? 'Un responsable')." te cedió su lugar en «{$c->nombre}» ({$c->folio}): intercambiaron rol y permisos. Revisa en tu panel lo que ahora puedes hacer."],
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

    /** 02/10/2026 — Correo con la plantilla única de SIGAE (App\Support\CorreoSigae). */
    public function toMail(object $notifiable): MailMessage
    {
        [$asunto, $mensaje] = $this->textos();
        $c = $this->club;
        $x = $this->extra;
        $ev = $this->evento;
        $tono = match ($ev) {
            'aceptado', 'qr_habilitado', 'kit_entregado', 'firmado_aprobado', 'colider_activado', 'acceso_otorgado', 'lugar_cedido' => 'verde',
            'observado', 'prorroga', 'kit_asignado' => 'oro',
            'rechazado', 'firmado_rechazado', 'qr_revocado' => 'rojo',
            default => 'vino',
        };
        $chip = ['observado' => 'Con observaciones', 'prorroga' => 'Plazo ampliado', 'aceptado' => 'Aceptado', 'rechazado' => 'No aceptado',
            'qr_habilitado' => 'QR disponible', 'kit_asignado' => 'Entrega programada', 'acceso_otorgado' => 'Acceso concedido',
            'colider_activado' => 'Permiso compartido', 'lugar_cedido' => 'Lugar cedido'][$ev] ?? null;

        $m = CorreoSigae::nuevo($asunto)->etiqueta('SIGAE · Apoyo en especie')->titulo($asunto, $c->nombre)
            ->preencabezado($mensaje)->saludo($notifiable->name ?? '')->linea($mensaje)
            ->detalle(['Club' => $c->nombre, 'Folio' => $c->folio, 'Convocatoria' => $c->convocatoria?->nombre,
                'Plazo para corregir' => in_array($ev, ['observado', 'prorroga'], true) ? ($x['vence'] ?? null) : null,
                'Fecha de entrega' => $ev === 'kit_asignado' ? ($x['fecha'] ?? null) : null,
                'Lugar' => $ev === 'kit_asignado' ? ($x['lugar'] ?? null) : null]);
        if ($chip) $m->estado($chip, $tono); else $m->tono($tono);
        if (in_array($ev, ['observado', 'prorroga'], true)) $m->cita($ev === 'observado' ? 'Qué debes corregir' : 'Motivo', $x['comentario'] ?? null);
        if ($ev === 'rechazado') $m->cita('Motivo', $x['motivo'] ?? null);

        $m->pasos(match ($ev) {
            'observado' => ['Abre tu club y lee las observaciones.', 'Corrige lo que se indica (puedes cambiar cualquier dato).', 'Pulsa «Enviar correcciones» antes de que venza el plazo.'],
            'aceptado' => ['Espera la fecha y el lugar de entrega de tu kit (te llegará un correo).', 'Descarga la carta de resguardo, fírmala y súbela escaneada en PDF.', 'Cuando el COMECYT lo habilite, descarga tu QR y credencial.'],
            'kit_asignado' => ['Lleva la carta de resguardo firmada.', 'Llega puntual al lugar indicado.', 'Quien reciba el kit firmará de recibido.'],
            'qr_habilitado' => ['Descarga la credencial con el QR desde tu panel.', 'Llévala impresa o en tu celular a los eventos.'],
            'acceso_otorgado' => ['Entra a SIDECyT con tu correo.', 'Si tu cuenta es nueva, usa la contraseña que te dio el líder: te pediremos cambiarla.', 'Abre «Clubes que acompaño» para seguir al club.'],
            'firmado_rechazado' => ['Abre la logística de tu club y lee el motivo.', 'Sube una versión nueva, escaneada en PDF.'],
            default => [],
        });
        $orden = ['observado' => 1, 'prorroga' => 1, 'etapa_aprobada' => 1, 'aprobado_revision' => 2, 'aceptado' => 3, 'kit_asignado' => 4, 'kit_entregado' => 5, 'qr_habilitado' => 4];
        if (isset($orden[$ev])) $m->progreso(['Registro', 'Revisiones', 'Comité', 'Aceptado', 'Kit', 'Evento'], $orden[$ev]);

        $destino = EnlaceAviso::club($notifiable, (int) $c->id) ?? '/club/clubes/'.$c->id;

        return $m->boton(str_starts_with($destino, '/club') ? 'Abrir mi club' : 'Abrir el club', $destino)->mail();
    }
}
