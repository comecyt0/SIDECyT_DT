<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;

class BackupDatabase extends Command
{
    protected $signature = 'comecyt:backup-db
        {--keep=30 : Días a conservar antes de eliminar backups antiguos}';

    protected $description = 'Genera un dump comprimido de PostgreSQL en storage/app/backups y limpia backups con más de --keep días';

    public function handle(): int
    {
        $connection = config('database.default');
        if ($connection !== 'pgsql') {
            $this->warn("Conexión activa = {$connection}. Esperaba 'pgsql'. Continuando — el comando intentará igual con pg_dump.");
        }

        $config = config("database.connections.{$connection}");
        $host = $config['host'] ?? '127.0.0.1';
        $port = $config['port'] ?? 5432;
        $database = $config['database'] ?? null;
        $username = $config['username'] ?? null;
        $password = $config['password'] ?? null;

        if (! $database || ! $username) {
            $this->error('Faltan credenciales DB en config/database.php');

            return self::FAILURE;
        }

        $timestamp = now()->format('Y-m-d_His');
        $relativePath = "backups/comecyt_{$timestamp}.sql.gz";
        $absolutePath = Storage::disk('local')->path($relativePath);

        Storage::disk('local')->makeDirectory('backups');

        // pg_dump | gzip > file
        $cmd = sprintf(
            'pg_dump --host=%s --port=%s --username=%s --no-password --format=plain --no-owner --no-acl %s | gzip -9 > %s',
            escapeshellarg($host),
            escapeshellarg((string) $port),
            escapeshellarg($username),
            escapeshellarg($database),
            escapeshellarg($absolutePath),
        );

        $this->info("Ejecutando: pg_dump → {$relativePath}");

        $process = Process::fromShellCommandline($cmd, base_path(), [
            'PGPASSWORD' => $password,
        ], null, 60 * 30);

        $process->run();

        if (! $process->isSuccessful()) {
            $this->error('pg_dump falló:');
            $this->line($process->getErrorOutput());

            return self::FAILURE;
        }

        $sizeBytes = filesize($absolutePath) ?: 0;
        $sizeMb = round($sizeBytes / 1024 / 1024, 2);
        $this->info("✓ Backup creado: {$relativePath} ({$sizeMb} MB)");

        // Limpiar backups viejos
        $keep = (int) $this->option('keep');
        $cutoff = now()->subDays($keep)->getTimestamp();
        $deleted = 0;

        foreach (Storage::disk('local')->files('backups') as $file) {
            $mtime = Storage::disk('local')->lastModified($file);
            if ($mtime < $cutoff) {
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
