<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asignaciones_evaluador', function (Blueprint $table) {
            $table->id();
            $table->foreignId('solicitud_id')->constrained('solicitudes')->cascadeOnDelete();
            $table->foreignId('evaluador_id')->constrained('evaluadores')->cascadeOnDelete();
            $table->foreignId('asignado_por')->nullable()->constrained('users')->nullOnDelete(); // Admin
            $table->string('estado', 50)->default('asignado'); // asignado (naranja), evaluando (amarillo), completado (verde), cancelado
            $table->date('fecha_limite')->nullable();
            $table->boolean('carta_imparcialidad_aceptada')->default(false);
            $table->timestamps();

            // Un evaluador evalúa una solicitud máximo una vez
            $table->unique(['solicitud_id', 'evaluador_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asignaciones_evaluador');
    }
};
