<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evaluadores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('institucion_id')->constrained('instituciones'); // Su institución (no puede evaluar pares)
            $table->foreignId('area_conocimiento_id')->constrained('areas_conocimiento');
            $table->string('grado_academico', 100)->nullable();
            $table->string('especialidad', 255)->nullable();
            $table->boolean('activo')->default(true);
            $table->text('notas')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluadores');
    }
};
