<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * E87 (20/10/2026, pedido del usuario) — Transporte: el punto de SALIDA lo define cada líder de club (lugar, enlace de
 * Google Maps y hora que propone); el punto de REGRESO lo define el admin o admin de convocatoria (lugar, enlace y hora).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clubes', function (Blueprint $t) {
            $t->string('transporte_salida_lugar', 300)->nullable();
            $t->string('transporte_salida_maps', 500)->nullable();
            $t->timestamp('transporte_salida_hora')->nullable();
        });
        Schema::table('especie_config', function (Blueprint $t) {
            $t->string('transporte_regreso_maps', 500)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('clubes', fn (Blueprint $t) => $t->dropColumn(['transporte_salida_lugar', 'transporte_salida_maps', 'transporte_salida_hora']));
        Schema::table('especie_config', fn (Blueprint $t) => $t->dropColumn('transporte_regreso_maps'));
    }
};
