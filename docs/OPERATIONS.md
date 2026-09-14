# Guía Operacional COMECYT — Manual para Administrador TIC

**Sistema:** COMECYT (Consejo Mexiquense de Ciencia y Tecnología)
**Versión del documento:** 1.1 — 11 de septiembre de 2026 (1.0 — junio 2026)
**Entorno:** Windows Server 2022 + IIS 10 + PHP 8.4 FastCGI + PostgreSQL 18.3
**Ruta raíz:** `F:\Desarrollo Tecnologico\` (accesible también como `F:\comecyt`)
**URL producción:** `https://sidecyt-comecyt.edomex.gob.mx/`, detrás del balanceador de infraestructura ([DOMINIO_BALANCEADOR.md](DOMINIO_BALANCEADOR.md))
**URL VPN interna:** `https://10.250.36.241/` (certificado autofirmado)

> **Cambios de la versión 1.1:**
> - **Dominio:** el definitivo es `sidecyt-comecyt.edomex.gob.mx`; `comecyt-sistemas.edomex.gob.mx` se descartó el 31/07/2026.
> - **HTTPS:** el público lo termina el balanceador, así que se reescribieron las secciones 6 (certificados) y 9 (dominio).
> - **Chequeos:** usan `curl.exe`, porque `http://10.250.36.241` ya redirige a HTTPS y los scripts con `WebClient` fallaban.
> - **Licencia:** Windows Server Evaluation con 7 días al 11/09/2026 (ver [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md)).

---

## Tabla de Contenidos

1. [Monitoreo diario](#1-monitoreo-diario)
2. [Gestión de servicios NSSM](#2-gestión-de-servicios-nssm)
3. [Backups](#3-backups)
4. [Actualización del código](#4-actualización-del-código)
5. [Gestión de usuarios](#5-gestión-de-usuarios)
6. [Certificados y HTTPS](#6-certificados-y-https)
7. [Troubleshooting común](#7-troubleshooting-común)
8. [Comandos de Artisan útiles](#8-comandos-de-artisan-útiles)
9. [Dominio de producción y balanceador](#9-dominio-de-producción-y-balanceador)
10. [Smoke test rápido post-mantenimiento](#10-smoke-test-rápido-post-mantenimiento)

---

## 1. Monitoreo Diario

### 1.1 Verificar estado de los servicios

Ejecutar al iniciar el turno o después de cualquier mantenimiento:

```powershell
# Estado de los 4 servicios NSSM del sistema
Get-Service comecyt-web, comecyt-reverb, comecyt-queue, comecyt-scheduler |
    Select-Object Name, Status, StartType |
    Format-Table -AutoSize

# Estado del servidor web IIS
Get-Service W3SVC | Select-Object Name, Status

# Estado de la base de datos PostgreSQL
Get-Service postgresql-18 | Select-Object Name, Status
```

**Resultado esperado (todo en verde):**

| Name                | Status  | StartType |
|---------------------|---------|-----------|
| comecyt-web         | Running | Automatic |
| comecyt-reverb      | Running | Automatic |
| comecyt-queue       | Running | Automatic |
| comecyt-scheduler   | Running | Automatic |
| W3SVC               | Running | Automatic |
| postgresql-18       | Running | Automatic |

### 1.2 Health check de las URLs principales

```powershell
# curl.exe viene con Windows. -k acepta el certificado autofirmado de la IP.
# El dominio se prueba de verdad: desde este servidor resuelve al balanceador y sale por él.
$d = 'sidecyt-comecyt.edomex.gob.mx'
foreach ($url in "https://$d/up", "https://$d/login", "https://$d/api/carousel/slides",
                 'https://10.250.36.241/up', 'https://10.250.36.241/login') {
    $code = curl.exe -sk -o NUL -w '%{http_code}' --max-time 20 $url
    $color = if ($code -eq '200') { 'Green' } else { 'Red' }
    Write-Host ("  [{0}] {1}" -f $code, $url) -ForegroundColor $color
}
```

Resultado esperado: `200` en todas. Para la revisión completa del dominio (redirecciones, certificado
del balanceador, WebSocket, envenenamiento de caché):

```powershell
& "C:\Users\Administrator\Desktop\ADEM\_herramientas\VerificarDominio.ps1"   # exit 0 = todo bien
```

### 1.3 Lectura de logs

#### Logs de aplicación Laravel (errores PHP, excepciones, emails)

```powershell
# Ver las últimas 50 líneas del log de hoy
$logHoy = "F:\Desarrollo Tecnologico\apps\api\storage\logs\laravel-$(Get-Date -Format 'yyyy-MM-dd').log"
Get-Content $logHoy -Tail 50

# Filtrar solo líneas de ERROR o CRITICAL (ignorar INFO y DEBUG)
Get-Content $logHoy | Where-Object { $_ -match '\.(ERROR|CRITICAL|ALERT|EMERGENCY)' }

# Ver todos los logs disponibles (por fecha)
Get-ChildItem "F:\Desarrollo Tecnologico\apps\api\storage\logs\" -Filter "laravel-*.log" |
    Sort-Object LastWriteTime -Descending | Select-Object Name, LastWriteTime, Length
```

#### Logs del sistema (servicios NSSM)

```powershell
# Logs del servicio frontend (comecyt-web)
Get-Content "F:\Desarrollo Tecnologico\logs\comecyt-web-stdout.log" -Tail 30
Get-Content "F:\Desarrollo Tecnologico\logs\comecyt-web-stderr.log" -Tail 30

# Logs del scheduler de convocatorias
Get-Content "F:\Desarrollo Tecnologico\logs\comecyt-scheduler-stdout.log" -Tail 30

# Logs del procesador de colas (emails, notificaciones)
Get-Content "F:\Desarrollo Tecnologico\logs\comecyt-queue-stdout.log" -Tail 30

# Logs de WebSockets (Reverb)
Get-Content "F:\Desarrollo Tecnologico\logs\comecyt-reverb-stdout.log" -Tail 30
```

#### Logs de IIS (errores HTTP)

```powershell
# Logs de IIS — ubicación estándar (ajustar ID del sitio si es necesario)
$iisLog = "C:\inetpub\logs\LogFiles\W3SVC1\"
Get-ChildItem $iisLog | Sort-Object LastWriteTime -Descending | Select-Object -First 1 |
    ForEach-Object { Get-Content $_.FullName -Tail 40 }
```

### 1.4 Normal vs. Error

| Tipo de entrada en log | ¿Es normal? | Acción |
|------------------------|-------------|--------|
| `[INFO] ... Closing expired convocatorias` | Normal | Ninguna — el scheduler corre cada hora |
| `[INFO] ... Job processed` | Normal | Los emails/notificaciones se procesan correctamente |
| `[INFO] ... User logged in` | Normal | Actividad de usuarios |
| `[WARNING] ... Throttle exceeded` | Normal ocasional | Alguien intentó login varias veces |
| `[ERROR] ... SQLSTATE` | Requiere atención | Ver sección 7 — problema de BD |
| `[ERROR] ... Connection refused` | Urgente | Servicio o BD caído |
| `[CRITICAL] ...` | Urgente | Revisar inmediatamente, el sistema puede estar degradado |
| `[ERROR] ... Swift_TransportException` | No urgente | SMTP no configurado (comportamiento esperado en esta etapa) |

---

## 2. Gestión de Servicios NSSM

Los 4 servicios del sistema son administrados por **NSSM** (Non-Sucking Service Manager), ubicado en `C:\tools\bin\nssm.exe`.

### 2.1 Descripción de cada servicio

| Servicio | Proceso | Función |
|----------|---------|---------|
| `comecyt-web` | `node.exe` + Next.js | Sirve el frontend en el puerto 3000 |
| `comecyt-queue` | `php.exe artisan queue:work` | Procesa emails y notificaciones en background |
| `comecyt-scheduler` | `php.exe artisan schedule:work` | Cierre automático de convocatorias vencidas (hourly) |
| `comecyt-reverb` | `php.exe artisan reverb:start` | Servidor WebSocket para notificaciones en tiempo real |

### 2.2 Comandos Start / Stop / Restart individuales

```powershell
# ── Iniciar servicios ──────────────────────────────────────────────────────
Start-Service comecyt-web
Start-Service comecyt-queue
Start-Service comecyt-scheduler
Start-Service comecyt-reverb

# ── Detener servicios ──────────────────────────────────────────────────────
Stop-Service comecyt-web     -Force
Stop-Service comecyt-queue   -Force
Stop-Service comecyt-scheduler -Force
Stop-Service comecyt-reverb  -Force

# ── Reiniciar servicios individualmente ───────────────────────────────────
Restart-Service comecyt-web
Restart-Service comecyt-queue
Restart-Service comecyt-scheduler
Restart-Service comecyt-reverb

# ── Ver estado detallado con NSSM ─────────────────────────────────────────
& 'C:\tools\bin\nssm.exe' status comecyt-web
& 'C:\tools\bin\nssm.exe' status comecyt-queue
& 'C:\tools\bin\nssm.exe' status comecyt-scheduler
& 'C:\tools\bin\nssm.exe' status comecyt-reverb
```

### 2.3 Reinicio completo del stack

Usar cuando se realizó un deploy o cuando el sistema no responde:

```powershell
Write-Host "Deteniendo servicios COMECYT..." -ForegroundColor Yellow
Stop-Service comecyt-web, comecyt-reverb, comecyt-queue, comecyt-scheduler -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 5

Write-Host "Reiniciando IIS..." -ForegroundColor Yellow
iisreset /noforce
Start-Sleep -Seconds 5

Write-Host "Iniciando servicios COMECYT..." -ForegroundColor Yellow
Start-Service comecyt-queue
Start-Service comecyt-scheduler
Start-Service comecyt-reverb
Start-Sleep -Seconds 3
Start-Service comecyt-web
Start-Sleep -Seconds 5

Write-Host "Estado final:" -ForegroundColor Cyan
Get-Service comecyt-web, comecyt-reverb, comecyt-queue, comecyt-scheduler, W3SVC |
    Select-Object Name, Status | Format-Table -AutoSize
```

### 2.4 Editar configuración de un servicio con NSSM GUI

1. Abrir PowerShell como Administrador.
2. Ejecutar: `& 'C:\tools\bin\nssm.exe' edit comecyt-web` (o el nombre del servicio a editar).
3. Se abre la interfaz gráfica de NSSM.
4. En la pestaña **Application**: se puede cambiar el ejecutable, los argumentos o el directorio de trabajo.
5. En la pestaña **I/O**: se configuran los archivos de log (stdout/stderr).
6. En la pestaña **Environment**: se pueden agregar variables de entorno específicas del servicio.
7. Hacer clic en **Edit service** para guardar.
8. Reiniciar el servicio para que los cambios tomen efecto: `Restart-Service comecyt-web`.

**Configuraciones actuales (referencia):**

| Servicio | Ejecutable | Argumentos | Directorio |
|----------|-----------|-----------|-----------|
| comecyt-web | `C:\Program Files\nodejs\node.exe` | `node_modules\.bin\next start` | `F:\Desarrollo Tecnologico\apps\web` |
| comecyt-queue | `C:\php\php.exe` | `artisan queue:work --sleep=3 --tries=3` | `F:\Desarrollo Tecnologico\apps\api` |
| comecyt-scheduler | `C:\php\php.exe` | `artisan schedule:work` | `F:\Desarrollo Tecnologico\apps\api` |
| comecyt-reverb | `C:\php\php.exe` | `artisan reverb:start` | `F:\Desarrollo Tecnologico\apps\api` |

### 2.5 Smoke test post-reinicio

```powershell
# Esperar 10 segundos a que los servicios inicien completamente
Start-Sleep -Seconds 10

Write-Host "=== Smoke test post-reinicio ===" -ForegroundColor Cyan
Get-Service comecyt-web, comecyt-queue, comecyt-scheduler, comecyt-reverb |
    ForEach-Object {
        $color = if ($_.Status -eq 'Running') { 'Green' } else { 'Red' }
        Write-Host "  $($_.Name): $($_.Status)" -ForegroundColor $color
    }

foreach ($url in 'https://sidecyt-comecyt.edomex.gob.mx/up', 'https://sidecyt-comecyt.edomex.gob.mx/login', 'https://10.250.36.241/login') {
    $code = curl.exe -sk -o NUL -w '%{http_code}' --max-time 20 $url
    Write-Host "  $url : $code" -ForegroundColor $(if ($code -eq '200') { 'Green' } else { 'Red' })
}
```

---

## 3. Backups

> **Estado verificado el 11/09/2026:**
> - **Respaldo que funciona:** la tarea de Windows `COMECYT-Backup-Diario` (`backup.ps1`). El último dump se lee completo y la retención es de 14 días.
> - **Respaldo que falla:** el de Laravel (`comecyt:backup-db`, programado en `routes/console.php`) falla todas las noches porque busca `pg_dump` y `gzip` en el PATH. Por eso el log de Laravel muestra `Backup DB falló` a diario; no afecta al respaldo de Windows.
> - **Sin copia externa:** los dumps no se copian fuera del servidor.
>
> Pendientes en [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md).

### 3.1 Backup automático diario

El sistema realiza un backup automático de la base de datos **todos los días a las 02:00 AM** mediante la tarea programada de Windows o el scheduler de Laravel. Los dumps se guardan en:

```
F:\Desarrollo Tecnologico\backups\
```

Política de retención: **14 días** (los archivos más antiguos se eliminan automáticamente).

### 3.2 Verificar que el backup diario corrió

```powershell
# Listar backups existentes, ordenados por fecha (el más reciente primero)
Get-ChildItem "F:\Desarrollo Tecnologico\backups\" -Filter "*.sql*" |
    Sort-Object LastWriteTime -Descending |
    Select-Object Name, LastWriteTime, @{N='Tamaño MB';E={[math]::Round($_.Length/1MB,2)}} |
    Format-Table -AutoSize

# Verificar que el backup de HOY existe
$backupHoy = Get-ChildItem "F:\Desarrollo Tecnologico\backups\" |
    Where-Object { $_.LastWriteTime -gt (Get-Date).Date }
if ($backupHoy) {
    Write-Host "Backup de hoy encontrado: $($backupHoy.Name)" -ForegroundColor Green
} else {
    Write-Host "ADVERTENCIA: No se encontró backup de hoy. Verificar tarea programada." -ForegroundColor Red
}
```

**Señal de alerta:** Si el archivo más reciente tiene más de 25 horas, el backup falló. Hacer backup manual inmediatamente.

### 3.3 Backup manual inmediato

Ejecutar cuando se va a realizar un deploy, actualización de BD, o ante cualquier duda:

```powershell
# Ejecutar el script de backup del sistema
& 'F:\Desarrollo Tecnologico\backup.ps1'

# — O bien, hacer un dump manual de PostgreSQL —
$fecha = Get-Date -Format 'yyyy-MM-dd_HH-mm'
$destino = "F:\Desarrollo Tecnologico\backups\manual_comecyt_$fecha.sql"
$env:PGPASSWORD = 'CONTRASEÑA_DE_PRODUCCIÓN'   # Ver .env del servidor
& 'C:\pgsql\bin\pg_dump.exe' `
    --host=localhost `
    --port=5432 `
    --username=comecyt_user `
    --dbname=comecyt_prod `
    --file=$destino `
    --verbose

Write-Host "Backup guardado en: $destino" -ForegroundColor Green
Remove-Item Env:PGPASSWORD
```

> La contraseña de la base de datos está en `F:\Desarrollo Tecnologico\apps\api\.env` (campo `DB_PASSWORD`).

### 3.4 Restaurar desde un dump de PostgreSQL

> **PRECAUCIÓN:** La restauración sobreescribe la base de datos existente. Hacer backup previo siempre.

```powershell
# 1. Backup de seguridad antes de restaurar
$fechaSeguridad = Get-Date -Format 'yyyy-MM-dd_HH-mm'
$env:PGPASSWORD = 'CONTRASEÑA_DE_PRODUCCIÓN'
& 'C:\pgsql\bin\pg_dump.exe' --host=localhost --port=5432 --username=comecyt_user `
    --dbname=comecyt_prod `
    --file="F:\Desarrollo Tecnologico\backups\pre-restore_$fechaSeguridad.sql"

# 2. Detener servicios que usan la BD
Stop-Service comecyt-queue, comecyt-scheduler, comecyt-reverb, comecyt-web -Force
Start-Sleep -Seconds 5

# 3. Terminar conexiones activas a la BD
& 'C:\pgsql\bin\psql.exe' -U comecyt_user -d postgres -c `
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='comecyt_prod' AND pid <> pg_backend_pid();"

# 4. Restaurar el dump (reemplazar con la ruta del dump elegido)
$dumpRestaurar = "F:\Desarrollo Tecnologico\backups\comecyt_2026-06-29_02-00.sql"
& 'C:\pgsql\bin\psql.exe' `
    --host=localhost `
    --port=5432 `
    --username=comecyt_user `
    --dbname=comecyt_prod `
    --file=$dumpRestaurar

Remove-Item Env:PGPASSWORD

# 5. Reiniciar servicios
Start-Service comecyt-queue, comecyt-scheduler, comecyt-reverb, comecyt-web
Write-Host "Restauración completada. Verificar funcionamiento." -ForegroundColor Green
```

### 3.5 Política de retención y ubicación

| Parámetro | Valor |
|-----------|-------|
| Directorio | `F:\Desarrollo Tecnologico\backups\` |
| Frecuencia automática | Diaria a las 02:00 AM |
| Retención | 14 días |
| Formato de nombre | `comecyt_YYYY-MM-DD_HH-mm.sql` |
| Formato manuales | `manual_comecyt_YYYY-MM-DD_HH-mm.sql` |

---

## 4. Actualización del Código

### Método A — Clon temporal + Robocopy (recomendado)

> **REGLA DE ORO:** NUNCA sobreescribir `.env`, `.env.local`, `storage\`, `bootstrap\cache\`, `vendor\`, `node_modules\`, `.next\`. Estos archivos contienen la configuración de producción y datos del servidor.

```powershell
# ═══════════════════════════════════════════════════════════════════════════
# PASO 0 — Abrir PowerShell como Administrador antes de continuar
# ═══════════════════════════════════════════════════════════════════════════

# PASO 1 — Backup previo SIEMPRE (obligatorio)
Write-Host "Paso 1: Realizando backup previo..." -ForegroundColor Yellow
& 'F:\Desarrollo Tecnologico\backup.ps1'

# PASO 2 — Clonar nueva versión en carpeta temporal
Write-Host "Paso 2: Clonando código fuente actualizado..." -ForegroundColor Yellow
$t = 'C:\tools\_dl\update'
if (Test-Path $t) { Remove-Item $t -Recurse -Force }
& 'C:\tools\git\cmd\git.exe' clone --depth 1 `
    https://github.com/comecyt0/Desarrollo-Tecnol-gico.git $t

# PASO 3 — Copiar SOLO código fuente (excluye configuración y dependencias)
Write-Host "Paso 3: Copiando código fuente con robocopy..." -ForegroundColor Yellow

# Backend Laravel
robocopy "$t\apps\api" "F:\Desarrollo Tecnologico\apps\api" /E `
    /XD vendor storage "bootstrap\cache" `
    /XF .env `
    /LOG:"F:\Desarrollo Tecnologico\logs\robocopy-api-$(Get-Date -Format 'yyyyMMdd-HHmm').log"

# Frontend Next.js
robocopy "$t\apps\web" "F:\Desarrollo Tecnologico\apps\web" /E `
    /XD node_modules .next `
    /XF .env.local `
    /LOG:"F:\Desarrollo Tecnologico\logs\robocopy-web-$(Get-Date -Format 'yyyyMMdd-HHmm').log"

Write-Host "  Robocopy completado. Revisar logs si hay errores." -ForegroundColor Cyan

# PASO 4 — Actualizar dependencias PHP + ejecutar migraciones
Write-Host "Paso 4: Actualizando dependencias PHP y migrando BD..." -ForegroundColor Yellow
Set-Location "F:\Desarrollo Tecnologico\apps\api"
& 'C:\php\php.exe' 'C:\tools\composer\composer.phar' install --no-dev --optimize-autoloader
& 'C:\php\php.exe' artisan migrate --force
& 'C:\php\php.exe' artisan config:clear
& 'C:\php\php.exe' artisan config:cache
& 'C:\php\php.exe' artisan route:clear
& 'C:\php\php.exe' artisan route:cache
& 'C:\php\php.exe' artisan view:clear

# PASO 5 — Rebuild del frontend Next.js
Write-Host "Paso 5: Construyendo frontend Next.js (puede tardar 3-5 minutos)..." -ForegroundColor Yellow
Set-Location "F:\Desarrollo Tecnologico\apps\web"
& 'C:\Program Files\nodejs\npm.cmd' install --legacy-peer-deps
& 'C:\Program Files\nodejs\npm.cmd' run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: El build de Next.js falló. NO reiniciar servicios." -ForegroundColor Red
    Write-Host "Revisar errores arriba. El sistema anterior sigue funcionando." -ForegroundColor Yellow
    exit 1
}

# PASO 6 — Reiniciar servicios
Write-Host "Paso 6: Reiniciando servicios..." -ForegroundColor Yellow
Stop-Service comecyt-web, comecyt-reverb, comecyt-queue, comecyt-scheduler -Force
Start-Sleep -Seconds 5
Start-Service comecyt-queue, comecyt-scheduler, comecyt-reverb
Start-Sleep -Seconds 3
Start-Service comecyt-web
iisreset /noforce

# PASO 7 — Verificar que todo esté en pie
Start-Sleep -Seconds 10
Write-Host "=== Verificación post-deploy ===" -ForegroundColor Cyan
Get-Service comecyt-web, comecyt-queue, comecyt-scheduler, comecyt-reverb |
    Select-Object Name, Status | Format-Table -AutoSize
```

### Archivos que NUNCA deben sobreescribirse

| Archivo | Motivo |
|---------|--------|
| `apps\api\.env` | Contiene contraseñas de BD, JWT secret, claves SMTP |
| `apps\web\.env.local` | URL de la API, claves de Reverb |
| `apps\api\storage\` | Archivos subidos por usuarios (documentos PDF, imágenes) |
| `apps\api\bootstrap\cache\` | Caché compilada — se regenera con artisan |
| `apps\api\vendor\` | Dependencias PHP — se regenera con composer |
| `apps\web\node_modules\` | Dependencias Node — se regenera con npm install |
| `apps\web\.next\` | Build compilado — se regenera con npm run build |

---

## 5. Gestión de Usuarios

### 5.1 Roles del sistema

| Rol | ID | Descripción |
|-----|----|-------------|
| Administrador | 1 | Control total del sistema. Gestiona convocatorias, usuarios, convenios |
| Revisor Documental | 2 | Valida la documentación de las solicitudes enviadas |
| Evaluador Técnico | 3 | Puntúa proyectos según criterios de la convocatoria |
| Solicitante | 4 | Institución que aplica a convocatorias de financiamiento |

### 5.2 Crear un usuario nuevo

Los usuarios **no se crean directamente** en la interfaz; el flujo institucional es:

1. La persona nueva accede a `https://sidecyt-comecyt.edomex.gob.mx/solicitar-acceso` y llena el formulario.
2. La solicitud llega al administrador en **`/admin/solicitudes-acceso`**.
3. El administrador revisa los datos y hace clic en **Aprobar**.
4. El sistema crea el usuario automáticamente con contraseña temporal.

**Creación directa (solo casos especiales, vía interfaz admin):**
1. Ir a `https://sidecyt-comecyt.edomex.gob.mx/admin/usuarios`
2. Clic en **Nuevo usuario**
3. Completar: nombre, email institucional, rol, institución
4. El usuario recibirá un correo (cuando SMTP esté configurado) o el admin le comunicará la contraseña

### 5.3 Resetear contraseña (flujo admin-mediated)

El sistema COMECYT **no permite autoservicio de reset de contraseña** — requiere aprobación del administrador. Flujo:

1. El usuario va a `/forgot-password` y solicita el reset.
2. La solicitud llega al administrador en **`/admin/reset-requests`**.
3. El administrador revisa la identidad del solicitante y hace clic en **Aprobar**.
4. Laravel envía automáticamente el enlace de reset al correo del usuario.
5. El usuario hace clic en el enlace (válido por 60 minutos) y establece su nueva contraseña.

> Si el SMTP no está configurado, el enlace aparece en el log de Laravel:
> `F:\Desarrollo Tecnologico\apps\api\storage\logs\laravel-YYYY-MM-DD.log`
> Buscar la línea con `reset-password?token=` y enviar ese enlace manualmente al usuario.

### 5.4 Desactivar un usuario

1. Ir a `/admin/usuarios`
2. Buscar el usuario por nombre o email
3. Hacer clic en el usuario y seleccionar **Desactivar** o **Eliminar**
4. El sistema impide eliminar el último administrador activo y la auto-eliminación

### 5.5 Crear el primer administrador (BD vacía o emergencia)

Solo ejecutar si no existe ningún administrador en el sistema:

```powershell
Set-Location "F:\Desarrollo Tecnologico\apps\api"

# Crear usuario admin por línea de comandos (Tinker interactivo)
# Escribir los comandos uno por uno después de que aparezca el prompt >>>
& 'C:\php\php.exe' artisan tinker
```

Dentro de Tinker, ejecutar (un bloque a la vez):

```php
// Crear usuario administrador
$user = new App\Models\User();
$user->name = 'Administrador TIC';
$user->email = 'admin@comecyt.gob.mx';
$user->password = Hash::make('CambiarEstaContraseña2026!');
$user->role_id = 1;
$user->activo = true;
$user->save();
echo "Usuario creado con ID: " . $user->id;
exit
```

> Cambiar la contraseña inmediatamente desde la interfaz web en `/admin/usuarios`.

---

## 6. Certificados y HTTPS

### 6.1 Estado actual (11/09/2026)

| Acceso | Certificado | Quién lo administra | Vence |
|---|---|---|---|
| `https://sidecyt-comecyt.edomex.gob.mx` | `*.edomex.gob.mx` (GeoTrust / DigiCert), válido | **Infraestructura**, en el balanceador | 19/02/2027 |
| `https://10.250.36.241` y `https://localhost` | `CN=10.250.36.241`, **autofirmado**, thumbprint `BBC4F9F90860A2B8D3AF0875D0DDA678D9E0AC38` | Este servidor | 01/09/2027 |

> La versión 1.0 de esta guía describía un certificado de Let's Encrypt para `comecyt-sistemas.edomex.gob.mx`
> con renovación por win-acme. **No es así:** ese dominio se descartó el 31/07/2026, y los certificados
> que quedan en el almacén para ese nombre son autofirmados y no están enlazados a ningún puerto. No hay
> renovación de Let's Encrypt que atender.

```powershell
# Certificado del dominio (lo sirve el balanceador): sección "DNS y certificado"
& "C:\Users\Administrator\Desktop\ADEM\_herramientas\VerificarDominio.ps1"

# Certificados enlazados a 443 en este servidor
netsh http show sslcert | Select-String 'IP:port|Hostname:port|Certificate Hash'
Get-ChildItem Cert:\LocalMachine\My | Select-Object Subject, Thumbprint, NotAfter | Format-Table -AutoSize
```

### 6.2 Renovación

- **Certificado del dominio:** lo renueva infraestructura en el balanceador. `VerificarDominio.ps1` marca
  FALLA cuando faltan 30 días o menos; ese es el momento de avisarles.
- **Certificado local de la IP** (vence el 01/09/2027): generar uno nuevo con el mismo SAN (IP
  `10.250.36.241` y DNS `localhost`) y reenlazarlo a `10.250.36.241:443` y `localhost:443`. Referencia,
  **revisar antes de ejecutar** (no se ha corrido tal cual en este servidor):

  ```powershell
  $cert  = New-SelfSignedCertificate -Subject 'CN=10.250.36.241' `
             -TextExtension @('2.5.29.17={text}IPAddress=10.250.36.241&DNS=localhost') `
             -CertStoreLocation Cert:\LocalMachine\My -NotAfter (Get-Date).AddYears(1)
  $appid = '{4dc3e181-e14b-4a21-b022-59fc669b0914}'   # el que muestra netsh http show sslcert
  netsh http update sslcert ipport=10.250.36.241:443 certhash=$($cert.Thumbprint) appid=$appid
  netsh http update sslcert hostnameport=localhost:443 certhash=$($cert.Thumbprint) appid=$appid certstorename=MY
  ```

  El listener de RDP (3389) usa un certificado para la misma IP (hallazgo 3 del pentest). Si se renueva,
  revisarlo con `Desktop\ADEM\_herramientas\ProbeRdp.ps1`. Como el certificado local es autofirmado, un
  escaneo **contra la IP** lo seguirá reportando; por el dominio no aplica.

---

## 7. Troubleshooting Común

| Síntoma | Diagnóstico | Solución |
|---------|-------------|---------|
| Servicio aparece como `Stopped` | El proceso terminó inesperadamente | `Start-Service comecyt-NombreServicio`. Ver log de errores en `F:\Desarrollo Tecnologico\logs\comecyt-NombreServicio-stderr.log` para identificar la causa raíz |
| Servicio aparece como `Paused` | NSSM lo pausó por reintentos fallidos | `& 'C:\tools\bin\nssm.exe' start comecyt-NombreServicio`. Si falla repetidamente, revisar que `.env` exista y tenga las variables correctas |
| IIS devuelve **502 Bad Gateway** | El backend PHP no responde | 1) `Get-Service W3SVC` — si `Stopped`, `Start-Service W3SVC`. 2) Verificar que FastCGI PHP esté activo en IIS Manager. 3) Revisar log de Laravel |
| IIS devuelve **503 Service Unavailable** | Application Pool caído | Abrir IIS Manager → Application Pools → Seleccionar el pool de COMECYT → Start. O: `& $env:windir\system32\inetsrv\appcmd.exe start apppool /apppool.name:"COMECYT"` |
| La página carga pero la API no responde | Backend Laravel con error | `Get-Content "F:\Desarrollo Tecnologico\apps\api\storage\logs\laravel-$(Get-Date -Format 'yyyy-MM-dd').log" -Tail 50` — buscar líneas `ERROR` o `CRITICAL` |
| Error `SQLSTATE` en logs Laravel | Problema de conexión a PostgreSQL | 1) `Get-Service postgresql-18` — si `Stopped`, `Start-Service postgresql-18`. 2) Verificar credenciales en `apps\api\.env`. 3) Intentar conexión: `& 'C:\pgsql\bin\psql.exe' -U comecyt_user -d comecyt_prod -c "\l"` |
| Archivos subidos no accesibles (404) | Symlink `public/storage` roto | `Set-Location "F:\Desarrollo Tecnologico\apps\api"; & 'C:\php\php.exe' artisan storage:link` |
| El correo no llega al usuario | SMTP no configurado | Verificado el 11/09/2026: `MAIL_MAILER=smtp` apunta a `127.0.0.1:2525` y **nada escucha ahí**, así que no sale ningún correo. Mientras no haya SMTP institucional, el administrador debe comunicar enlaces y contraseñas por otra vía. Comprobar con `Get-NetTCPConnection -LocalPort 2525 -State Listen` |
| Log de Laravel con `Backup DB falló` cada noche | `comecyt:backup-db` no encuentra `pg_dump` ni `gzip` | Conocido (11/09/2026). El respaldo real es la tarea de Windows (sección 3). Pendiente corregir o retirar el comando |
| WebSocket no conecta (notificaciones en tiempo real no llegan) | Servicio Reverb caído o mal configurado | 1) `Get-Service comecyt-reverb` — si no está `Running`, `Start-Service comecyt-reverb`. 2) Ver log: `Get-Content "F:\Desarrollo Tecnologico\logs\comecyt-reverb-stdout.log" -Tail 20`. 3) Verificar que el puerto de Reverb esté abierto en el firewall de Windows |
| Build del frontend falla tras deploy | Error de TypeScript o dependencias | Ver la salida del comando `npm run build`. Los errores más comunes son imports faltantes. No reiniciar el servicio — el build anterior sigue funcionando |
| El dominio redirige a la IP, o "demasiadas redirecciones" | IP del balanceador fuera del rango configurado, o petición sin `X-Forwarded-Proto` | `VerificarDominio.ps1`; [DOMINIO_BALANCEADOR.md §11](DOMINIO_BALANCEADOR.md#11-diagnóstico-rápido) |
| `http://10.250.36.241` "no carga" directo | Es lo esperado: redirige a `https://10.250.36.241` | Aceptar la advertencia del certificado autofirmado, o usar el dominio |
| Login bloqueado (`429`) para todos a la vez | `TRUSTED_PROXIES` sin el rango del balanceador: todos comparten IP | `.env` de Laravel; [DOMINIO_BALANCEADOR.md §3.3](DOMINIO_BALANCEADOR.md#33-laravel--appsapienv) |
| Listados de admin vacíos al abrir la página | `serverFetch` rechaza el certificado autofirmado (pendiente previo) | [DOMINIO_BALANCEADOR.md §7](DOMINIO_BALANCEADOR.md#7-pendiente-previo-detectado-no-causado-por-el-dominio) |
| El servidor se apaga solo cada hora | Venció la licencia de evaluación de Windows | [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md), Pendientes |
| La app carga pero muestra datos viejos | Caché de Laravel no actualizada | `Set-Location "F:\Desarrollo Tecnologico\apps\api"; & 'C:\php\php.exe' artisan cache:clear; & 'C:\php\php.exe' artisan config:cache` |
| Login funciona pero la sesión se pierde inmediatamente | Cookie HttpOnly no se emite | Verificar que `SESSION_SECURE_COOKIE=false` en `.env` si se accede por HTTP (pruebas internas). En producción HTTPS debe ser `true` |
| Ruta de API devuelve 404 | Caché de rutas desactualizada | `& 'C:\php\php.exe' artisan route:clear; & 'C:\php\php.exe' artisan route:cache` |
| Error `php_network_getaddresses` | DNS interno no resuelve el host de BD | Verificar que `DB_HOST` en `.env` sea `localhost` o `127.0.0.1`, no un hostname externo |

### 7.1 Diagnóstico rápido todo-en-uno

```powershell
Write-Host "=== DIAGNÓSTICO COMECYT ===" -ForegroundColor Cyan
Write-Host ""

# Servicios
Write-Host "--- Servicios ---" -ForegroundColor Yellow
Get-Service comecyt-web, comecyt-queue, comecyt-scheduler, comecyt-reverb, W3SVC, postgresql-18 |
    ForEach-Object {
        $color = if ($_.Status -eq 'Running') { 'Green' } else { 'Red' }
        Write-Host "  $($_.Name.PadRight(25)) $($_.Status)" -ForegroundColor $color
    }

Write-Host ""
Write-Host "--- Últimos errores en log Laravel (hoy) ---" -ForegroundColor Yellow
$logHoy = "F:\Desarrollo Tecnologico\apps\api\storage\logs\laravel-$(Get-Date -Format 'yyyy-MM-dd').log"
if (Test-Path $logHoy) {
    Get-Content $logHoy | Where-Object { $_ -match '\.(ERROR|CRITICAL)' } | Select-Object -Last 5
} else {
    Write-Host "  No hay log de hoy aún" -ForegroundColor Gray
}

Write-Host ""
Write-Host "--- Backup más reciente ---" -ForegroundColor Yellow
Get-ChildItem "F:\Desarrollo Tecnologico\backups\" | Sort-Object LastWriteTime -Descending |
    Select-Object -First 1 | Select-Object Name, LastWriteTime
```

---

## 8. Comandos de Artisan Útiles

Todos los comandos deben ejecutarse desde `F:\Desarrollo Tecnologico\apps\api`:

```powershell
Set-Location "F:\Desarrollo Tecnologico\apps\api"
$php = "C:\php\php.exe"

# ── Verificación del entorno ────────────────────────────────────────────────
& $php artisan app:deploy-check
# Verifica: conexión a BD, .env correcta, storage:link, cola funcional, etc.

# ── Estado de migraciones ───────────────────────────────────────────────────
& $php artisan migrate:status
# Muestra qué migraciones están aplicadas y cuáles pendientes

# ── Gestión de la cola de trabajos ─────────────────────────────────────────
& $php artisan queue:failed
# Lista los trabajos que fallaron (emails no enviados, notificaciones perdidas)

& $php artisan queue:retry all
# Reintenta TODOS los trabajos fallidos

& $php artisan queue:flush
# Elimina definitivamente todos los trabajos fallidos de la cola

# ── Caché de la aplicación ─────────────────────────────────────────────────
& $php artisan cache:clear
# Limpia caché de aplicación (Redis/file)

& $php artisan config:cache
# Regenera la caché de configuración (ejecutar tras cambiar .env)

& $php artisan route:cache
# Regenera la caché de rutas (ejecutar tras agregar/modificar rutas)

& $php artisan view:clear
# Limpia vistas Blade compiladas

# ── Gestión de archivos ────────────────────────────────────────────────────
& $php artisan storage:link
# (Re)crea el symlink public/storage → storage/app/public
# Ejecutar si los archivos subidos dan 404

# ── Convocatorias ─────────────────────────────────────────────────────────
& $php artisan convocatorias:close-expired
# Cierra manualmente las convocatorias cuya fecha límite ya venció
# Normalmente lo ejecuta el scheduler cada hora — usar para forzar el cierre

# ── Seeder específico ─────────────────────────────────────────────────────
& $php artisan db:seed --class=CarouselSlideSeeder
# Repobla las slides del carrusel de la página de login
# Útil si la tabla carousel_slides quedó vacía

# ── Información del sistema ────────────────────────────────────────────────
& $php artisan about
# Muestra versión de Laravel, entorno, drivers de caché/BD/cola configurados

& $php artisan route:list
# Lista todas las rutas registradas (útil para verificar endpoints después de un deploy)
```

---

## 9. Dominio de Producción y Balanceador

**Liberado el 11/09/2026.** `sidecyt-comecyt.edomex.gob.mx` apunta a un balanceador de infraestructura
que termina el HTTPS y reenvía a este servidor por HTTP (puerto 80). El procedimiento de la versión 1.0
(DNS → Let's Encrypt → binding HTTPS → recompilar con el dominio) **ya no aplica**.

Todo el detalle está en **[DOMINIO_BALANCEADOR.md](DOMINIO_BALANCEADOR.md)**: arquitectura, qué se
cambió, verificación, qué debe confirmar infraestructura, reversión y diagnóstico.

### 9.1 Lo que hay que saber para operar

| Tema | Regla |
|---|---|
| Verificar | `& "C:\Users\Administrator\Desktop\ADEM\_herramientas\VerificarDominio.ps1"` (exit 0 = todo bien) |
| Frontend | `NEXT_PUBLIC_API_URL=/api` (relativa). **No** hace falta recompilar para cambiar de dominio |
| Publicar otro nombre | Agregarlo a `HostAllowList` en `apps\api\public\web.config`, crear el binding HTTP `*:80:<nombre>` en IIS y agregarlo a `CORS_ALLOWED_ORIGINS`. Si pasa a ser el principal, también `APP_URL` y `NEXT_PUBLIC_APP_URL` |
| IPs del balanceador | Rango `100.64.0.0/10` en **dos lugares**: `web.config` (5 condiciones) y `TRUSTED_PROXIES` del `.env`. Ver [DOMINIO_BALANCEADOR.md §9](DOMINIO_BALANCEADOR.md#9-si-cambia-el-rango-de-ips-del-balanceador) |
| Editar `web.config` | **Una variable por condición** en las reglas de redirección. Concatenar variables provocó un bucle infinito (`CLAUDE.md`, E22) |
| Log de IIS | Incluye `X-Forwarded-*` al final de cada línea; la IP real del cliente es `X-Forwarded-For` |
| Cambios en `.env` de Laravel | Se leen en cada petición (config no cacheada). Solo hace falta `php artisan queue:restart` para el worker |

### 9.2 Recompilar el frontend (cualquier cambio en `NEXT_PUBLIC_*`)

```powershell
$web = 'F:\Desarrollo Tecnologico\apps\web'
Set-Location $web
robocopy .next ".next.bak-$(Get-Date -Format yyyyMMdd-HHmm)" /E /NFL /NDL /NJH /NP | Out-Null   # respaldo
Stop-Service comecyt-web -Force          # si sigue corriendo, el build falla con EBUSY (CLAUDE.md, E20)
& 'C:\Program Files\nodejs\npm.cmd' run build
New-Item -ItemType Directory -Force ".next\standalone\.next\static", ".next\standalone\public" | Out-Null
Copy-Item ".next\static\*" ".next\standalone\.next\static\" -Recurse -Force   # next build no los copia
Copy-Item "public\*"       ".next\standalone\public\"       -Recurse -Force
Start-Service comecyt-web
& "C:\Users\Administrator\Desktop\ADEM\_herramientas\VerificarDominio.ps1"
```

Si el build falla, **no arrancar** con el `.next` a medias: restaurar el respaldo con
`robocopy <respaldo> .next /MIR` y después `Start-Service comecyt-web`.

---

## 10. Smoke Test Rápido Post-Mantenimiento

Ejecutar después de **cualquier** mantenimiento, deploy, reinicio de servicios o cambio de configuración:

```powershell
# ═══════════════════════════════════════════════════════════════════════════
# SMOKE TEST COMECYT — Copiar y ejecutar completo en PowerShell
# ═══════════════════════════════════════════════════════════════════════════
$ErrorActionPreference = 'SilentlyContinue'

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       SMOKE TEST COMECYT                 ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 1. Estado de servicios
Write-Host "─── Servicios ─────────────────────────────" -ForegroundColor Yellow
$servicios = @('comecyt-web','comecyt-queue','comecyt-scheduler','comecyt-reverb','W3SVC','postgresql-18')
foreach ($svc in $servicios) {
    try {
        $s = Get-Service $svc -ErrorAction Stop
        $color = if ($s.Status -eq 'Running') { 'Green' } else { 'Red' }
        $icono = if ($s.Status -eq 'Running') { '[OK]  ' } else { '[FAIL]' }
        Write-Host "  $icono $($svc.PadRight(28)) $($s.Status)" -ForegroundColor $color
    } catch {
        Write-Host "  [N/A] $svc — no encontrado" -ForegroundColor Gray
    }
}

# 2. Health checks HTTP (dominio a través del balanceador y acceso directo por IP)
Write-Host ""
Write-Host "─── Endpoints ─────────────────────────────" -ForegroundColor Yellow
$d = 'sidecyt-comecyt.edomex.gob.mx'
$endpoints = @(
    @{ url = "https://$d/up";                  nombre = "/up (Laravel health) — dominio" },
    @{ url = "https://$d/login";               nombre = "/login (Frontend) — dominio" },
    @{ url = "https://$d/api/carousel/slides"; nombre = "/api/carousel/slides (API pública) — dominio" },
    @{ url = "https://10.250.36.241/login";    nombre = "/login — IP interna (VPN)" }
)

foreach ($ep in $endpoints) {
    $code = curl.exe -sk -o NUL -w '%{http_code}' --max-time 20 $ep.url
    if ($code -eq '200') {
        Write-Host "  [OK]   $($ep.nombre)" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $($ep.nombre) — HTTP $code" -ForegroundColor Red
    }
}

# 3. Backup reciente
Write-Host ""
Write-Host "─── Backup ────────────────────────────────" -ForegroundColor Yellow
$backupReciente = Get-ChildItem "F:\Desarrollo Tecnologico\backups\" -Filter *.dump -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($backupReciente) {
    $horas = [math]::Round(((Get-Date) - $backupReciente.LastWriteTime).TotalHours, 1)
    $colorB = if ($horas -lt 25) { 'Green' } else { 'Red' }
    Write-Host "  Último backup: $($backupReciente.Name) (hace $horas h)" -ForegroundColor $colorB
} else {
    Write-Host "  [WARN] No se encontraron backups" -ForegroundColor Red
}

# 4. Resumen
Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " Smoke test completado — $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host " Si hay líneas [FAIL], revisar sección 7 (Troubleshooting)" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
```

---

## Apéndice A — Rutas del sistema (referencia rápida)

| Recurso | Ruta |
|---------|------|
| Raíz del proyecto | `F:\Desarrollo Tecnologico\` |
| Junction alternativo | `F:\comecyt\` |
| Backend Laravel | `F:\Desarrollo Tecnologico\apps\api\` |
| Frontend Next.js | `F:\Desarrollo Tecnologico\apps\web\` |
| Logs del sistema | `F:\Desarrollo Tecnologico\logs\` |
| Logs Laravel | `F:\Desarrollo Tecnologico\apps\api\storage\logs\` |
| Backups | `F:\Desarrollo Tecnologico\backups\` |
| Archivos subidos | `F:\Desarrollo Tecnologico\apps\api\storage\app\public\` |
| PHP CLI | `C:\php\php.exe` |
| PHP CGI (FastCGI) | `C:\php\php-cgi.exe` |
| PostgreSQL binarios | `C:\pgsql\bin\` |
| NSSM | `C:\tools\bin\nssm.exe` |
| win-acme | `C:\tools\win-acme\wacs.exe` |
| Composer | `C:\tools\composer\composer.phar` |
| Git | `C:\tools\git\cmd\git.exe` |
| Node.js / npm | `C:\Program Files\nodejs\` |
| Verificación (pentest y dominio) | `C:\Users\Administrator\Desktop\ADEM\_herramientas\` (`VerificarTodo.ps1`, `VerificarDominio.ps1`) |
| Configuración IIS del sitio | `F:\Desarrollo Tecnologico\apps\api\public\web.config` |
| Log de IIS del sitio | `C:\inetpub\logs\LogFiles\W3SVC2\` (con campos `X-Forwarded-*`) |

## Apéndice B — Contactos y accesos

| Rol | Acceso |
|-----|--------|
| Interfaz admin | `https://sidecyt-comecyt.edomex.gob.mx/login` (rol Administrador). Por VPN: `https://10.250.36.241/login` |
| Servidor (RDP) | Windows Server 2022 — `10.250.36.241` |
| PostgreSQL | `localhost:5432` — credenciales en `apps\api\.env` |
| IIS Manager | `inetmgr` — ejecutar como Administrador en el servidor |
| Balanceador y certificado del dominio | Infraestructura (ADEM). Correo de seguimiento en `Desktop\ADEM\_v4_dominio_sep11\` |

---

*Documento generado: 30 de junio de 2026 — Sistema COMECYT v8.0 · Actualizado: 11 de septiembre de 2026 (dominio y balanceador)*
*Para cambios en este documento, editar `F:\Desarrollo Tecnologico\docs\OPERATIONS.md`*
