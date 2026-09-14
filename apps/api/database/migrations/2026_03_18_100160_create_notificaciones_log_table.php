<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notificaciones_log', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('correo_destino', 255);
            $table->string('asunto', 255);
            $table->text('mensaje');
            $table->string('tipo', 100); // cambio_estado, asignacion_evaluacion, etc.
            $table->foreignId('solicitud_id')->nullable()->constrained('solicitudes')->nullOnDelete();
            $table->boolean('enviado')->default(true);
            $table->string('error_mensaje')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notificaciones_log');
    }
};
