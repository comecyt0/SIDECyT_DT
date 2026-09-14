<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('programa_documentos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tipo_programa_id')->constrained('tipo_programas')->cascadeOnDelete();
            $table->foreignId('etapa_id')->nullable()->constrained('programa_etapas')->cascadeOnDelete();

            $table->string('nombre', 255);
            $table->text('descripcion')->nullable();
            $table->string('formato_permitido', 100)->nullable(); // PDF, DOC, XLSX, etc
            $table->integer('tamaño_maximo_mb')->default(5);
            $table->boolean('obligatorio')->default(true);
            $table->integer('orden')->default(0);
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('programa_documentos');
    }
};
