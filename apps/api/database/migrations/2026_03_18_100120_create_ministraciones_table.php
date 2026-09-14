<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ministraciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('solicitud_id')->constrained('solicitudes')->cascadeOnDelete();
            $table->foreignId('banco_id')->nullable()->constrained('bancos'); // Catálogo

            // Carta Compromiso (desbloqueado post-aprobación)
            $table->string('carta_compromiso_url')->nullable();
            $table->boolean('carta_compromiso_aprobada')->default(false);

            // Datos cuenta destino pago
            $table->string('cuenta_clabe', 18)->nullable();
            $table->string('numero_cuenta', 50)->nullable();
            $table->string('titular_cuenta', 255)->nullable();

            $table->string('caratula_banco_url')->nullable();
            $table->string('constancia_fiscal_url')->nullable();
            $table->string('factura_institucion_url')->nullable();

            // Estado de pago
            $table->string('estado', 50)->default('pendiente'); // pendiente, revision, autorizada, pagada, rechazada

            // Solicitud de pago (Adjuntada por COMECYT)
            $table->string('solicitud_pago_oficial_url')->nullable();

            $table->text('observaciones')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ministraciones');
    }
};
