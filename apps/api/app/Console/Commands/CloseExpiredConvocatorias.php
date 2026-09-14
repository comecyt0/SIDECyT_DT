<?php

namespace App\Console\Commands;

use App\Models\Convocatoria;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CloseExpiredConvocatorias extends Command
{
    protected $signature = 'convocatorias:close-expired';

    protected $description = 'Cierra automáticamente las convocatorias cuya fecha_cierre ya pasó';

    public function handle(): int
    {
        $expired = Convocatoria::where('estado', 'activa')
            ->where('fecha_cierre', '<', now())
            ->get();

        if ($expired->isEmpty()) {
            $this->info('No hay convocatorias vencidas.');

            return Command::SUCCESS;
        }

        foreach ($expired as $convocatoria) {
            $convocatoria->update(['estado' => 'cerrada']);

            Log::info('Convocatoria cerrada automáticamente', [
                'id' => $convocatoria->id,
                'titulo' => $convocatoria->titulo,
                'fecha_cierre' => $convocatoria->fecha_cierre,
            ]);

            $this->line("Cerrada: [{$convocatoria->id}] {$convocatoria->titulo}");
        }

        $count = $expired->count();
        $this->info("Total cerradas: {$count}");

        return Command::SUCCESS;
    }
}
