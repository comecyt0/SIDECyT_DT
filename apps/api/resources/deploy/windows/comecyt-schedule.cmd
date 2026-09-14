@echo off
REM ============================================================================
REM Laravel Scheduler — equivalente a `* * * * * php artisan schedule:run` en Linux
REM ----------------------------------------------------------------------------
REM En Windows usamos el Task Scheduler con trigger cada minuto:
REM
REM   schtasks /create /tn "ComecytSchedule" /tr "C:\inetpub\comecyt\api\resources\deploy\windows\comecyt-schedule.cmd" /sc minute /mo 1 /ru SYSTEM /rl HIGHEST
REM
REM Para ver el estado:
REM   schtasks /query /tn "ComecytSchedule"
REM Para eliminarlo:
REM   schtasks /delete /tn "ComecytSchedule" /f
REM ============================================================================

cd /d "%~dp0..\..\.."
"C:\php\php.exe" artisan schedule:run >> "storage\logs\schedule.log" 2>&1
