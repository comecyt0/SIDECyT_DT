<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * E71 (08/10/2026, pedido del usuario) — Al crear o editar una convocatoria de Apoyo en especie se elige si da transporte,
 * box lunch, los dos o ninguno; para el transporte, punto y hora de salida y de regreso (iguales para todos los clubes).
 * Las convocatorias existentes quedan con los dos activos (decisión del usuario).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('especie_config', function (Blueprint $t) {
            $t->boolean('incluye_transporte')->default(true);
            $t->boolean('incluye_lunch')->default(true);
            $t->string('transporte_salida_lugar', 300)->nullable();
            $t->timestamp('transporte_salida_hora')->nullable();
            $t->string('transporte_regreso_lugar', 300)->nullable();
            $t->timestamp('transporte_regreso_hora')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('especie_config', function (Blueprint $t) {
            $t->dropColumn(['incluye_transporte', 'incluye_lunch', 'transporte_salida_lugar', 'transporte_salida_hora', 'transporte_regreso_lugar', 'transporte_regreso_hora']);
        });
    }
};
