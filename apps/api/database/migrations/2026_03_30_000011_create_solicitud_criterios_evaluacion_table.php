<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('solicitud_criterios_evaluacion', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dictamen_id')->constrained('dictamenes')->cascadeOnDelete();
            $table->foreignId('criterio_id')->constrained('programa_criterios_evaluacion')->cascadeOnDelete();

            $table->decimal('puntaje_obtenido', 5, 2)->default(0);
            $table->text('observacion')->nullable();
            $table->timestamps();

            $table->unique(['dictamen_id', 'criterio_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solicitud_criterios_evaluacion');
    }
};
