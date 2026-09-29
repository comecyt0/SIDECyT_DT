<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * E52 · Fase 5 — Registro general con elección de rol (docs/APOYO_EN_ESPECIE.md §6.8 y §10).
 *
 * - Rol nuevo `lider_club` (id 7): líder de un club escolar en convocatorias de Apoyo en especie.
 * - `codigos_postales`: catálogo oficial SEPOMEX SOLO del Estado de México (se carga con `sidecyt:cargar-cp`; el archivo
 *   de Correos de México no se versiona: su licencia prohíbe distribuirlo y el repositorio es público).
 * - Varios roles por persona: `usuario_roles` guarda los roles otorgados; `users.rol_id` sigue siendo el rol ACTIVO
 *   (todo el código actual lo usa y no cambia). Cambiar de rol = reemitir la sesión con otro rol aprobado.
 * - `solicitudes_acceso` (cuenta nueva) suma rol solicitado y datos personales; `solicitudes_rol` = una persona con cuenta
 *   pide otro rol (la columna email de solicitudes_acceso es única y no sirve para eso).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! DB::table('roles')->where('slug', 'lider_club')->exists()) {
            DB::table('roles')->insert([
                'id' => 7, 'nombre' => 'Líder de club', 'slug' => 'lider_club',
                'descripcion' => 'Registra y representa a un club escolar en convocatorias de Apoyo en especie',
                'created_at' => now(), 'updated_at' => now(),
            ]);
            // PostgreSQL: mantener la secuencia por delante del id explícito.
            if (DB::getDriverName() === 'pgsql') {
                DB::statement("SELECT setval(pg_get_serial_sequence('roles','id'), (SELECT MAX(id) FROM roles))");
            }
        }

        Schema::create('codigos_postales', function (Blueprint $table) {
            $table->id();
            $table->char('cp', 5)->index();
            $table->string('asentamiento', 150);
            $table->string('tipo_asentamiento', 60)->nullable();
            $table->string('municipio', 120);
            $table->char('clave_municipio', 3);
            $table->string('ciudad', 120)->nullable();
            $table->string('zona', 20)->nullable();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('curp', 18)->nullable()->unique()->after('telefono');
            $table->char('codigo_postal', 5)->nullable()->after('curp');
            $table->string('municipio', 120)->nullable()->after('codigo_postal');
            $table->string('colonia', 150)->nullable()->after('municipio');
            // Datos que se capturan según el rol (p. ej. evaluador: área, institución, grado, CV). Sin datos bancarios.
            $table->json('datos_registro')->nullable()->after('colonia');
        });

        Schema::create('usuario_roles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('rol_id')->constrained('roles')->cascadeOnDelete();
            $table->foreignId('otorgado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'rol_id']);
        });
        // Cada cuenta actual conserva su rol como rol otorgado.
        DB::statement('INSERT INTO usuario_roles (user_id, rol_id, created_at, updated_at)
            SELECT id, rol_id, NOW(), NOW() FROM users WHERE rol_id IS NOT NULL');

        Schema::table('solicitudes_acceso', function (Blueprint $table) {
            $table->string('rol_solicitado', 30)->default('solicitante')->after('password');
            $table->string('curp', 18)->nullable()->after('telefono');
            $table->char('codigo_postal', 5)->nullable()->after('curp');
            $table->string('municipio', 120)->nullable()->after('codigo_postal');
            $table->string('colonia', 150)->nullable()->after('municipio');
            $table->json('datos_rol')->nullable()->after('contactos');
        });
        DB::statement('ALTER TABLE solicitudes_acceso ALTER COLUMN empresa_nombre DROP NOT NULL');

        Schema::create('solicitudes_rol', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('rol_solicitado', 30);
            $table->json('datos_rol')->nullable();
            $table->string('estado', 20)->default('pendiente');
            $table->text('motivo_rechazo')->nullable();
            $table->foreignId('revisado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('revisado_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solicitudes_rol');
        Schema::table('solicitudes_acceso', function (Blueprint $table) {
            $table->dropColumn(['rol_solicitado', 'curp', 'codigo_postal', 'municipio', 'colonia', 'datos_rol']);
        });
        Schema::dropIfExists('usuario_roles');
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['curp']);
            $table->dropColumn(['curp', 'codigo_postal', 'municipio', 'colonia', 'datos_registro']);
        });
        Schema::dropIfExists('codigos_postales');
        DB::table('users')->where('rol_id', 7)->update(['rol_id' => null]);
        DB::table('roles')->where('slug', 'lider_club')->delete();
    }
};
