<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * E86 (20/10/2026, pedido del usuario) — Kit diferenciado por escuela:
 *  - especie_config.kit_diferenciado + kits (json): «Kit Nueva escuela» (uno por integrante) y «Kit» (escuelas que ya
 *    participaron; número fijo por club). Cada uno con su lista personalizable de artículos y cantidades.
 *  - clubes.kit_perfil: el admin puede cambiar el perfil de un club (null = según la marca de la escuela).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('especie_config', function (Blueprint $t) {
            $t->boolean('kit_diferenciado')->default(false);
            $t->json('kits')->nullable();
        });
        Schema::table('clubes', function (Blueprint $t) {
            $t->string('kit_perfil', 12)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('clubes', fn (Blueprint $t) => $t->dropColumn('kit_perfil'));
        Schema::table('especie_config', fn (Blueprint $t) => $t->dropColumn(['kit_diferenciado', 'kits']));
    }
};
