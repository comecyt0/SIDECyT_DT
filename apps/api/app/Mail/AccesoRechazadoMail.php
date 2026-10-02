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
        return new Content(
            view: 'emails.sigae',
            with: \App\Support\CorreoSigae::nuevo('Tu solicitud de acceso no fue aprobada')
                ->titulo('Tu solicitud de acceso no fue aprobada')->estado('No aprobada', 'rojo')
                ->saludo($this->solicitudAcceso->nombre)
                ->linea('Revisamos tu solicitud de acceso a SIGAE y por ahora no fue aprobada.')
                ->cita('Motivo', $this->solicitudAcceso->motivo_rechazo)
                ->pasos(['Revisa el motivo.', 'Si puedes corregirlo, vuelve a registrarte con los datos correctos.'])
                ->boton('Volver a registrarme', '/registro')->datos(),
        );
    }
}
