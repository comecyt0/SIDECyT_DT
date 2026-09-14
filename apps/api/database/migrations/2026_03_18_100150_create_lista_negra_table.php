<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lista_negra', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institucion_id')->constrained('instituciones')->cascadeOnDelete();
            $table->foreignId('solicitud_id')->nullable()->constrained('solicitudes')->nullOnDelete(); // Qué proyecto causó la sanción
            $table->foreignId('sancionado_por')->nullable()->constrained('users')->nullOnDelete();

            $table->text('motivo'); // ej. "No entregó informe final en 20 días hábiles"

            $table->date('fecha_inicio_sancion');
            $table->date('fecha_fin_sancion')->nullable(); // null = indefinido

            $table->boolean('activa')->default(true);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lista_negra');
    }
};
