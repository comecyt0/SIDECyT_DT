<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('solicitud_miembros_equipo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('solicitud_id')->constrained('solicitudes')->cascadeOnDelete();

            $table->string('nombre_completo', 255);
            $table->integer('edad')->nullable();
            $table->string('curp', 18)->nullable();
            $table->string('institucion_educativa', 255)->nullable();
            $table->string('correo', 255)->nullable();
            $table->string('telefono', 20)->nullable();
            $table->string('rol_en_equipo', 100)->nullable();
            $table->boolean('es_lider')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solicitud_miembros_equipo');
    }
};
