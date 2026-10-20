<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * E92 (20/10/2026, pedido del usuario) — Solicitud de cambio de integrante de un club ya enviado.
 *  - El líder la pide desde el envío y hasta `especie_config.fecha_limite_cambios` (sin fecha no hay cambios), con
 *    justificación, los datos del nuevo integrante (los mismos que se piden a cada integrante) y sus formatos.
 *  - La aprueba o rechaza (con motivo) el admin o el admin de convocatoria. Al aprobarla, quien sale queda de BAJA con
 *    historial (`club_integrantes.baja_at`), no se borra; el nuevo entra en su lugar.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('especie_config', function (Blueprint $t) {
            $t->date('fecha_limite_cambios')->nullable();
        });
        Schema::table('club_integrantes', function (Blueprint $t) {
            $t->timestamp('baja_at')->nullable();
            $t->text('baja_motivo')->nullable();
        });
        Schema::create('club_cambios_integrante', function (Blueprint $t) {
            $t->id();
            $t->foreignId('club_id')->constrained('clubes')->cascadeOnDelete();
            $t->foreignId('integrante_sale_id')->nullable()->constrained('club_integrantes')->nullOnDelete();
            $t->string('sale_nombre', 255); // copia por si el registro cambia
            $t->text('justificacion');
            $t->string('estado', 20)->default('pendiente'); // pendiente | aprobada | rechazada | cancelada
            $t->json('nuevo'); // datos validados del nuevo integrante
            $t->string('foto_path', 120)->nullable();
            $t->string('permiso_archivo', 120)->nullable(); // permiso de uso de imagen firmado (PDF, disco privado)
            $t->string('permiso_nombre', 200)->nullable();
            $t->foreignId('integrante_nuevo_id')->nullable()->constrained('club_integrantes')->nullOnDelete();
            $t->foreignId('solicitado_por')->nullable()->constrained('users')->nullOnDelete();
            $t->foreignId('resuelto_por')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('resuelto_at')->nullable();
            $t->text('motivo')->nullable(); // motivo del rechazo
            $t->timestamps();
            $t->index(['club_id', 'estado']);
        });
        // Una sola solicitud pendiente por club.
        DB::statement("CREATE UNIQUE INDEX club_cambios_un_pendiente ON club_cambios_integrante (club_id) WHERE estado = 'pendiente'");
    }

    public function down(): void
    {
        Schema::dropIfExists('club_cambios_integrante');
        Schema::table('club_integrantes', fn (Blueprint $t) => $t->dropColumn(['baja_at', 'baja_motivo']));
        Schema::table('especie_config', fn (Blueprint $t) => $t->dropColumn('fecha_limite_cambios'));
    }
};
