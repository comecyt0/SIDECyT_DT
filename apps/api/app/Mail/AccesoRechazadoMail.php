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
            subject: 'Actualización sobre tu solicitud de acceso — COMECYT',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.acceso-rechazado',
            with: [
                'nombre' => $this->solicitudAcceso->nombre,
                'motivo_rechazo' => $this->solicitudAcceso->motivo_rechazo,
                'app_url' => env('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
            ],
        );
    }
}
