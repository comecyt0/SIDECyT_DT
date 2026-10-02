<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// E58 — Nombre corto de la convocatoria (p. ej. LEGO26), único, que va dentro de los folios nuevos de clubes y solicitudes.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('convocatorias', function (Blueprint $table) {
            $table->string('nombre_corto', 12)->nullable()->unique();
        });
    }

    public function down(): void
    {
        Schema::table('convocatorias', function (Blueprint $table) {
            $table->dropUnique(['nombre_corto']);
            $table->dropColumn('nombre_corto');
        });
    }
};
