<?php

namespace App\Console\Commands;

use App\Models\Convocatoria;
use App\Models\User;
use App\Notifications\ConvocatoriaCierreProximo;
use Illuminate\Console\Command;
use Carbon\Carbon;

/**
 * Notifica por correo a admins + solicitantes con borradores en convocatorias
 * que cierran en los próximos N días (default 7), y un recordatorio en T-1 día.
 *
 * Programación recomendada en routes/console.php:
 *   $schedule->command('convocatorias:notificar-cierre')->dailyAt('08:00');
 */
class NotificarCierreProximo extends Command
{
    protected $signature = 'convocatorias:notificar-cierre
                            {--dias=* : Días previos al cierre para enviar alerta (default 7,3,1)}';

    protected $description = 'Envía alertas por correo de fecha de cierre próximo a admins y solicitantes con borradores';

    public function handle(): int
    {
        $dias = $this->option('dias') ?: [7, 3, 1];
        $hoy = Carbon::today();

        $this->info("Buscando convocatorias que cierran en " . implode(', ', $dias) . " días…");

        $totalEnviadas = 0;

        foreach ($dias as $d) {
            $targetDate = $hoy->copy()->addDays((int) $d);

            $convocatorias = Convocatoria::where('estado', 'activa')
                ->whereDate('fecha_cierre', $targetDate->toDateString())
                ->get();

            foreach ($convocatorias as $conv) {
                $this->line("  • {$conv->nombre} (cierre {$conv->fecha_cierre}) — {$d} día(s) antes");

                // Notificar a todos los admins
                $admins = User::where('rol_id', 1)->where('activo', true)->get();
                foreach ($admins as $admin) {
                    $admin->notify(new ConvocatoriaCierreProximo($conv, (int) $d));
                    $totalEnviadas++;
                }

                // Notificar a solicitantes que tengan borradores en esta convocatoria
                $solicitantesConBorrador = User::where('rol_id', config('comecyt.roles.solicitante', 4))
                    ->where('activo', true)
                    ->whereHas('solicitudes', function ($q) use ($conv) {
                        $q->where('convocatoria_id', $conv->id)
                          ->whereIn('estado', ['borrador', 'observada']);
                    })
                    ->get();

                foreach ($solicitantesConBorrador as $sol) {
                    $sol->notify(new ConvocatoriaCierreProximo($conv, (int) $d));
                    $totalEnviadas++;
                }
            }
        }

        $this->info("✅ Total notificaciones enviadas: {$totalEnviadas}");
        return self::SUCCESS;
    }
}
