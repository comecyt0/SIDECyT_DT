<?php

namespace App\Notifications;

use App\Models\SolicitudAcceso;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AccesoRechazado extends Notification implements ShouldQueue
{
    use Queueable;

    protected SolicitudAcceso $solicitudAcceso;

    public function __construct(SolicitudAcceso $solicitudAcceso)
    {
        $this->solicitudAcceso = $solicitudAcceso;
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        // 02/10/2026: plantilla única de SIGAE.
        return \App\Support\CorreoSigae::nuevo('Tu solicitud de acceso no fue aprobada')
            ->titulo('Tu solicitud de acceso no fue aprobada')->estado('No aprobada', 'rojo')
            ->saludo($this->solicitudAcceso->nombre)
            ->linea('Revisamos tu solicitud de acceso a SIGAE y por ahora no fue aprobada.')
            ->cita('Motivo', $this->solicitudAcceso->motivo_rechazo)
            ->pasos(['Revisa el motivo.', 'Si puedes corregirlo, vuelve a registrarte con los datos correctos.'])
            ->boton('Volver a registrarme', '/registro')->mail();
    }
}
