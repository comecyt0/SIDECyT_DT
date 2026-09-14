<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('convocatorias', function (Blueprint $table) {
            $table->foreignId('tipo_programa_id')->nullable()->constrained('tipo_programas')->cascadeOnDelete();
            $table->integer('numero_convocatoria')->nullable();
            $table->date('fecha_limite_informe')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('convocatorias', function (Blueprint $table) {
            $table->dropColumn(['tipo_programa_id', 'numero_convocatoria', 'fecha_limite_informe']);
        });
    }
};
