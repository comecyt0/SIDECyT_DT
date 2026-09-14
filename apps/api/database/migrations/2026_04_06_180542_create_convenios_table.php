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
        Schema::create('convenios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('solicitud_id')->constrained('solicitudes')->cascadeOnDelete();

            $table->string('numero_convenio')->unique(); // COMECYT-2026-001, etc
            $table->enum('estado', ['borrador', 'firmado', 'vigente', 'cerrado'])->default('borrador');

            $table->decimal('monto_aprobado', 15, 2); // Monto total a liberar
            $table->integer('num_tranches')->default(1); // Número de ministeraciones

            $table->dateTime('fecha_generacion')->nullable();
            $table->dateTime('fecha_firma')->nullable();
            $table->dateTime('fecha_inicio_vigencia')->nullable();
            $table->dateTime('fecha_fin_vigencia')->nullable();

            $table->string('pdf_url')->nullable(); // Path al PDF generado

            $table->text('observaciones')->nullable(); // Admin notes

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('convenios');
    }
};
