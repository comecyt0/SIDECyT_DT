<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Renombra "instituciones" → "empresas" en toda la BD para alinearse con la
 * terminología institucional final. Esto incluye:
 *   - tabla `instituciones` → `empresas`
 *   - columna `institucion_id` → `empresa_id` en: solicitudes, users, evaluadores, lista_negra
 *
 * Las FK constraints se identifican vía information_schema (no por convención de
 * naming) porque algunas FKs tienen nombres no-estándar generados por migraciones
 * antiguas. Después del renombre, se recrean apuntando a `empresas`.
 *
 * Idempotente: si la BD ya está migrada, este migration no hace nada.
 *
 * ─── [B1] LEGACY: columna `factura_institucion_url` en `ministraciones` ───────
 * NO se renombra a `factura_empresa_url` porque:
 *   1) Es una URL de archivo (storage path), no una referencia a la entidad
 *      Empresa renombrada — el nombre describe el tipo de documento ("factura
 *      de la institución que recibe el pago"), no la tabla.
 *   2) Renombrarla obligaría a migrar archivos ya almacenados con el path viejo
 *      en producción, sin ganancia funcional.
 *   3) El modelo Ministracion::$fillable incluye este campo en su forma legacy
 *      para mantener compatibilidad con uploads previos.
 * Si se decide normalizarla en el futuro, hacerlo en una migración separada
 * que también renombre los archivos físicos en storage/app/public/ministraciones/.
 */
return new class extends Migration
{
    /** Drop la FK que apunta de $table.$column a la tabla referenciada, sin importar su nombre. */
    private function dropFkOnColumn(string $table, string $column): void
    {
        $driver = DB::connection()->getDriverName();
        try {
            if ($driver === 'pgsql') {
                $constraints = DB::select("
                    SELECT tc.constraint_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                      ON tc.constraint_name = kcu.constraint_name
                     AND tc.table_schema    = kcu.table_schema
                    WHERE tc.constraint_type = 'FOREIGN KEY'
                      AND tc.table_name      = ?
                      AND kcu.column_name    = ?
                ", [$table, $column]);
                foreach ($constraints as $c) {
                    DB::statement('ALTER TABLE "' . $table . '" DROP CONSTRAINT "' . $c->constraint_name . '"');
                }
            } elseif ($driver === 'mysql') {
                $constraints = DB::select("
                    SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = ?
                      AND COLUMN_NAME = ?
                      AND REFERENCED_TABLE_NAME IS NOT NULL
                ", [$table, $column]);
                foreach ($constraints as $c) {
                    DB::statement("ALTER TABLE `{$table}` DROP FOREIGN KEY `{$c->CONSTRAINT_NAME}`");
                }
            }
        } catch (\Throwable $e) {
            // ignore — la FK puede no existir
        }
    }

    public function up(): void
    {
        // 1) Renombrar la tabla principal
        if (Schema::hasTable('instituciones') && ! Schema::hasTable('empresas')) {
            Schema::rename('instituciones', 'empresas');
        }

        // 2) Renombrar columna institucion_id → empresa_id en cada tabla que la use
        $tables = ['solicitudes', 'users', 'evaluadores', 'lista_negra'];
        foreach ($tables as $tableName) {
            if (! Schema::hasTable($tableName)) {
                continue;
            }
            if (Schema::hasColumn($tableName, 'institucion_id') && ! Schema::hasColumn($tableName, 'empresa_id')) {
                $this->dropFkOnColumn($tableName, 'institucion_id');
                Schema::table($tableName, function (Blueprint $table) {
                    $table->renameColumn('institucion_id', 'empresa_id');
                });
                Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                    $nullable = in_array($tableName, ['users', 'lista_negra'], true);
                    if ($nullable) {
                        $table->foreign('empresa_id')->references('id')->on('empresas')->nullOnDelete();
                    } else {
                        $table->foreign('empresa_id')->references('id')->on('empresas');
                    }
                });
            }
        }
    }

    public function down(): void
    {
        $tables = ['solicitudes', 'users', 'evaluadores', 'lista_negra'];
        foreach ($tables as $tableName) {
            if (! Schema::hasTable($tableName)) {
                continue;
            }
            if (Schema::hasColumn($tableName, 'empresa_id') && ! Schema::hasColumn($tableName, 'institucion_id')) {
                $this->dropFkOnColumn($tableName, 'empresa_id');
                Schema::table($tableName, function (Blueprint $table) {
                    $table->renameColumn('empresa_id', 'institucion_id');
                });
            }
        }
        if (Schema::hasTable('empresas') && ! Schema::hasTable('instituciones')) {
            Schema::rename('empresas', 'instituciones');
        }
    }
};
