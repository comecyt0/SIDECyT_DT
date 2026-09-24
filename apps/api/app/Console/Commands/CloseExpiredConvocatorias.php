<?php

namespace App\Console\Commands;

use App\Models\Convocatoria;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CloseExpiredConvocatorias extends Command
{
    protected $signature = 'convocatorias:close-expired';

    protected $description = 'Cierra automáticamente las convocatorias cuya fecha límite (con prórroga) ya pasó';

    /**
     * E40 (24/09/2026) — tres correcciones:
     *  1. Usa la fecha límite EFECTIVA: COALESCE(fecha_prorroga, fecha_cierre). Antes ignoraba la prórroga.
     *  2. Compara contra "hoy" en la zona de negocio (Toluca), no en UTC.
     *  3. Cierra cuando la fecha límite es ANTERIOR a hoy. Antes comparaba la fecha contra now() con hora
     *     ('2026-10-01' < '2026-10-01 01:00'), así que cerraba la convocatoria el mismo día de su cierre.
     * Además registraba `titulo`, un campo que no existe (es `nombre`).
     */
    public function handle(): int
    {
        $hoy = Convocatoria::hoy();

        $expired = Convocatoria::where('estado', 'activa')
            ->whereNull('deleted_at')
            ->whereRaw('COALESCE(fecha_prorroga, fecha_cierre) < ?', [$hoy])
            ->get();

        if ($expired->isEmpty()) {
            $this->info('No hay convocatorias vencidas.');

            return Command::SUCCESS;
        }

        foreach ($expired as $convocatoria) {
            $convocatoria->update(['estado' => 'cerrada']);

            Log::info('Convocatoria cerrada automáticamente', [
                'id' => $convocatoria->id,
                'nombre' => $convocatoria->nombre,
                'fecha_limite' => $convocatoria->fecha_cierre_efectiva,
                'con_prorroga' => (bool) $convocatoria->fecha_prorroga,
            ]);

            $this->line("Cerrada: [{$convocatoria->id}] {$convocatoria->nombre}");
        }

        $this->info('Total cerradas: '.$expired->count());

        return Command::SUCCESS;
    }
}
