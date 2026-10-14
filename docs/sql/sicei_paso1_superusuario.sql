-- SICEI en comecyt_prod — Paso 1 (parte superusuario)
-- Ejecutar UNA vez, como postgres, desde una PowerShell propia (pide contrasenas):
--   C:\pgsql\bin\psql.exe -h 127.0.0.1 -U postgres -d comecyt_prod -f "F:\comecyt\docs\sql\sicei_paso1_superusuario.sql"
-- No contiene contrasenas: \password las pide en la terminal y viajan ya cifradas (SCRAM).

\set ON_ERROR_STOP on

-- Rol de la app SICEI: minimo privilegio, sin herencia de otros roles.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sicei_app') THEN
        CREATE ROLE sicei_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION CONNECTION LIMIT 30;
    END IF;
END $$;

-- Rol de respaldo: solo lectura de toda la base (public + sicei) para pg_dump.
-- Necesita INHERIT para recibir los privilegios de pg_read_all_data.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'respaldo') THEN
        CREATE ROLE respaldo LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT NOREPLICATION CONNECTION LIMIT 2;
    END IF;
END $$;
GRANT pg_read_all_data TO respaldo;

-- Esquema propio de SICEI; SIGAE (comecyt_app) no recibe acceso.
CREATE SCHEMA IF NOT EXISTS sicei AUTHORIZATION sicei_app;
REVOKE ALL ON SCHEMA sicei FROM PUBLIC;
ALTER ROLE sicei_app IN DATABASE comecyt_prod SET search_path = sicei, public;

-- SICEI nunca crea objetos en public (lo de public es de SIGAE).
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM sicei_app;

\echo
\echo 'Escribe la contrasena para sicei_app (guardala; ira en C:\SICEI\api\.env como DB_PASSWORD):'
\password sicei_app
\echo 'Escribe la contrasena para respaldo (ira en F:\comecyt\pgpass.conf):'
\password respaldo

\echo 'Listo: roles sicei_app y respaldo, esquema sicei.'
