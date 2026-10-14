<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * 14/10/2026 (E72, paso 5) — Panel de evaluador compartido con SICEI (/evaluador). Solo agrega.
 * Decisiones del usuario: docs/SICEI_BD_COMPARTIDA.md §6.4.
 *  - asignaciones_evaluador: cuándo concluyó, control de los avisos de fecha límite y los conflictos que el admin
 *    aceptó al asignar.
 *  - bloqueos_conflicto: el admin ve un conflicto y decide NO asignar: bloquea a la persona para esa solicitud o para
 *    toda la convocatoria.
 *  - Vista public.v_dictamenes_sigae: a qué solicitante (cuenta y empresa) evaluó cada persona en SIGAE, para que SICEI
 *    detecte «ya evaluó antes» sin leer las tablas. SELECT solo a sicei_app.
 *  - tipo_programas.puntaje_minimo_aprobatorio se interpreta desde hoy como PORCENTAJE del máximo de la rúbrica
 *    (antes 80 puntos fijos aunque la rúbrica no sumara 100). No cambia la columna.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('asignaciones_evaluador', function (Blueprint $t) {
            $t->timestamp('concluida_at')->nullable();
            $t->timestamp('aviso_previo_at')->nullable();
            $t->timestamp('aviso_vence_at')->nullable();
            $t->json('conflictos_aceptados')->nullable();
        });

        Schema::create('bloqueos_conflicto', function (Blueprint $t) {
            $t->id();
            $t->foreignId('evaluador_id')->constrained('users')->cascadeOnDelete();
            $t->foreignId('convocatoria_id')->constrained('convocatorias')->cascadeOnDelete();
            $t->foreignId('solicitud_id')->nullable()->constrained('solicitudes')->cascadeOnDelete(); // null = toda la convocatoria
            $t->string('motivo', 500);
            $t->foreignId('bloqueado_por')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('created_at')->useCurrent();
            $t->index(['evaluador_id', 'convocatoria_id']);
        });

        DB::statement(<<<'SQL'
            CREATE VIEW public.v_dictamenes_sigae WITH (security_barrier = true) AS
            SELECT a.evaluador_id,
                   s.user_id     AS solicitante_id,
                   s.empresa_id  AS empresa_id,
                   s.convocatoria_id,
                   'sigae'::text AS sistema,
                   d.created_at  AS dictaminado_at
              FROM public.dictamenes d
              JOIN public.asignaciones_evaluador a ON a.id = d.asignacion_id
              JOIN public.solicitudes s ON s.id = a.solicitud_id
        SQL);

        DB::statement(<<<'SQL'
            DO $$ BEGIN
              IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sicei_app') THEN
                GRANT SELECT ON public.v_dictamenes_sigae TO sicei_app;
              END IF;
            END $$
        SQL);
    }

    public function down(): void
    {
        DB::statement('DROP VIEW IF EXISTS public.v_dictamenes_sigae');
        Schema::dropIfExists('bloqueos_conflicto');
        Schema::table('asignaciones_evaluador', fn (Blueprint $t) => $t->dropColumn([
            'concluida_at', 'aviso_previo_at', 'aviso_vence_at', 'conflictos_aceptados',
        ]));
    }
};
