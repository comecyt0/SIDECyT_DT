# =============================================================================
# COMECYT — Emite el certificado Let's Encrypt (win-acme) para producción.
# Correr SOLO cuando:
#   1) comecyt-sistemas.edomex.gob.mx RESUELVA a la IP pública real del server (DNS).
#   2) Puertos 80 y 443 estén abiertos desde Internet.
#   3) Hayas QUITADO la línea temporal del hosts:
#        C:\Windows\System32\drivers\etc\hosts  -> borrar "127.0.0.1 comecyt-sistemas.edomex.gob.mx"
# win-acme instalará el cert en el binding del sitio IIS "comecyt" y creará una
# tarea programada de renovación automática (~cada 60 días).
# =============================================================================
param([string]$Email = '')

$dominio = 'comecyt-sistemas.edomex.gob.mx'

# Verificación rápida de que el dominio ya NO apunta a 127.0.0.1
$resuelve = (Resolve-DnsName $dominio -Type A -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress }).IPAddress
Write-Host "El dominio resuelve a: $resuelve"
if ($resuelve -eq '127.0.0.1' -or -not $resuelve) {
    Write-Warning "El dominio aún resuelve a 127.0.0.1 o no resuelve. Quita la línea del hosts y confirma el DNS público antes de continuar."
    return
}

if (-not $Email) { $Email = Read-Host 'Email para la cuenta ACME (avisos de expiración del cert)' }

& 'C:\tools\win-acme\wacs.exe' --target iis --host $dominio --installation iis --emailaddress $Email --accepttos

Write-Host "`nSi terminó sin errores, el cert ya está en el binding 443 y la renovación quedó programada."
Write-Host "Verifica: https://$dominio/login  (sin -k, debe dar candado válido)"
