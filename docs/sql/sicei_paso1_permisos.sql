-- SICEI en comecyt_prod — Paso 1 (permisos sobre public)
-- Ejecutar como comecyt_app (dueno de las tablas de SIGAE), despues de sicei_paso1_superusuario.sql:
--   $env:PGPASSFILE='F:\comecyt\pgpass.conf'
--   C:\pgsql\bin\psql.exe -h 127.0.0.1 -U comecyt_app -d comecyt_prod -f "F:\comecyt\docs\sql\sicei_paso1_permisos.sql"
-- Regla: SIGAE no cambia; SICEI solo lee lo compartido y escribe columnas de identidad/perfil.
-- Sin DELETE: los usuarios se desactivan (users.activo, que administra SIGAE), no se borran.

\set ON_ERROR_STOP on

BEGIN;

GRANT USAGE ON SCHEMA public TO sicei_app;

-- Identidad unica (una CURP = una cuenta)
GRANT SELECT, REFERENCES ON public.users TO sicei_app;
GRANT INSERT (name, email, password, curp, telefono, codigo_postal, municipio, colonia,
              avatar_path, email_verified_at, remember_token, ultimo_acceso,
              password_changed_at, terminos_aceptados_at, created_at, updated_at)
    ON public.users TO sicei_app;
GRANT UPDATE (name, email, password, curp, telefono, codigo_postal, municipio, colonia,
              avatar_path, email_verified_at, remember_token, ultimo_acceso,
              password_changed_at, terminos_aceptados_at, updated_at)
    ON public.users TO sicei_app;
GRANT USAGE ON SEQUENCE public.users_id_seq TO sicei_app;

-- Catalogos compartidos (solo lectura)
GRANT SELECT, REFERENCES ON public.municipios,
                            public.areas_conocimiento,
                            public.codigos_postales,
                            public.escuelas,
                            public.programas_publicos
    TO sicei_app;

COMMIT;

\echo 'Permisos de sicei_app sobre public aplicados.'
