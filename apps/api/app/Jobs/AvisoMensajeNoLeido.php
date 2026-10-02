<?php

namespace App\Jobs;

use App\Models\ConversacionMensaje;
use App\Models\User;
use App\Support\Alcance;
use App\Support\Buzon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * E45 — Correo si un mensaje del buzón sigue sin leerse 30 minutos después (decisión del usuario).
 * El correo NO incluye el contenido del mensaje (puede tener datos personales): solo avisa y enlaza al sistema.
 */
class AvisoMensajeNoLeido implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public int $tries = 2;

    public function __construct(public int $mensajeId) {}

    public function handle(): void
    {
        Alcance::olvidar();
        $m = ConversacionMensaje::with('conversacion')->find($this->mensajeId);
        if (! $m || $m->leido_at || ! $m->conversacion) {
            return;
        }
        $c = $m->conversacion;
        $delSolicitante = (int) $m->user_id === (int) $c->solicitante_id;
        $destinatarios = $delSolicitante
            ? Buzon::equipo((int) $c->convocatoria_id)
            : User::where('id', $c->solicitante_id)->where('activo', true)->get(['id', 'name', 'email']);

        $ruta = $delSolicitante ? '/admin/buzon?hilo='.$c->id : '/solicitante/buzon?hilo='.$c->id;
        $asuntoHilo = mb_substr(strip_tags((string) $c->asunto), 0, 120);

        foreach ($destinatarios as $u) {
            try {
                // 02/10/2026: plantilla única de SIGAE (sigue sin incluir el contenido del mensaje).
                $datos = \App\Support\CorreoSigae::nuevo('Tienes un mensaje sin leer en el buzón')
                    ->titulo('Tienes un mensaje sin leer', 'Buzón de SIGAE')->estado('Sin leer', 'azul')
                    ->saludo($u->name)->linea('Te escribieron en el buzón y el mensaje sigue sin leerse.')
                    ->detalle(['Conversación' => $asuntoHilo])
                    ->linea('Por seguridad, este correo no incluye el contenido del mensaje.')
                    ->boton('Leer y responder', $ruta)->datos();
                Mail::send('emails.sigae', $datos, fn ($msg) => $msg->to($u->email)->subject('Tienes un mensaje sin leer en el buzón — SIGAE'));
            } catch (\Throwable $e) {
                Log::warning('AvisoMensajeNoLeido: no se pudo enviar', ['user_id' => $u->id, 'error' => $e->getMessage()]);
            }
        }
    }
}
