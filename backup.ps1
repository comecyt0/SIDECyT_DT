$ErrorActionPreference = 'Continue'
# Backup diario de la BD COMECYT (PostgreSQL 18, formato custom -Fc)
$env:PGPASSFILE = 'F:\Desarrollo Tecnologico\pgpass.conf'
$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$backupDir = 'F:\Desarrollo Tecnologico\backups'
if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir -Force | Out-Null }
$out = "$backupDir\comecyt_$stamp.dump"
# Rol 'respaldo' (pg_read_all_data): cubre public (SIGAE) y sicei (SICEI), E72
& 'C:\pgsql\bin\pg_dump.exe' -h 127.0.0.1 -U respaldo -Fc comecyt_prod -f $out
# Retencion: conservar 14 dias
Get-ChildItem "$backupDir\*.dump" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-14) } | Remove-Item -Force
