<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * E52 · Fase 4 — QR, eventos y reportes (docs/APOYO_EN_ESPECIE.md §6.6, §6.7 y §14).
 *  - Rol nuevo `operador_evento` (id 8): escanea y captura manualmente en las convocatorias que se le asignan.
 *  - QR por club: token opaco guardado CIFRADO (para volver a pintar el QR al líder) y su HASH (para buscar al escanear
 *    sin descifrar nada); habilitado/revocado por el personal. Revocar = token nuevo (el anterior deja de servir).
 *  - Registros de evento: asistencia (personas) y box lunch (cantidad), uno por club, evento y tipo; se corrigen.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! DB::table('roles')->where('slug', 'operador_evento')->exists()) {
            DB::table('roles')->insert([
                'id' => 8, 'nombre' => 'Operador de evento', 'slug' => 'operador_evento',
                'descripcion' => 'Escanea el QR de los clubes y registra asistencia, box lunch y kit en los eventos de sus convocatorias',
                'created_at' => now(), 'updated_at' => now(),
            ]);
            // La secuencia de PostgreSQL no avanza con ids explícitos.
            if (DB::getDriverName() === 'pgsql') DB::statement("SELECT setval(pg_get_serial_sequence('roles','id'), (SELECT MAX(id) FROM roles))");
        }

        Schema::table('clubes', function (Blueprint $table) {
            $table->text('qr_token')->nullable();                     // cifrado con la APP_KEY
            $table->string('qr_hash', 64)->nullable()->unique();      // sha256 del token
            $table->timestamp('qr_habilitado_at')->nullable();
            $table->foreignId('qr_habilitado_por')->nullable()->constrained('users')->nullOnDelete();
        });

        Schema::create('club_registros_evento', function (Blueprint $table) {
            $table->id();
            $table->foreignId('club_id')->constrained('clubes')->cascadeOnDelete();
            $table->foreignId('evento_id')->constrained('especie_eventos')->cascadeOnDelete();
            $table->string('tipo', 12);                               // asistencia | lunch
            $table->unsignedSmallInteger('cantidad')->default(0);
            $table->string('metodo', 8)->default('qr');               // qr | manual
            $table->foreignId('registrado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['club_id', 'evento_id', 'tipo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('club_registros_evento');
        Schema::table('clubes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('qr_habilitado_por');
            $table->dropUnique(['qr_hash']);
            $table->dropColumn(['qr_token', 'qr_hash', 'qr_habilitado_at']);
        });
        DB::table('roles')->where('slug', 'operador_evento')->delete();
    }
};
