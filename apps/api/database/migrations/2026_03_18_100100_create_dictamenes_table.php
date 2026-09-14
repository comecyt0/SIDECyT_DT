<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dictamenes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asignacion_id')->constrained('asignaciones_evaluador')->cascadeOnDelete();

            // 4 criterios del 25% c/u
            $table->decimal('criterio_1_puntaje', 5, 2)->default(0);
            $table->decimal('criterio_2_puntaje', 5, 2)->default(0);
            $table->decimal('criterio_3_puntaje', 5, 2)->default(0);
            $table->decimal('criterio_4_puntaje', 5, 2)->default(0);

            $table->decimal('puntaje_total', 5, 2)->default(0); // auto-calculated

            $table->text('comentarios_justificacion'); // Observaciones de la evaluación

            // >= 80 es suceptible de apoyo
            $table->boolean('sujeto_apoyo')->default(false);

            $table->string('documento_formato_b_url')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dictamenes');
    }
};
