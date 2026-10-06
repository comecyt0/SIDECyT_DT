<?php

namespace App\Notifications;

use App\Support\CorreoSigae;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * 06/10/2026 — Alguien se registró con un correo o una CURP que ya existen (cuenta o solicitud). La pantalla responde
 * igual que un registro nuevo (no se revela qué datos existen) y este aviso llega SOLO al correo escrito, con qué hacer
 * (decisión del usuario). No dice si chocó el correo o la CURP, ni datos de nadie. Solo correo (no hay usuario a quien
 * dejar campana); RegistroGeneralController limita uno por correo cada 30 minutos.
 */
class RegistroDuplicadoAviso extends Notification implements ShouldQueue
{
    use Queueable;

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return CorreoSigae::nuevo('Ya existe un registro con tus datos')
            ->titulo('Ya existe un registro con tus datos', 'No creamos un registro nuevo')->estado('Registro no creado', 'oro')
            ->preencabezado('Recibimos un intento de registro en SIGAE con este correo, pero ya hay una cuenta o una solicitud con esos datos.')
            ->linea('Recibimos un intento de registro en SIGAE con este correo, pero ya existe una cuenta o una solicitud con esos datos (el correo o la CURP), así que no creamos otro registro.')
            ->pasos([
                'Si ya tienes cuenta, entra con tu correo. Si no recuerdas la contraseña, usa «¿Olvidaste tu contraseña?».',
                'Si ya enviaste tu registro antes, está en revisión: te avisaremos por correo cuando lo aprueben.',
                'Si crees que es un error o no fuiste tú, escribe al COMECYT. Si no fuiste tú, puedes ignorar este correo.',
            ])
            ->boton('Entrar a SIGAE', '/login')->secundario('Recuperar mi contraseña', '/forgot-password')->mail();
    }
}
