<?php

namespace App\Console\Commands;

use App\Models\SolicitudAcceso;
use App\Notifications\RegistroEstadoAviso;
use App\Support\ReintentoRegistro;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;

/**
 * E67 — Avisa por correo cuando termina la pausa de 24 h del registro (desde el 3.er rechazo). Corre cada hora
 * (routes/console.php). Solo para el rechazo más reciente de cada correo/CURP, si no hay ya otra solicitud posterior.
 */
class AvisarDesbloqueosRegistro extends Command
{
    protected $signature = 'registro:avisar-desbloqueos';

    protected $description = 'Avisa por correo que terminó la pausa de 24 h del registro general';

    public function handle(): int
    {
        $limite = now()->subHours(ReintentoRegistro::HORAS);
        $n = 0;
        SolicitudAcceso::where('estado', 'rechazada')->whereNull('desbloqueo_avisado_at')
            ->where('revisado_at', '<=', $limite)->where('revisado_at', '>=', $limite->copy()->subDays(7))
            ->orderBy('id')->each(function (SolicitudAcceso $s) use (&$n) {
                $email = (string) $s->email;
                $rechazadas = ReintentoRegistro::rechazadas($email, $s->curp);
                $ultima = (clone $rechazadas)->orderByDesc('revisado_at')->first();
                $posterior = SolicitudAcceso::where('id', '>', $s->id)
                    ->where(fn ($q) => $q->whereRaw('LOWER(email) = ?', [mb_strtolower($email)])->when($s->curp, fn ($w) => $w->orWhere('curp', $s->curp)))->exists();
                // Solo cuando hubo pausa (3+ rechazos), para el último rechazo y sin un registro nuevo después.
                if ($rechazadas->count() >= ReintentoRegistro::LIBRES && $ultima?->id === $s->id && ! $posterior) {
                    Notification::route('mail', $email)->notify(new RegistroEstadoAviso('desbloqueo'));
                    $n++;
                }
                $s->forceFill(['desbloqueo_avisado_at' => now()])->save();
            });
        $this->info("Avisos de fin de pausa: {$n}");

        return self::SUCCESS;
    }
}
