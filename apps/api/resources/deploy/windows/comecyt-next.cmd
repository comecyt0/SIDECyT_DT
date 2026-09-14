@echo off
REM ============================================================================
REM Wrapper para Next.js (Node) como Servicio Windows (NSSM)
REM ----------------------------------------------------------------------------
REM Arranca el frontend en modo producción tras `npm run build`.
REM
REM Registrar:
REM   nssm install ComecytWeb "C:\inetpub\comecyt\web\resources\deploy\windows\comecyt-next.cmd"
REM   nssm set ComecytWeb AppDirectory "C:\inetpub\comecyt\web"
REM   nssm set ComecytWeb Start SERVICE_AUTO_START
REM   nssm start ComecytWeb
REM ============================================================================

cd /d "%~dp0..\..\.."
"C:\Program Files\nodejs\node.exe" node_modules\next\dist\bin\next start --port 3000
