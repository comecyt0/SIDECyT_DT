<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * E52 · Fase 2 — Revisión y aceptación de clubes (docs/APOYO_EN_ESPECIE.md §6.3, §6.4 y §12).
 *  - Etapas de revisión por convocatoria (orden, quién revisa, plazo en horas naturales, subsanaciones). Por defecto 2
 *    etapas, 1 subsanación, 24 h (decisión del usuario). Se crean para las convocatorias de especie que ya existen.
 *  - Historial de cada resolución (aprobar / observar / rechazar / prórroga / corrección del líder).
 *  - Club: etapa actual, ronda de subsanación, vencimiento, visto bueno del admin de convocatoria, decisión del comité,
 *    aceptación, motivo de rechazo y aceptación del aviso de privacidad.
 *  - Acta del comité: una por convocatoria.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('especie_etapas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('convocatoria_id')->constrained('convocatorias')->cascadeOnDelete();
            $table->unsignedSmallInteger('orden');
            $table->string('nombre', 120);
            $table->string('revisa', 20)->default('ambos');          // revisor | admin_convocatoria | ambos
            $table->unsignedSmallInteger('plazo_horas')->default(24); // horas naturales para subsanar
            $table->unsignedSmallInteger('max_subsanaciones')->default(1);
            $table->timestamps();
            $table->unique(['convocatoria_id', 'orden']);
        });

        Schema::table('clubes', function (Blueprint $table) {
            $table->foreignId('etapa_actual_id')->nullable()->after('estado')->constrained('especie_etapas')->nullOnDelete();
            $table->unsignedSmallInteger('ronda')->default(0)->after('etapa_actual_id');   // subsanaciones usadas en la etapa
            $table->timestamp('vence_at')->nullable()->after('ronda');                      // límite para subsanar
            $table->timestamp('visto_bueno_at')->nullable();
            $table->foreignId('visto_bueno_por')->nullable()->constrained('users')->nullOnDelete();
            $table->string('comite_resultado', 20)->nullable();                             // aceptado | no_aceptado
            $table->timestamp('comite_at')->nullable();
            $table->foreignId('comite_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('aceptado_at')->nullable();
            $table->string('rechazo_origen', 20)->nullable();                               // revision | comite
            $table->text('rechazo_motivo')->nullable();
            $table->timestamp('aviso_privacidad_at')->nullable();
            $table->index(['convocatoria_id', 'estado']);
        });

        Schema::create('club_revisiones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('club_id')->constrained('clubes')->cascadeOnDelete();
            $table->foreignId('etapa_id')->nullable()->constrained('especie_etapas')->nullOnDelete();
            $table->unsignedSmallInteger('ronda')->default(0);
            $table->string('resultado', 20);      // aprobado | observado | rechazado | prorroga | subsanado | enviado
            $table->text('comentario')->nullable();
            $table->unsignedSmallInteger('horas')->nullable();                              // prórroga
            $table->timestamp('vence_at')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('rol', 30)->nullable();                                          // rol con el que actuó
            $table->timestamp('created_at')->useCurrent();
            $table->index(['club_id', 'created_at']);
        });

        Schema::table('especie_config', function (Blueprint $table) {
            $table->string('acta_comite', 60)->nullable();            // nombre interno (disco privado)
            $table->string('acta_comite_nombre', 200)->nullable();    // nombre original saneado
            $table->timestamp('acta_comite_at')->nullable();
            $table->foreignId('acta_comite_por')->nullable()->constrained('users')->nullOnDelete();
        });

        // Etapas por defecto para las convocatorias de especie existentes (2 revisiones, 1 subsanación, 24 h).
        $convs = DB::table('especie_config')->pluck('convocatoria_id');
        foreach ($convs as $cid) {
            foreach ([1 => 'Primera revisión', 2 => 'Segunda revisión'] as $orden => $nombre) {
                DB::table('especie_etapas')->insert([
                    'convocatoria_id' => $cid, 'orden' => $orden, 'nombre' => $nombre, 'revisa' => 'ambos',
                    'plazo_horas' => 24, 'max_subsanaciones' => 1, 'created_at' => now(), 'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('especie_config', function (Blueprint $table) {
            $table->dropConstrainedForeignId('acta_comite_por');
            $table->dropColumn(['acta_comite', 'acta_comite_nombre', 'acta_comite_at']);
        });
        Schema::dropIfExists('club_revisiones');
        Schema::table('clubes', function (Blueprint $table) {
            $table->dropIndex(['convocatoria_id', 'estado']);
            $table->dropConstrainedForeignId('etapa_actual_id');
            $table->dropConstrainedForeignId('visto_bueno_por');
            $table->dropConstrainedForeignId('comite_por');
            $table->dropColumn(['ronda', 'vence_at', 'visto_bueno_at', 'comite_resultado', 'comite_at', 'aceptado_at',
                'rechazo_origen', 'rechazo_motivo', 'aviso_privacidad_at']);
        });
        Schema::dropIfExists('especie_etapas');
    }
};
