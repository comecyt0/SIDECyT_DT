<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * E52 · Fase 3 — Logística de los clubes aceptados (docs/APOYO_EN_ESPECIE.md §6.5 y §13).
 *  - Configuración de logística por convocatoria: modo de cupos (convocatoria | evento), cupos totales (null = sin tope),
 *    límites por club (null = sin tope), tope por integrantes + acompañantes y fecha límite para solicitar.
 *  - Eventos (catálogo básico; F4 agrega el escaneo): nombre, fecha, sede y cupos propios cuando el modo es "evento".
 *  - Solicitudes de transporte y box lunch: una por club (modo convocatoria) o una por club y evento (modo evento).
 *  - Documentos firmados con versiones y validación: carta de resguardo y formato de cada solicitud.
 *  - Kit: fecha y lugar asignados, y entrega (fecha, lugar, quién entregó y quién recibió).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('especie_config', function (Blueprint $table) {
            $table->string('logistica_modo', 15)->default('convocatoria');     // convocatoria | evento
            $table->unsignedInteger('cupo_transporte')->nullable();             // modo convocatoria; null = sin tope
            $table->unsignedInteger('cupo_lunch')->nullable();
            $table->unsignedInteger('max_transporte_club')->nullable();         // null = sin tope
            $table->unsignedInteger('max_lunch_club')->nullable();
            $table->boolean('tope_integrantes')->default(true);                 // no pasar de integrantes + acompañantes
            $table->unsignedSmallInteger('acompanantes')->default(0);
            $table->date('fecha_limite_logistica')->nullable();                 // null = sin fecha límite
        });

        Schema::create('especie_eventos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('convocatoria_id')->constrained('convocatorias')->cascadeOnDelete();
            $table->string('nombre', 150);
            $table->date('fecha')->nullable();
            $table->string('sede', 255)->nullable();
            $table->unsignedInteger('cupo_transporte')->nullable();             // modo evento; null = sin tope
            $table->unsignedInteger('cupo_lunch')->nullable();
            $table->unsignedSmallInteger('orden')->default(0);
            $table->timestamps();
        });

        Schema::create('club_logistica', function (Blueprint $table) {
            $table->id();
            $table->foreignId('club_id')->constrained('clubes')->cascadeOnDelete();
            $table->foreignId('evento_id')->nullable()->constrained('especie_eventos')->cascadeOnDelete(); // null = modo convocatoria
            $table->unsignedSmallInteger('transporte')->default(0);
            $table->unsignedSmallInteger('lunch')->default(0);
            // enviada (aparta cupo, falta el formato firmado) | firmada (por validar) | aprobada | rechazada (libera cupo) | cancelada
            $table->string('estado', 15)->default('enviada');
            $table->timestamp('enviada_at')->nullable();
            $table->timestamps();
            $table->unique(['club_id', 'evento_id']);
        });

        Schema::create('club_firmados', function (Blueprint $table) {
            $table->id();
            $table->foreignId('club_id')->constrained('clubes')->cascadeOnDelete();
            $table->string('tipo', 20);                                          // resguardo | solicitud
            $table->foreignId('logistica_id')->nullable()->constrained('club_logistica')->cascadeOnDelete();
            $table->string('archivo', 60);                                       // disco privado, nombre aleatorio
            $table->string('nombre_original', 200);
            $table->string('estado', 15)->default('pendiente');                  // pendiente | aprobado | rechazado | reemplazado
            $table->text('motivo')->nullable();
            $table->foreignId('subido_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('revisado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('revisado_at')->nullable();
            $table->timestamps();
            $table->index(['club_id', 'tipo']);
        });

        Schema::table('clubes', function (Blueprint $table) {
            $table->timestamp('kit_fecha')->nullable();                          // fecha y hora asignadas
            $table->string('kit_lugar', 255)->nullable();
            $table->timestamp('kit_asignado_at')->nullable();
            $table->timestamp('kit_entregado_at')->nullable();                   // fecha real de entrega
            $table->string('kit_entregado_lugar', 255)->nullable();
            $table->string('kit_entrego', 150)->nullable();                      // quién entregó
            $table->string('kit_recibio', 150)->nullable();                      // quién recibió
            $table->foreignId('kit_registrado_por')->nullable()->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('clubes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('kit_registrado_por');
            $table->dropColumn(['kit_fecha', 'kit_lugar', 'kit_asignado_at', 'kit_entregado_at', 'kit_entregado_lugar', 'kit_entrego', 'kit_recibio']);
        });
        Schema::dropIfExists('club_firmados');
        Schema::dropIfExists('club_logistica');
        Schema::dropIfExists('especie_eventos');
        Schema::table('especie_config', function (Blueprint $table) {
            $table->dropColumn(['logistica_modo', 'cupo_transporte', 'cupo_lunch', 'max_transporte_club', 'max_lunch_club', 'tope_integrantes', 'acompanantes', 'fecha_limite_logistica']);
        });
    }
};
