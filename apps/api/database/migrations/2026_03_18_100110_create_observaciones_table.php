<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('observaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('solicitud_id')->constrained('solicitudes')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users'); // Quién hizo la obs (Revisor / Evaluador / Admin)
            $table->string('tipo', 50)->default('documental'); // documental, tecnica, financiera
            $table->text('comentario');
            $table->boolean('resuelta')->default(false);
            $table->text('respuesta_solicitante')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('observaciones');
    }
};
