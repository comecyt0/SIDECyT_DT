<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('programa_criterios_evaluacion', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tipo_programa_id')->constrained('tipo_programas')->cascadeOnDelete();
            $table->foreignId('etapa_id')->nullable()->constrained('programa_etapas')->cascadeOnDelete();

            $table->string('nombre', 255);
            $table->text('descripcion')->nullable();
            $table->decimal('ponderacion', 5, 2); // peso en la evaluación (ej 11.11% para 9 criterios)
            $table->decimal('puntaje_maximo', 5, 2)->default(100);
            $table->integer('orden')->default(0);
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('programa_criterios_evaluacion');
    }
};
