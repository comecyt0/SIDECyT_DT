<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('programa_rubros', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tipo_programa_id')->constrained('tipo_programas')->cascadeOnDelete();
            $table->string('clave', 50);
            $table->string('nombre', 255);
            $table->text('descripcion')->nullable();
            $table->decimal('porcentaje_maximo', 5, 2)->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();

            $table->unique(['tipo_programa_id', 'clave']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('programa_rubros');
    }
};
