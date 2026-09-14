# ============================================================================
# Generador de certificado autofirmado para PRUEBAS LOCALES
# ----------------------------------------------------------------------------
# NO USAR EN PRODUCCIÓN — los navegadores mostrarán warning "no seguro".
# Sirve para validar todo el flujo HTTPS antes de obtener el certificado
# institucional (.pfx) del Estado de México o uno de Let's Encrypt.
#
# Uso (PowerShell elevado):
#   .\generate-selfsigned-cert.ps1 -Domain "dominio.edomex.gob.mx"
#
# Resultado:
#   - Cert importado en LocalMachine\My
#   - Cert exportado a:  C:\inetpub\comecyt\selfsigned.pfx
#   - Password del PFX:  ComecytLocal2026
#
# Después:
#   1. IIS Manager → Sitio "comecyt" → Bindings → Add → https → 443 → seleccionar
#      el cert recién importado (CN=dominio.edomex.gob.mx)
#   2. Descomentar el bloque "Force HTTPS" en web.config
#   3. Restart-Service ComecytApi, Restart-Service ComecytWeb
# ============================================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$Domain = "dominio.edomex.gob.mx",

    [Parameter(Mandatory=$false)]
    [string]$ExportPath = "C:\inetpub\comecyt\selfsigned.pfx",

    [Parameter(Mandatory=$false)]
    [string]$Password = "ComecytLocal2026",

    [Parameter(Mandatory=$false)]
    [int]$ValidDays = 365
)

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "  COMECYT - Cert autofirmado para PRUEBAS LOCALES" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar admin
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: Este script requiere PowerShell elevado (Run as Administrator)" -ForegroundColor Red
    exit 1
}

Write-Host "Dominio:       $Domain"
Write-Host "Exportar a:    $ExportPath"
Write-Host "Válido hasta:  $((Get-Date).AddDays($ValidDays).ToString('yyyy-MM-dd'))"
Write-Host ""

# Crear directorio de export si no existe
$exportDir = Split-Path -Parent $ExportPath
if (-not (Test-Path $exportDir)) {
    New-Item -ItemType Directory -Path $exportDir -Force | Out-Null
}

# Generar certificado autofirmado con SubjectAlternativeName
try {
    Write-Host "[1/3] Generando cert autofirmado..." -ForegroundColor Yellow
    $cert = New-SelfSignedCertificate `
        -DnsName $Domain, "localhost", "127.0.0.1" `
        -CertStoreLocation "cert:\LocalMachine\My" `
        -FriendlyName "COMECYT $Domain (autofirmado)" `
        -NotAfter (Get-Date).AddDays($ValidDays) `
        -KeyExportPolicy Exportable `
        -KeyAlgorithm RSA `
        -KeyLength 2048 `
        -HashAlgorithm SHA256 `
        -KeyUsage DigitalSignature, KeyEncipherment `
        -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.1")  # Server Auth EKU

    Write-Host "      OK — Thumbprint: $($cert.Thumbprint)" -ForegroundColor Green
} catch {
    Write-Host "ERROR generando cert: $_" -ForegroundColor Red
    exit 1
}

# Exportar como PFX (PKCS#12)
try {
    Write-Host "[2/3] Exportando a $ExportPath..." -ForegroundColor Yellow
    $securePwd = ConvertTo-SecureString -String $Password -Force -AsPlainText
    Export-PfxCertificate -Cert "cert:\LocalMachine\My\$($cert.Thumbprint)" -FilePath $ExportPath -Password $securePwd | Out-Null
    Write-Host "      OK" -ForegroundColor Green
} catch {
    Write-Host "ERROR exportando PFX: $_" -ForegroundColor Red
    exit 1
}

# Confiar en el cert localmente (Trusted Root) para evitar el warning del navegador
try {
    Write-Host "[3/3] Agregando a 'Trusted Root Certification Authorities' (LocalMachine)..." -ForegroundColor Yellow
    $rootStore = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "LocalMachine")
    $rootStore.Open("ReadWrite")
    $rootStore.Add($cert)
    $rootStore.Close()
    Write-Host "      OK — los navegadores en este server confiarán en el cert" -ForegroundColor Green
} catch {
    Write-Host "WARNING: no se pudo agregar a Trusted Root. Los navegadores mostrarán warning, pero el cert funcionará." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "  LISTO" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor White
Write-Host "  1. Abre IIS Manager"
Write-Host "  2. Selecciona el sitio 'comecyt' (o el que apunte a $Domain)"
Write-Host "  3. Bindings → Add:"
Write-Host "       Type: https | IP: All Unassigned | Port: 443"
Write-Host "       Host name: $Domain"
Write-Host "       SSL certificate: COMECYT $Domain (autofirmado)"
Write-Host "  4. Edita web.config y descomenta el bloque 'Force HTTPS'"
Write-Host "  5. En .env del backend: COOKIE_SECURE=true"
Write-Host "  6. Reinicia servicios:"
Write-Host "       Restart-Service ComecytApi"
Write-Host "       Restart-Service ComecytWeb"
Write-Host ""
Write-Host "Para REMPLAZAR este cert por el institucional cuando llegue:" -ForegroundColor White
Write-Host "  1. Importa el .pfx institucional en IIS"
Write-Host "  2. En el binding HTTPS del sitio, selecciona el cert nuevo"
Write-Host "  3. (Opcional) elimina el autofirmado:"
Write-Host "       Get-ChildItem cert:\LocalMachine\My | Where-Object Subject -Like '*$Domain*autofirmado*' | Remove-Item"
Write-Host ""
