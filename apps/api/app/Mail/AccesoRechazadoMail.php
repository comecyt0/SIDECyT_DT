<?php

namespace App\Mail;

use App\Models\SolicitudAcceso;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AccesoRechazadoMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public SolicitudAcceso $solicitudAcceso;

    public function __construct(SolicitudAcceso $solicitudAcceso)
    {
        $this->solicitudAcceso = $solicitudAcceso;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Tu solicitud de acceso no fue aprobada — SIGAE',
        );
    }

    /** 02/10/2026: plantilla única de SIGAE. */
    public function content(): Content
    {
        // E67: dice si puede volver a registrarse ya, cuántos intentos le quedan o hasta cuándo está en pausa (desde el 3.er rechazo).
        $s = $this->solicitudAcceso;
        $hasta = \App\Support\ReintentoRegistro::pausaHasta((string) $s->email, $s->curp);
        $restan = \App\Support\ReintentoRegistro::intentosRestantes((string) $s->email, $s->curp);
        $m = \App\Support\CorreoSigae::nuevo('Tu solicitud de acceso no fue aprobada')
            ->titulo('Tu solicitud de acceso no fue aprobada', 'Solicitud #'.$s->id)->estado('No aprobada', 'rojo')
            ->saludo($s->nombre)
            ->linea('Revisamos tu solicitud de acceso a SIGAE y no fue aprobada.')
            ->cita('Motivo', $s->motivo_rechazo)
            ->detalle(['Rol que pediste' => \App\Notifications\RolSolicitudAviso::ETIQUETAS[$s->rol_solicitado] ?? $s->rol_solicitado]);
        if ($hasta) {
            $m->linea('Como tu registro ya fue rechazado varias veces, queda en pausa 24 horas. Te avisaremos por correo cuando puedas registrarte de nuevo.')
                ->detalle(['Podrás registrarte de nuevo a partir del' => \App\Support\ReintentoRegistro::fecha($hasta)])
                ->pasos(['Revisa el motivo con calma.', 'Pasada la pausa, regístrate de nuevo con el rol y los datos correctos.', 'Si necesitas ayuda, escribe al COMECYT.'])
                ->boton('Ir a SIGAE', '/login');
        } else {
            $m->linea('Puedes corregirlo y registrarte de nuevo ahora mismo con el mismo correo y CURP.'
                .($restan > 0 ? ' Te quedan '.$restan.' intento'.($restan === 1 ? '' : 's').' antes de una pausa de 24 horas.' : ''))
                ->pasos(['Revisa el motivo.', 'Entra a «Crear cuenta» y elige el rol correcto (por ejemplo, Líder de club o Participante).', 'Revisa tus datos antes de enviar.'])
                ->boton('Registrarme de nuevo', '/registro');
        }

        return new Content(view: 'emails.sigae', with: $m->datos());
    }
}
