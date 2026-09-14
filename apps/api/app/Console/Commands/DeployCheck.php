<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class DeployCheck extends Command
{
    protected $signature = 'app:deploy-check';

    protected $description = 'Verifica que el entorno de producción esté correctamente configurado';

    public function handle(): int
    {
        $this->info('COMECYT — Verificación de entorno de producción');
        $this->line(str_repeat('─', 55));

        $errors = 0;
        $warnings = 0;

        // ── Entorno ──────────────────────────────────────────────
        $this->check('APP_ENV = production',
            app()->environment('production'),
            'Cambiar APP_ENV=production en .env',
            warning: false
        ) ?: $errors++;

        $this->check('APP_DEBUG = false',
            config('app.debug') === false,
            'Cambiar APP_DEBUG=false en .env',
            warning: false
        ) ?: $errors++;

        $this->check('APP_KEY definida',
            filled(config('app.key')),
            'Ejecutar: php artisan key:generate',
            warning: false
        ) ?: $errors++;

        $this->check('JWT_SECRET definida',
            filled(env('JWT_SECRET')),
            'Ejecutar: php artisan jwt:secret',
            warning: false
        ) ?: $errors++;

        // ── Base de datos ─────────────────────────────────────────
        try {
            DB::connection()->getPdo();
            $this->pass('Conexión a base de datos');
        } catch (\Exception $e) {
            $this->fail('Conexión a base de datos: '.$e->getMessage());
            $errors++;
        }

        $this->check('DB_CONNECTION = pgsql',
            config('database.default') === 'pgsql',
            'Cambiar DB_CONNECTION=pgsql (no sqlite) en .env',
            warning: false
        ) ?: $errors++;

        // ── Email ─────────────────────────────────────────────────
        $this->check('MAIL_MAILER ≠ log (producción)',
            config('mail.default') !== 'log',
            'Configurar SMTP real en .env (MAIL_MAILER=smtp)',
            warning: true
        ) ?: $warnings++;

        $this->check('MAIL_FROM_ADDRESS definida',
            filled(config('mail.from.address')),
            'Definir MAIL_FROM_ADDRESS en .env',
            warning: true
        ) ?: $warnings++;

        // ── Storage ───────────────────────────────────────────────
        $this->check('storage/app/public accesible (symlink)',
            file_exists(public_path('storage')),
            'Ejecutar: php artisan storage:link',
            warning: false
        ) ?: $errors++;

        $this->check('storage/ escribible',
            is_writable(storage_path()),
            'Ejecutar: chmod -R 775 storage/',
            warning: false
        ) ?: $errors++;

        // ── Caché y optimización ──────────────────────────────────
        $this->check('Config cacheada',
            file_exists(base_path('bootstrap/cache/config.php')),
            'Ejecutar: php artisan config:cache',
            warning: true
        ) ?: $warnings++;

        $this->check('Rutas cacheadas',
            file_exists(base_path('bootstrap/cache/routes-v7.php')),
            'Ejecutar: php artisan route:cache',
            warning: true
        ) ?: $warnings++;

        // ── Scheduler ─────────────────────────────────────────────
        $cronOutput = shell_exec('crontab -l 2>/dev/null | grep schedule:run') ?? '';
        $this->check('Scheduler en crontab',
            str_contains($cronOutput, 'schedule:run'),
            'Agregar al crontab: * * * * * cd '.base_path().' && php artisan schedule:run >> /dev/null 2>&1',
            warning: true
        ) ?: $warnings++;

        // ── Seguridad ─────────────────────────────────────────────
        $this->check('NEXT_PUBLIC_APP_URL definida',
            filled(env('NEXT_PUBLIC_APP_URL')),
            'Definir NEXT_PUBLIC_APP_URL=https://tudominio.mx en .env',
            warning: false
        ) ?: $errors++;

        // SEV-2 — CORS estricto en producción
        $corsEnv = (string) env('CORS_ALLOWED_ORIGINS', '');
        $this->check('CORS_ALLOWED_ORIGINS definida (no vacía)',
            $corsEnv !== '',
            'Definir CORS_ALLOWED_ORIGINS=https://dominio.gob.mx (lista CSV)',
            warning: false
        ) ?: $errors++;

        $this->check('CORS_ALLOWED_ORIGINS no contiene "*"',
            ! str_contains($corsEnv, '*'),
            'Eliminar "*" de CORS_ALLOWED_ORIGINS — se requiere lista explícita por supports_credentials=true',
            warning: false
        ) ?: $errors++;

        $this->check('CORS_ALLOWED_ORIGINS no contiene "localhost" / "127.0.0.1" en producción',
            ! preg_match('/localhost|127\.0\.0\.1/i', $corsEnv),
            'Quitar referencias a localhost de CORS_ALLOWED_ORIGINS en .env de producción',
            warning: false
        ) ?: $errors++;

        // SEV-1 — Detección de credenciales débiles
        $dbPass = (string) env('DB_PASSWORD', '');
        $this->check('DB_PASSWORD no es default débil',
            $dbPass !== '' && ! preg_match('/^(12345|password|admin|comecyt|root|secret|1234567)\d*$/i', $dbPass),
            'Rotar DB_PASSWORD a una contraseña fuerte (≥20 chars aleatorios)',
            warning: false
        ) ?: $errors++;

        $jwtSecret = (string) env('JWT_SECRET', '');
        $this->check('JWT_SECRET no es valor placeholder',
            $jwtSecret !== '' && ! preg_match('/^(secret|change-?me|local|dev|test)/i', $jwtSecret) && strlen($jwtSecret) >= 32,
            'Regenerar JWT_SECRET: php artisan jwt:secret --force',
            warning: false
        ) ?: $errors++;

        // M2 — Hashing recomendado: Argon2id si está disponible
        $this->check('HASH_DRIVER = argon2id (preferido) o bcrypt',
            in_array(config('hashing.driver'), ['argon2id', 'argon', 'bcrypt'], true),
            'Setear HASH_DRIVER=argon2id en .env (recomendado) o bcrypt como fallback',
            warning: true
        ) ?: $warnings++;

        if (config('hashing.driver') === 'bcrypt') {
            $this->check('BCRYPT_ROUNDS ≥ 12 (si bcrypt)',
                ((int) config('hashing.bcrypt.rounds', 10)) >= 12,
                'Setear BCRYPT_ROUNDS=12 (mínimo OWASP 2023) en .env',
                warning: true
            ) ?: $warnings++;
        }

        // Permisos del .env
        $envPath = base_path('.env');
        if (file_exists($envPath)) {
            $perms = substr(sprintf('%o', fileperms($envPath)), -3);
            $this->check('.env con permisos 600 ó 400',
                in_array($perms, ['600', '400'], true),
                "Ejecutar: chmod 600 {$envPath} (actual: {$perms})",
                warning: true
            ) ?: $warnings++;
        }

        // ── Resumen ───────────────────────────────────────────────
        $this->line(str_repeat('─', 55));

        if ($errors === 0 && $warnings === 0) {
            $this->info('Sistema listo para producción.');

            return Command::SUCCESS;
        }

        if ($errors > 0) {
            $this->error("{$errors} error(es) crítico(s) — el sistema NO debe subir a producción hasta resolverlos.");
        }

        if ($warnings > 0) {
            $this->warn("{$warnings} advertencia(s) — revisa antes de operar en producción.");
        }

        return $errors > 0 ? Command::FAILURE : Command::SUCCESS;
    }

    private function check(string $label, bool $condition, string $fix, bool $warning = false): bool
    {
        if ($condition) {
            $this->pass($label);

            return true;
        }

        if ($warning) {
            $this->warn("  ⚠  {$label}");
            $this->line("     → {$fix}");
        } else {
            $this->checkFail($label);
            $this->line("     → {$fix}");
        }

        return false;
    }

    private function pass(string $label): void
    {
        $this->line("  <fg=green>✓</> {$label}");
    }

    private function checkFail(string $label): void
    {
        $this->line("  <fg=red>✗</> {$label}");
    }
}
