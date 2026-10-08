<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * 08/10/2026 (pedido del usuario): el líder B cuenta como integrante del club (el director no). Su tarjeta se marca con
 * es_lider_b; una por club.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('club_integrantes', function (Blueprint $t) {
            $t->boolean('es_lider_b')->default(false)->after('es_lider');
        });
        DB::statement('CREATE UNIQUE INDEX club_integrantes_un_lider_b ON club_integrantes (club_id) WHERE es_lider_b');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS club_integrantes_un_lider_b');
        Schema::table('club_integrantes', function (Blueprint $t) {
            $t->dropColumn('es_lider_b');
        });
    }
};
