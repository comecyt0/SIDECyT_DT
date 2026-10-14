<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * 14/10/2026 (E72, paso 2) — Cruce de registros entre SIGAE y SICEI (docs/SICEI_BD_COMPARTIDA.md).
 * Solo agrega:
 *  - users.puede_ver_cruce: casilla por usuario que el admin activa para que el rol Consulta vea el cruce (los admins,
 *    los revisores y la propia persona lo ven sin casilla; los evaluadores nunca). Fuera de $fillable.
 *  - Vista public.v_participaciones_sigae: lista blanca de en qué convocatoria participa cada cuenta en SIGAE
 *    (solicitudes y clubes, con su papel). SICEI (rol sicei_app) solo puede leer esta vista, nunca las tablas.
 *    security_barrier evita que un filtro del lector vea filas o columnas fuera de la lista blanca.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->boolean('puede_ver_cruce')->default(false);
        });

        DB::statement(<<<'SQL'
            CREATE VIEW public.v_participaciones_sigae WITH (security_barrier = true) AS
            SELECT s.user_id,
                   'sigae'::text            AS sistema,
                   'solicitud'::text        AS tipo,
                   'solicitante'::text      AS papel,
                   s.id                     AS registro_id,
                   s.folio::text            AS folio,
                   c.id                     AS convocatoria_id,
                   c.nombre::text           AS convocatoria,
                   c.nombre_corto::text     AS convocatoria_corto,
                   s.estado::text           AS estado,
                   s.created_at             AS registrado_at
              FROM public.solicitudes s
              JOIN public.convocatorias c ON c.id = s.convocatoria_id
             WHERE s.deleted_at IS NULL AND c.deleted_at IS NULL
            UNION ALL
            SELECT cl.lider_id,
                   'sigae', 'club',
                   CASE WHEN cl.dueno_director THEN 'director' ELSE 'lider_a' END,
                   cl.id, cl.folio::text, c.id, c.nombre::text, c.nombre_corto::text, cl.estado::text, cl.created_at
              FROM public.clubes cl
              JOIN public.convocatorias c ON c.id = cl.convocatoria_id
             WHERE c.deleted_at IS NULL
            UNION ALL
            SELECT a.user_id,
                   'sigae', 'club', a.tipo::text,
                   cl.id, cl.folio::text, c.id, c.nombre::text, c.nombre_corto::text, cl.estado::text, a.created_at
              FROM public.club_accesos a
              JOIN public.clubes cl ON cl.id = a.club_id
              JOIN public.convocatorias c ON c.id = cl.convocatoria_id
             WHERE c.deleted_at IS NULL
        SQL);

        // El rol de SICEI solo existe en el servidor (paso 1); en desarrollo/pruebas no se otorga nada.
        DB::statement(<<<'SQL'
            DO $$ BEGIN
              IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sicei_app') THEN
                GRANT SELECT ON public.v_participaciones_sigae TO sicei_app;
              END IF;
            END $$
        SQL);
    }

    public function down(): void
    {
        DB::statement('DROP VIEW IF EXISTS public.v_participaciones_sigae');
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn('puede_ver_cruce'));
    }
};
