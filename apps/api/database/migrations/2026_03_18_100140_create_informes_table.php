<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('informes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('solicitud_id')->constrained('solicitudes')->cascadeOnDelete();
            $table->string('tipo', 50)->default('final'); // intermedio, final

            $table->date('fecha_limite_entrega'); // 20 días hábiles max
            $table->date('fecha_entregado')->nullable();

            $table->string('archivo_informe_url')->nullable();
            $table->string('archivo_evidencias_url')->nullable();

            $table->text('resultados_obtenidos')->nullable();

            $table->string('estado', 50)->default('pendiente'); // pendiente, en_revision, aprobado, rechazado
            $table->text('observaciones')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('informes');
    }
};
