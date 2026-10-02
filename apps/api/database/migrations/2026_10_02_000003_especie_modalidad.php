<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Modalidad de la convocatoria de apoyo en especie: estatal (flujo actual), nacional o internacional.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('especie_config', function (Blueprint $table) {
            $table->string('modalidad', 20)->default('estatal');
        });
    }

    public function down(): void
    {
        Schema::table('especie_config', function (Blueprint $table) {
            $table->dropColumn('modalidad');
        });
    }
};
