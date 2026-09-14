@echo off
REM ============================================================================
REM Wrapper para Laravel Reverb como Servicio Windows (NSSM)
REM ----------------------------------------------------------------------------
REM Cómo registrarlo (PowerShell elevado):
REM   nssm install ComecytReverb "C:\inetpub\comecyt\api\resources\deploy\windows\comecyt-reverb.cmd"
REM   nssm set ComecytReverb AppDirectory "C:\inetpub\comecyt\api"
REM   nssm set ComecytReverb DisplayName "COMECYT - Laravel Reverb (WebSockets)"
REM   nssm set ComecytReverb Description "Demonio Reverb para notificaciones en tiempo real"
REM   nssm set ComecytReverb Start SERVICE_AUTO_START
REM   nssm set ComecytReverb AppStdout "C:\inetpub\comecyt\api\storage\logs\reverb-stdout.log"
REM   nssm set ComecytReverb AppStderr "C:\inetpub\comecyt\api\storage\logs\reverb-stderr.log"
REM   nssm set ComecytReverb AppRotateFiles 1
REM   nssm set ComecytReverb AppRotateBytes 10485760
REM   nssm start ComecytReverb
REM ============================================================================

cd /d "%~dp0..\..\.."
"C:\php\php.exe" artisan reverb:start --host=0.0.0.0 --port=8080
