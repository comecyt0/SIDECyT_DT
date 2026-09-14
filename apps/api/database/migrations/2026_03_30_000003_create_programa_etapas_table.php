<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('programa_etapas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tipo_programa_id')->constrained('tipo_programas')->cascadeOnDelete();
            $table->integer('numero_etapa');
            $table->string('nombre', 255);
            $table->text('descripcion')->nullable();
            $table->integer('duracion_meses')->nullable();
            $table->boolean('es_evaluacion_tecnica')->default(false);
            $table->decimal('puntaje_minimo', 5, 2)->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();

            $table->unique(['tipo_programa_id', 'numero_etapa']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('programa_etapas');
    }
};
