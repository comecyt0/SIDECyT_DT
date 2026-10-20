<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 20/10/2026 (E79) — Formatos institucionales de los clubes (F:\Formatos): carta de la escuela, formatos A, B y C del
 * STEAM EDOMEX y permiso de uso de imagen (uno por integrante). Decisiones del usuario:
 *  - especie_config.formatos: casillas «Pedir» y «Obligatorio» por formato (la carta de la escuela también).
 *  - club_integrantes: domicilio, padre/madre/tutor, grado y grupo por separado (cada uno con su casilla).
 *  - club_documentos: revisión por documento (aprobar o rechazar con motivo). Lo ya subido queda «pendiente».
 *    integrante_id liga el permiso de imagen con su integrante.
 * El nombre del director(a) y el lugar del club van en clubes.datos (como la descripción).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('especie_config', function (Blueprint $t) {
            $t->json('formatos')->nullable();
        });
        Schema::table('club_integrantes', function (Blueprint $t) {
            $t->string('domicilio', 300)->nullable();
            $t->string('tutor_nombre', 150)->nullable();
            $t->string('grado', 20)->nullable();
            $t->string('grupo', 20)->nullable();
        });
        Schema::table('club_documentos', function (Blueprint $t) {
            $t->string('estado', 12)->default('pendiente');
            $t->string('motivo', 1000)->nullable();
            $t->unsignedBigInteger('revisado_por')->nullable();
            $t->timestamp('revisado_at')->nullable();
            $t->foreignId('integrante_id')->nullable()->constrained('club_integrantes')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('club_documentos', function (Blueprint $t) {
            $t->dropConstrainedForeignId('integrante_id');
            $t->dropColumn(['estado', 'motivo', 'revisado_por', 'revisado_at']);
        });
        Schema::table('club_integrantes', fn (Blueprint $t) => $t->dropColumn(['domicilio', 'tutor_nombre', 'grado', 'grupo']));
        Schema::table('especie_config', fn (Blueprint $t) => $t->dropColumn('formatos'));
    }
};
