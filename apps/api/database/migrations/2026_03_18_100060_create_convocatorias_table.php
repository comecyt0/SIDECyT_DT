<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('convocatorias', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 255);
            $table->string('ejercicio_fiscal', 4);
            $table->text('descripcion')->nullable();
            $table->date('fecha_apertura');
            $table->date('fecha_cierre');
            $table->decimal('monto_maximo_apoyo', 10, 2)->default(60000.00); // 60 mil tope
            $table->decimal('porcentaje_aportacion_minima', 5, 2)->default(10.00); // 10%
            $table->string('estado', 50)->default('borrador'); // borrador, activa, cerrada
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('convocatorias');
    }
};
