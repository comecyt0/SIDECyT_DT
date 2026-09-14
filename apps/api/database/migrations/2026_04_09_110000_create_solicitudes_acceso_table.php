<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('solicitudes_acceso', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 255);
            $table->string('email', 255)->unique();
            $table->string('password');
            $table->string('institucion_nombre', 255);
            $table->string('cargo', 255)->nullable();
            $table->string('telefono', 20)->nullable();
            $table->text('motivo')->nullable();
            $table->enum('estado', ['pendiente', 'aprobada', 'rechazada'])->default('pendiente');
            $table->text('motivo_rechazo')->nullable();
            $table->foreignId('revisado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('revisado_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('solicitudes_acceso');
    }
};
