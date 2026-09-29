<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;

/**
 * Respaldo manual de PostgreSQL en formato custom (-Fc, comprimido; se restaura con pg_restore), igual que backup.ps1.
 * 30/09/2026: antes armaba `pg_dump | gzip > archivo` en un shell y fallaba cada noche en Windows (ninguno está en el
 * PATH). Ahora ejecuta el binario de config('comecyt.backup.pg_dump') sin shell (argumentos como lista) y la contraseña
 * viaja por PGPASSWORD en el entorno del proceso, nunca en la línea de comandos. No se programa en routes/console.php:
 * el respaldo nocturno lo hace la tarea de Windows COMECYT-Backup-Diario.
 */
class BackupDatabase extends Command
{
    protected $signature = 'comecyt:backup-db
        {--keep=30 : Días a conservar antes de eliminar backups antiguos}';

    protected $description = 'Genera un dump de PostgreSQL (formato custom) en storage/app/backups y limpia los que tengan más de --keep días';

    public function handle(): int
    {
        $connection = config('database.default');
        $config = config("database.connections.{$connection}");
        $database = $config['database'] ?? null;
        $username = $config['username'] ?? null;
        if ($connection !== 'pgsql' || ! $database || ! $username) {
            $this->error('Se necesita la conexión pgsql con base de datos y usuario configurados.');

            return self::FAILURE;
        }

        Storage::disk('local')->makeDirectory('backups');
        $relativePath = 'backups/comecyt_'.now()->format('Y-m-d_His').'.dump';
        $absolutePath = Storage::disk('local')->path($relativePath);

        $process = new Process([
            (string) config('comecyt.backup.pg_dump'),
            '--host='.($config['host'] ?? '127.0.0.1'),
            '--port='.($config['port'] ?? 5432),
            '--username='.$username,
            '--no-password',
            '--format=custom',
            '--file='.$absolutePath,
            $database,
        ], base_path(), ['PGPASSWORD' => (string) ($config['password'] ?? '')], null, 60 * 30);

        $this->info("Ejecutando pg_dump → {$relativePath}");
        $process->run();

        if (! $process->isSuccessful() || ! is_file($absolutePath) || filesize($absolutePath) === 0) {
            @unlink($absolutePath);
            $this->error('pg_dump falló: '.trim($process->getErrorOutput() ?: 'no generó el archivo'));

            return self::FAILURE;
        }

        $sizeMb = round(filesize($absolutePath) / 1024 / 1024, 2);
        $this->info("✓ Backup creado: {$relativePath} ({$sizeMb} MB)");

        $keep = max(1, (int) $this->option('keep'));
        $cutoff = now()->subDays($keep)->getTimestamp();
        $deleted = 0;
        foreach (Storage::disk('local')->files('backups') as $file) {
            if (Storage::disk('local')->lastModified($file) < $cutoff) {
                Storage::disk('local')->delete($file);
                $deleted++;
            }
        }
        if ($deleted > 0) {
            $this->info("Eliminados {$deleted} backups con más de {$keep} días.");
        }

        return self::SUCCESS;
    }
}
