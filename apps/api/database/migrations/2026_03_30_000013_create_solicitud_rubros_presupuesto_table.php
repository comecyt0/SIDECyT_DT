<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('solicitud_rubros_presupuesto', function (Blueprint $table) {
            $table->id();
            $table->foreignId('solicitud_id')->constrained('solicitudes')->cascadeOnDelete();
            $table->foreignId('rubro_id')->constrained('programa_rubros')->cascadeOnDelete();

            $table->decimal('monto_solicitado', 12, 2)->default(0);
            $table->decimal('monto_aprobado', 12, 2)->nullable();
            $table->text('descripcion')->nullable();
            $table->timestamps();

            $table->unique(['solicitud_id', 'rubro_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solicitud_rubros_presupuesto');
    }
};
