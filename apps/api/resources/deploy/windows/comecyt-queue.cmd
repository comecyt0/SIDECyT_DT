@echo off
REM ============================================================================
REM Wrapper para Queue Worker como Servicio Windows (NSSM)
REM ----------------------------------------------------------------------------
REM Procesa los jobs encolados (notificaciones, broadcasting, etc.)
REM Registrar:
REM   nssm install ComecytQueue "C:\inetpub\comecyt\api\resources\deploy\windows\comecyt-queue.cmd"
REM   nssm set ComecytQueue AppDirectory "C:\inetpub\comecyt\api"
REM   nssm set ComecytQueue Start SERVICE_AUTO_START
REM   nssm start ComecytQueue
REM ============================================================================

cd /d "%~dp0..\..\.."
"C:\php\php.exe" artisan queue:work --tries=3 --timeout=120 --sleep=3
