-- SICEI en comecyt_prod — Paso 3 (permisos sobre catálogos compartidos)
-- Decisión del usuario (14/10/2026): el admin de SICEI agrega, edita e importa municipios y áreas de conocimiento,
-- pero NO borra (solo desactiva). Ejecutar como comecyt_app (dueño de las tablas):
--   $env:PGPASSFILE='F:\comecyt\pgpass.conf'
--   C:\pgsql\bin\psql.exe -h 127.0.0.1 -U comecyt_app -d comecyt_prod -f "F:\comecyt\docs\sql\sicei_paso3_permisos.sql"

\set ON_ERROR_STOP on

BEGIN;

GRANT INSERT (nombre, estado, codigo_postal, activo, cvegeo, created_at, updated_at),
      UPDATE (nombre, activo, cvegeo, updated_at)
    ON public.municipios TO sicei_app;
GRANT INSERT (nombre, descripcion, activo, clave, created_at, updated_at),
      UPDATE (nombre, activo, clave, updated_at)
    ON public.areas_conocimiento TO sicei_app;
GRANT USAGE ON SEQUENCE public.municipios_id_seq, public.areas_conocimiento_id_seq TO sicei_app;

COMMIT;

\echo 'Permisos de catálogos para sicei_app aplicados (sin DELETE).'
