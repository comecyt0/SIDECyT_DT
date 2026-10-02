<?php

namespace App\Notifications;

use App\Models\SolicitudAcceso;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AccesoAprobado extends Notification implements ShouldQueue
{
    use Queueable;

    /** Si el registro se borró antes de enviarse (p. ej. datos de prueba), el aviso se descarta sin fallar. */
    public bool $deleteWhenMissingModels = true;

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
        return \App\Support\CorreoSigae::nuevo('Tu acceso a SIGAE fue aprobado')
            ->titulo('¡Bienvenido(a) a SIGAE!', 'Tu solicitud de acceso fue aprobada')->estado('Acceso aprobado', 'verde')
            ->saludo($this->solicitudAcceso->nombre)
            ->linea('Ya puedes entrar al Sistema de Gestión de Apoyo Empresarial con tu correo.')
            ->detalle(['Correo de acceso' => $this->solicitudAcceso->email])
            ->pasos(['Entra con tu correo y la contraseña que registraste.', 'Completa tu perfil la primera vez.', 'Revisa las convocatorias abiertas y empieza tu solicitud.'])
            ->boton('Entrar a SIGAE', '/login')->mail();
    }
}
