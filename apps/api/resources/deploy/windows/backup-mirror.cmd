@echo off
REM ============================================================================
REM Backup redundante local: copia espejada de storage/app/backups a otro disco
REM ----------------------------------------------------------------------------
REM Asume que `php artisan comecyt:backup-db` ya generó los .sql.gz diarios en
REM storage/app/backups/. Esto los espeja a un disco/share secundario.
REM
REM CONFIGURAR el destino editando DEST_DIR abajo.
REM
REM Registrar como tarea programada (diario 03:00, después del backup de las 02:00):
REM   schtasks /create /tn "ComecytBackupMirror" /tr "C:\inetpub\comecyt\api\resources\deploy\windows\backup-mirror.cmd" /sc daily /st 03:00 /ru SYSTEM /rl HIGHEST
REM ============================================================================

SET SRC_DIR=C:\inetpub\comecyt\api\storage\app\backups
SET DEST_DIR=D:\backups\comecyt
SET LOG=C:\inetpub\comecyt\api\storage\logs\backup-mirror.log

if not exist "%DEST_DIR%" mkdir "%DEST_DIR%"

REM /MIR = espejo (copia + elimina archivos que ya no existen en origen)
REM /R:1 /W:5 = 1 reintento con 5s de espera (red lenta)
REM /NP = sin progress
REM /NDL /NFL = sin listar archivos/dirs (log conciso)
REM /Z = modo restartable (sigue si se cae la red)
robocopy "%SRC_DIR%" "%DEST_DIR%" /MIR /R:1 /W:5 /NP /NDL /NFL /Z /LOG+:"%LOG%"

REM Robocopy exit codes <=7 son éxito; >=8 son error real
if %ERRORLEVEL% GEQ 8 (
  echo [%date% %time%] ERROR robocopy exit=%ERRORLEVEL% >> "%LOG%"
  exit /b 1
)
echo [%date% %time%] OK robocopy exit=%ERRORLEVEL% >> "%LOG%"
exit /b 0
