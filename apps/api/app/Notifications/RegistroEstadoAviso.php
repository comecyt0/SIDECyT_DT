<?php

namespace App\Notifications;

use App\Support\CorreoSigae;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * E67 — Avisos por correo del registro general a quien se registró (aún no tiene cuenta: se envía al correo escrito).
 * Decisión del usuario: correo en cada estado de la solicitud de acceso.
 *  - `recibido`: folio, rol pedido, qué sigue (y si es un reintento);
 *  - `pausa`: el registro está en pausa hasta cierta hora (desde el 3.er rechazo);
 *  - `desbloqueo`: terminó la pausa, ya puede registrarse de nuevo.
 * Aprobado y rechazado tienen su propio correo (AccesoAprobado / AccesoRechazadoMail). Sin datos sensibles.
 */
class RegistroEstadoAviso extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly string $evento, public readonly array $datos = []) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $d = $this->datos;
        $rol = (string) ($d['rol'] ?? '');

        return match ($this->evento) {
            'recibido' => CorreoSigae::nuevo('Recibimos tu registro')
                ->titulo('¡Recibimos tu registro!', $rol ? 'Rol solicitado: '.$rol : null)->estado('En revisión', 'verde')
                ->saludo($d['nombre'] ?? '')
                ->linea('Tu solicitud de acceso a SIGAE quedó en revisión. Un administrador la revisará y te avisaremos por correo del resultado.')
                ->linea(! empty($d['intento']) && $d['intento'] > 1 ? 'Este es tu intento número '.$d['intento'].' después de un rechazo.' : null)
                ->detalle(['Folio de tu solicitud' => isset($d['folio']) ? 'Solicitud #'.$d['folio'] : null, 'Rol solicitado' => $rol ?: null])
                ->progreso(['Registro', 'Revisión', 'Cuenta activa'], 1)
                ->pasos(['Espera el correo con el resultado (aprobado o con el motivo si no se aprueba).', 'Cuando se apruebe, entra con tu correo y la contraseña que registraste.'])
                ->boton('Ir a SIGAE', '/login')->mail(),
            'pausa' => CorreoSigae::nuevo('Tu registro está en pausa')
                ->titulo('Tu registro está en pausa', 'Podrás intentarlo de nuevo pronto')->estado('En pausa', 'oro')
                ->linea('Tu solicitud de acceso ha sido rechazada varias veces, por eso el registro con tu correo y tu CURP queda en pausa por 24 horas.')
                ->detalle(['Podrás registrarte de nuevo a partir del' => $d['hasta'] ?? null])
                ->pasos(['Revisa el motivo del último rechazo (te llegó por correo).', 'Pasada la pausa, regístrate de nuevo con el rol y los datos correctos.', 'Si necesitas ayuda, escribe al COMECYT.'])
                ->boton('Ir a SIGAE', '/login')->mail(),
            'desbloqueo' => CorreoSigae::nuevo('Ya puedes registrarte de nuevo')
                ->titulo('Ya puedes registrarte de nuevo', 'Terminó la pausa de 24 horas')->estado('Registro disponible', 'verde')
                ->linea('Terminó la pausa de tu registro. Ya puedes volver a enviar tu solicitud de acceso con el rol y los datos correctos.')
                ->pasos(['Entra a «Crear cuenta».', 'Elige el rol correcto y revisa tus datos antes de enviar.'])
                ->boton('Registrarme de nuevo', '/registro')->mail(),
            default => CorreoSigae::nuevo('Aviso de tu registro')->titulo('Aviso de tu registro')->linea('Hay novedades en tu registro.')->boton('Ir a SIGAE', '/login')->mail(),
        };
    }
}
