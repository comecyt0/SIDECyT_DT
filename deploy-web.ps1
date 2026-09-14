# Publica el front (Next.js standalone) en producción siguiendo E20 de CLAUDE.md:
# detener comecyt-web, respaldar .next, compilar, copiar static/public, iniciar y verificar.
# Si el build falla, restaura el respaldo y vuelve a levantar el servicio.
#
# Uso (PowerShell como Administrador):
#   & "F:\Desarrollo Tecnologico\deploy-web.ps1" -Motivo acceso
param(
    [string]$Motivo = 'deploy'
)

$ErrorActionPreference = 'Continue'
$web = 'F:\Desarrollo Tecnologico\apps\web'
$fecha = Get-Date -Format 'yyyyMMdd'
$log = "F:\Desarrollo Tecnologico\logs\deploy-$Motivo-$fecha.log"
$bak = ".next.bak-$fecha-pre$Motivo"

function L($m) { "$(Get-Date -Format 'HH:mm:ss') $m" | Tee-Object -FilePath $log -Append }

Set-Location $web
L "Deteniendo comecyt-web"
Stop-Service comecyt-web -Force
L "Respaldando .next en $bak"
robocopy .next $bak /E /NFL /NDL /NJH /NJS /NP | Out-Null
L "respaldo exit=$LASTEXITCODE (menor a 8 = correcto)"

L "npm run build (salida completa en $log)"
npm run build *>> $log
$buildExit = $LASTEXITCODE
L "build exit=$buildExit"

if ($buildExit -eq 0 -and (Test-Path '.next\standalone\server.js')) {
    robocopy '.next\static' '.next\standalone\.next\static' /E /NFL /NDL /NJH /NJS /NP | Out-Null
    L "copia static exit=$LASTEXITCODE"
    robocopy 'public' '.next\standalone\public' /E /NFL /NDL /NJH /NJS /NP | Out-Null
    L "copia public exit=$LASTEXITCODE"
} else {
    L "BUILD FALLIDO: restaurando $bak"
    robocopy $bak .next /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
    L "restauracion exit=$LASTEXITCODE"
}

Start-Service comecyt-web
Start-Sleep -Seconds 8
L "comecyt-web: $((Get-Service comecyt-web).Status)"
L "https://10.250.36.241/login -> $(curl.exe -sk -o NUL -w '%{http_code}' https://10.250.36.241/login)"
L "FIN"
