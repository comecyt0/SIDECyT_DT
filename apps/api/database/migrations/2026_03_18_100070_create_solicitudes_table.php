<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('solicitudes', function (Blueprint $table) {
            $table->id();
            $table->string('folio', 100)->unique();
            $table->foreignId('convocatoria_id')->constrained('convocatorias')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users'); // Creador / Solicitante
            $table->foreignId('institucion_id')->constrained('instituciones');
            $table->foreignId('area_conocimiento_id')->constrained('areas_conocimiento');

            $table->string('titulo_proyecto', 255);
            $table->text('descripcion_proyecto');
            $table->date('fecha_inicio_evento')->nullable();
            $table->date('fecha_fin_evento')->nullable();

            // Requerimientos financieros %
            $table->decimal('monto_solicitado', 10, 2)->default(0);
            $table->decimal('aportacion_concurrente', 10, 2)->default(0);
            $table->decimal('porcentaje_transporte', 5, 2)->default(0);
            $table->decimal('porcentaje_comida', 5, 2)->default(0);
            $table->decimal('porcentaje_hospedaje', 5, 2)->default(0);

            // Estado de la solicitud (Workflow)
            $table->string('estado', 50)->default('borrador'); // borrador, enviada, en_revision, observada, evaluacion, aprobada, rechazada, convenio, ministracion, seguimiento, cerrada, cancelada

            // Observaciones generales Back Office
            $table->text('notas_internas')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solicitudes');
    }
};
