<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 08/10/2026 (pedido del usuario) — «Soy director» en el registro de «Club De Robótica»:
 *  - users.es_director: la persona se registró como director(a) de la escuela;
 *  - clubes.dueno_director: el club lo registró el director, que da de alta al líder A y al líder B (club_accesos.tipo
 *    'lider_a'). El director no cuenta como integrante.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->boolean('es_director')->default(false);
        });
        Schema::table('clubes', function (Blueprint $t) {
            $t->boolean('dueno_director')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('clubes', fn (Blueprint $t) => $t->dropColumn('dueno_director'));
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn('es_director'));
    }
};
