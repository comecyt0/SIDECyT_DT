<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// E67 — Reintentos del registro tras un rechazo: la solicitud rechazada ya no bloquea; desde el 3.er rechazo hay una
// pausa de 24 h. Esta columna marca que ya se avisó a la persona del fin de la pausa (comando registro:avisar-desbloqueos).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('solicitudes_acceso', function (Blueprint $table) {
            $table->timestamp('desbloqueo_avisado_at')->nullable();
        });
        // El correo era único en TODA la tabla: una solicitud rechazada impedía para siempre volver a registrarse.
        // Ahora solo puede haber UNA solicitud pendiente por correo y por CURP; las rechazadas/aprobadas quedan en el historial.
        Schema::table('solicitudes_acceso', function (Blueprint $table) {
            $table->dropUnique('solicitudes_acceso_email_unique');
        });
        DB::statement("CREATE UNIQUE INDEX solicitudes_acceso_email_pendiente ON solicitudes_acceso (LOWER(email)) WHERE estado = 'pendiente'");
        DB::statement("CREATE UNIQUE INDEX solicitudes_acceso_curp_pendiente ON solicitudes_acceso (curp) WHERE estado = 'pendiente' AND curp IS NOT NULL");
        DB::statement('CREATE INDEX solicitudes_acceso_email_lower ON solicitudes_acceso (LOWER(email))');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS solicitudes_acceso_email_lower');
        DB::statement('DROP INDEX IF EXISTS solicitudes_acceso_curp_pendiente');
        DB::statement('DROP INDEX IF EXISTS solicitudes_acceso_email_pendiente');
        Schema::table('solicitudes_acceso', function (Blueprint $table) {
            $table->dropColumn('desbloqueo_avisado_at');
        });
    }
};
