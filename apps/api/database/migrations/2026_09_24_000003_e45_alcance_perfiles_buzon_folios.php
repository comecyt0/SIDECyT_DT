<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * E45 (24/09/2026) — ver docs/IMPLEMENTACIONES_E45.md.
 * Roles nuevos, periodos y alcance, perfil con foto/portada, historial de estados, folios publicados,
 * buzón con chat y límites de archivos configurables.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── Roles nuevos (ids fijos: config/comecyt.php) ──
        $ahora = now();
        foreach ([
            [5, 'Administrador de Convocatoria', 'admin_convocatoria', 'Opera únicamente las convocatorias que el admin le asigna'],
            [6, 'Consulta', 'consulta', 'Solo lectura de los periodos que el admin le asigna'],
        ] as [$id, $nombre, $slug, $desc]) {
            if (! DB::table('roles')->where('slug', $slug)->exists()) {
                DB::table('roles')->insert(['id' => $id, 'nombre' => $nombre, 'slug' => $slug, 'descripcion' => $desc,
                    'activo' => true, 'created_at' => $ahora, 'updated_at' => $ahora]);
            }
        }
        // PostgreSQL: la secuencia no avanza con ids explícitos.
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("SELECT setval(pg_get_serial_sequence('roles', 'id'), (SELECT MAX(id) FROM roles))");
        }

        // ── Periodos ──
        Schema::create('periodos', function (Blueprint $t) {
            $t->id();
            $t->string('nombre', 120)->unique();
            $t->date('fecha_inicio')->nullable();
            $t->date('fecha_fin')->nullable();
            $t->boolean('activo')->default(true);
            $t->timestamps();
        });
        Schema::table('convocatorias', function (Blueprint $t) {
            $t->foreignId('periodo_id')->nullable()->after('ejercicio_fiscal')->constrained('periodos')->nullOnDelete();
        });
        Schema::create('periodo_user', function (Blueprint $t) {
            $t->foreignId('periodo_id')->constrained('periodos')->cascadeOnDelete();
            $t->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $t->primary(['periodo_id', 'user_id']);
        });
        Schema::create('convocatoria_user', function (Blueprint $t) {
            $t->foreignId('convocatoria_id')->constrained('convocatorias')->cascadeOnDelete();
            $t->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $t->primary(['convocatoria_id', 'user_id']);
        });

        // ── Perfil ──
        Schema::table('users', function (Blueprint $t) {
            $t->string('avatar_path', 80)->nullable()->after('cargo');
            $t->string('banner_path', 80)->nullable()->after('avatar_path');
        });

        // ── Seguimiento: historial de estados de la solicitud ──
        Schema::create('solicitud_historial', function (Blueprint $t) {
            $t->id();
            $t->foreignId('solicitud_id')->constrained('solicitudes')->cascadeOnDelete();
            $t->string('estado_anterior', 40)->nullable();
            $t->string('estado_nuevo', 40);
            $t->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $t->string('motivo', 1000)->nullable();
            $t->timestamp('created_at')->useCurrent();
            $t->index(['solicitud_id', 'created_at']);
        });

        // ── Folios publicados en la landing (instantánea de lo que el admin confirmó) ──
        Schema::create('folios_publicados', function (Blueprint $t) {
            $t->id();
            $t->foreignId('convocatoria_id')->constrained('convocatorias')->cascadeOnDelete();
            $t->foreignId('solicitud_id')->constrained('solicitudes')->cascadeOnDelete();
            $t->string('folio', 60);
            $t->foreignId('publicado_por')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('publicado_at')->useCurrent();
            $t->unique(['convocatoria_id', 'solicitud_id']);
        });

        // ── Buzón con chat ──
        Schema::create('conversaciones', function (Blueprint $t) {
            $t->id();
            $t->foreignId('convocatoria_id')->constrained('convocatorias')->cascadeOnDelete();
            $t->foreignId('solicitante_id')->constrained('users')->cascadeOnDelete();
            $t->string('asunto', 160);
            $t->string('categoria', 20); // sugerencia | duda | problema
            $t->string('estado', 20)->default('abierta'); // abierta | resuelta
            $t->timestamp('ultimo_mensaje_at')->nullable();
            $t->foreignId('resuelta_por')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('resuelta_at')->nullable();
            $t->timestamps();
            $t->index(['convocatoria_id', 'estado']);
            $t->index(['solicitante_id', 'ultimo_mensaje_at']);
        });
        Schema::create('conversacion_mensajes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('conversacion_id')->constrained('conversaciones')->cascadeOnDelete();
            $t->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $t->text('cuerpo');
            $t->timestamp('leido_at')->nullable();
            $t->timestamps();
            $t->index(['conversacion_id', 'id']);
        });

        // ── Límites de archivos ──
        // formato_permitido pasa a lista de tipos: pdf | imagen | office | zip (el valor anterior "PDF" → "pdf").
        DB::table('programa_documentos')->update(['formato_permitido' => 'pdf']);
        Schema::create('documentos_fijos_config', function (Blueprint $t) {
            $t->id();
            $t->string('clave', 60)->unique();
            $t->string('etiqueta', 120);
            $t->string('formatos', 60)->default('pdf');
            $t->unsignedSmallInteger('tamano_maximo_mb')->default(5);
            $t->timestamps();
        });
        foreach ([
            ['carta_compromiso', 'Carta compromiso firmada'],
            ['caratula_banco', 'Carátula del estado de cuenta'],
            ['constancia_fiscal', 'Constancia de situación fiscal'],
            ['factura_institucion', 'Factura de la institución'],
            ['informe_final', 'Informe final'],
        ] as [$clave, $etiqueta]) {
            DB::table('documentos_fijos_config')->insert(['clave' => $clave, 'etiqueta' => $etiqueta, 'formatos' => 'pdf',
                'tamano_maximo_mb' => $clave === 'informe_final' ? 10 : 5, 'created_at' => $ahora, 'updated_at' => $ahora]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('documentos_fijos_config');
        Schema::dropIfExists('conversacion_mensajes');
        Schema::dropIfExists('conversaciones');
        Schema::dropIfExists('folios_publicados');
        Schema::dropIfExists('solicitud_historial');
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn(['avatar_path', 'banner_path']));
        Schema::dropIfExists('convocatoria_user');
        Schema::dropIfExists('periodo_user');
        Schema::table('convocatorias', function (Blueprint $t) {
            $t->dropConstrainedForeignId('periodo_id');
        });
        Schema::dropIfExists('periodos');
        DB::table('roles')->whereIn('slug', ['admin_convocatoria', 'consulta'])->delete();
    }
};
