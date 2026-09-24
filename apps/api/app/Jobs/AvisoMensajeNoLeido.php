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

        $base = rtrim((string) config('app.frontend_url'), '/');
        $ruta = $delSolicitante ? '/admin/buzon?hilo='.$c->id : '/solicitante/buzon?hilo='.$c->id;
        $asunto = 'SIGAC: tienes un mensaje sin leer en el buzón';

        foreach ($destinatarios as $u) {
            try {
                Mail::raw(
                    "Hola {$u->name}:\n\nTienes un mensaje sin leer en el buzón de sugerencias de SIGAC "
                    ."(asunto: «".mb_substr(strip_tags((string) $c->asunto), 0, 120)."»).\n\n"
                    ."Ábrelo aquí: {$base}{$ruta}\n\n"
                    ."Por seguridad este correo no incluye el contenido del mensaje.\n\nCOMECYT",
                    fn ($msg) => $msg->to($u->email)->subject($asunto)
                );
            } catch (\Throwable $e) {
                Log::warning('AvisoMensajeNoLeido: no se pudo enviar', ['user_id' => $u->id, 'error' => $e->getMessage()]);
            }
        }
    }
}
