<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('programa_campos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tipo_programa_id')->constrained('tipo_programas')->cascadeOnDelete();
            $table->foreignId('etapa_id')->nullable()->constrained('programa_etapas')->cascadeOnDelete();

            $table->string('nombre_campo', 100);
            $table->string('etiqueta', 255);
            $table->string('tipo_campo', 50); // text, number, select, date, textarea, file

            $table->json('opciones_json')->nullable(); // [{id: 1, label: "Opción 1"}, ...]
            $table->json('reglas_validacion_json')->nullable(); // {min: 0, max: 350000, pattern: "..."}

            $table->integer('orden')->default(0);
            $table->boolean('requerido')->default(true);
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('programa_campos');
    }
};
