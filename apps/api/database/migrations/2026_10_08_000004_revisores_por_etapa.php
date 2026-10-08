<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * E70 (08/10/2026, pedido del usuario) — En cada fase de revisión de una convocatoria de Apoyo en especie el admin elige
 * quién revisa (personas) y cuántas aprobaciones hacen falta para pasar a la siguiente fase (p. ej. 2 de 3).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('especie_etapas', function (Blueprint $t) {
            $t->unsignedSmallInteger('aprobaciones_requeridas')->default(1);
        });
        Schema::create('especie_etapa_revisores', function (Blueprint $t) {
            $t->id();
            $t->foreignId('etapa_id')->constrained('especie_etapas')->cascadeOnDelete();
            $t->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $t->timestamps();
            $t->unique(['etapa_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('especie_etapa_revisores');
        Schema::table('especie_etapas', fn (Blueprint $t) => $t->dropColumn('aprobaciones_requeridas'));
    }
};
