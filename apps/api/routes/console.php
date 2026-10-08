<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Cierre automático de convocatorias vencidas — se ejecuta cada hora
Schedule::command('convocatorias:close-expired')->hourly();

// Alertas de cierre próximo (T-7, T-3, T-1 días) — diariamente 08:00 AM
Schedule::command('convocatorias:notificar-cierre')->dailyAt('08:00');
// E67: aviso de fin de la pausa de 24 h del registro general (desde el 3.er rechazo).
Schedule::command('registro:avisar-desbloqueos')->hourly();

// Respaldo de la BD: lo hace cada noche a las 02:00 la tarea de Windows COMECYT-Backup-Diario (backup.ps1, formato
// custom, 14 días en F:\Desarrollo Tecnologico\backups). `comecyt:backup-db` queda solo para respaldos manuales: estaba
// programado aquí también, fallaba cada noche en Windows (pg_dump | gzip sin PATH) y habría duplicado el respaldo.
