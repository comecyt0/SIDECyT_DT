<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tipo_programas', function (Blueprint $table) {
            $table->id();
            $table->string('clave', 20)->unique(); // PFPI, PROT, IPFE, VINC, EMP
            $table->string('nombre', 255);
            $table->text('descripcion')->nullable();

            $table->string('tipo_apoyo', 50); // reembolso, concurrente, honorarios

            $table->boolean('tiene_etapas')->default(false);
            $table->integer('num_etapas')->default(1);

            $table->boolean('requiere_evaluacion_tecnica')->default(true);
            $table->boolean('requiere_fianza')->default(false);
            $table->decimal('porcentaje_fianza', 5, 2)->nullable();

            $table->boolean('tiene_equipo')->default(false);
            $table->integer('min_miembros_equipo')->nullable();
            $table->integer('max_miembros_equipo')->nullable();

            $table->integer('rango_edad_min')->nullable();
            $table->integer('rango_edad_max')->nullable();

            $table->decimal('monto_maximo', 12, 2)->nullable();
            $table->decimal('porcentaje_aportacion_solicitante', 5, 2)->default(10.00);
            $table->decimal('puntaje_minimo_aprobatorio', 5, 2)->default(80.00);

            $table->boolean('activo')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tipo_programas');
    }
};
