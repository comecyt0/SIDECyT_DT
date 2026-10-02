<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * E54 (02/10/2026) — Programa ↔ convocatorias. Cada convocatoria pertenece a un programa del catálogo público
 * (`programas_publicos`, el de /admin/sitio): p. ej. «Programa LEGO» → «Convocatoria 2026», «Convocatoria 2027».
 * La configuración técnica (tipo_programas: preguntas, documentos, rubros, criterios) sigue siendo una por convocatoria.
 * Nullable: las convocatorias anteriores se asocian a mano; si se borra el programa, la convocatoria queda sin programa.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('convocatorias', function (Blueprint $t) {
            $t->foreignId('programa_publico_id')->nullable()->after('tipo_programa_id')
                ->constrained('programas_publicos')->nullOnDelete();
            $t->index('programa_publico_id');
        });
    }

    public function down(): void
    {
        Schema::table('convocatorias', function (Blueprint $t) {
            $t->dropConstrainedForeignId('programa_publico_id');
        });
    }
};
