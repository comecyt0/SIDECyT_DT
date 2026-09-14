<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Crea tabla `categorias` editable (Fomento, Talento, Otra...) y la liga
 * a convocatorias vía `categoria_id`. También agrega 'no_aplica' como
 * modalidad válida (vía seed en tabla `modalidades` si existe).
 *
 * Si tabla `modalidades` no existe, simplemente se omite — la modalidad
 * "No aplica" se maneja por enum/string en la convocatoria.
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1) Tabla categorias (admin la puede editar 100%)
        if (! Schema::hasTable('categorias_apoyo')) {
            Schema::create('categorias_apoyo', function (Blueprint $table) {
                $table->id();
                $table->string('clave', 50)->unique();
                $table->string('nombre', 100);
                $table->string('descripcion', 500)->nullable();
                $table->string('color', 20)->nullable(); // hex o token (ej. 'amber-600')
                $table->boolean('reembolsable')->default(false); // Fomento sí reembolsa, Talento no
                $table->boolean('activa')->default(true);
                $table->integer('orden')->default(0);
                $table->timestamps();
            });

            // Seed inicial
            DB::table('categorias_apoyo')->insert([
                ['clave' => 'fomento',  'nombre' => 'Fomento',  'descripcion' => 'Apoyo con reembolso económico al beneficiario.',          'color' => 'emerald', 'reembolsable' => true,  'activa' => true, 'orden' => 1, 'created_at' => now(), 'updated_at' => now()],
                ['clave' => 'talento',  'nombre' => 'Talento',  'descripcion' => 'Becas y formación de capital humano.',                    'color' => 'sky',     'reembolsable' => false, 'activa' => true, 'orden' => 2, 'created_at' => now(), 'updated_at' => now()],
                ['clave' => 'otra',     'nombre' => 'Otra',     'descripcion' => 'Otra modalidad no clasificada.',                          'color' => 'neutral', 'reembolsable' => false, 'activa' => true, 'orden' => 3, 'created_at' => now(), 'updated_at' => now()],
            ]);
        }

        // 2) Agregar categoria_id a convocatorias
        if (Schema::hasTable('convocatorias') && ! Schema::hasColumn('convocatorias', 'categoria_id')) {
            Schema::table('convocatorias', function (Blueprint $table) {
                $table->foreignId('categoria_id')->nullable()
                      ->after('tipo_programa_id')
                      ->constrained('categorias_apoyo')
                      ->nullOnDelete();
            });
        }

        // 3) Agregar "No aplica" a la tabla modalidades si existe
        if (Schema::hasTable('modalidades')) {
            $exists = DB::table('modalidades')->where('nombre', 'No aplica')->exists();
            if (! $exists) {
                DB::table('modalidades')->insert([
                    'nombre' => 'No aplica',
                    'descripcion' => 'La convocatoria no requiere especificar modalidad de apoyo.',
                    'activo' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('convocatorias') && Schema::hasColumn('convocatorias', 'categoria_id')) {
            Schema::table('convocatorias', function (Blueprint $table) {
                try { $table->dropForeign(['categoria_id']); } catch (\Throwable $e) {}
                $table->dropColumn('categoria_id');
            });
        }

        Schema::dropIfExists('categorias_apoyo');

        if (Schema::hasTable('modalidades')) {
            DB::table('modalidades')->where('nombre', 'No aplica')->delete();
        }
    }
};
