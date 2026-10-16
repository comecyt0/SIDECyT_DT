<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * 16/10/2026 (E76) — Identidad verificada contra la CURP, en SIGAE y SICEI (tabla `users` compartida).
 * Solo agrega columnas nulas: las cuentas anteriores quedan como están (decisión del usuario: solo cuentas nuevas).
 *  - nombres, primer_apellido, segundo_apellido: `name` se sigue llenando con el nombre completo (todo lo que ya lo lee).
 *  - fecha_nacimiento; sexo y entidad_nacimiento salen de la CURP, no se piden.
 *  - curp_verificacion: coincide | revision | aprobada | rechazada (null = no verificada); curp_problemas: qué no coincidió.
 * SICEI (rol sicei_app) escribe estas columnas en su registro y al aprobar cambios de perfil.
 */
return new class extends Migration
{
    private function columnas(Blueprint $t, bool $conFechaYSexo = true): void
    {
        $t->string('nombres', 60)->nullable();
        $t->string('primer_apellido', 60)->nullable();
        $t->string('segundo_apellido', 60)->nullable();
        if ($conFechaYSexo) {
            $t->date('fecha_nacimiento')->nullable();
            $t->char('sexo', 1)->nullable();
        }
        $t->char('entidad_nacimiento', 2)->nullable();
        $t->string('curp_verificacion', 12)->nullable();
        $t->json('curp_problemas')->nullable();
    }

    public function up(): void
    {
        Schema::table('users', fn (Blueprint $t) => $this->columnas($t));
        Schema::table('solicitudes_acceso', fn (Blueprint $t) => $this->columnas($t));
        // club_integrantes ya tiene fecha_nacimiento y sexo (E52).
        Schema::table('club_integrantes', fn (Blueprint $t) => $this->columnas($t, false));

        DB::statement(<<<'SQL'
            DO $$ BEGIN
              IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sicei_app') THEN
                GRANT INSERT (nombres, primer_apellido, segundo_apellido, fecha_nacimiento, sexo, entidad_nacimiento,
                              curp_verificacion, curp_problemas) ON public.users TO sicei_app;
                GRANT UPDATE (nombres, primer_apellido, segundo_apellido, fecha_nacimiento, sexo, entidad_nacimiento,
                              curp_verificacion, curp_problemas) ON public.users TO sicei_app;
              END IF;
            END $$
        SQL);
    }

    public function down(): void
    {
        $todas = ['nombres', 'primer_apellido', 'segundo_apellido', 'fecha_nacimiento', 'sexo', 'entidad_nacimiento', 'curp_verificacion', 'curp_problemas'];
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn($todas));
        Schema::table('solicitudes_acceso', fn (Blueprint $t) => $t->dropColumn($todas));
        Schema::table('club_integrantes', fn (Blueprint $t) => $t->dropColumn(['nombres', 'primer_apellido', 'segundo_apellido', 'entidad_nacimiento', 'curp_verificacion', 'curp_problemas']));
    }
};
