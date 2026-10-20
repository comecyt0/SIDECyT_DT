<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * E91 (20/10/2026, decisión del usuario) — La solicitud de transporte y/o box lunch y su formato no aparecen al líder
 * hasta que el admin o admin de convocatoria la habilita para toda la convocatoria. Las convocatorias que ya existían
 * quedan habilitadas (para no cortar un proceso en curso); las nuevas empiezan apagadas.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('especie_config', function (Blueprint $t) {
            $t->boolean('logistica_habilitada')->default(false);
        });
        DB::table('especie_config')->update(['logistica_habilitada' => true]);
    }

    public function down(): void
    {
        Schema::table('especie_config', fn (Blueprint $t) => $t->dropColumn('logistica_habilitada'));
    }
};
