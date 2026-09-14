# Estado Actual del Sistema COMECYT

**Fecha de actualización:** 14 de septiembre de 2026 (versión anterior: 11/09/2026)

> ✅ **14/09/2026 (tarde) — El dominio funciona desde Internet.** Infraestructura corrigió el balanceador.
> `VerificarDominio.ps1` da exit 0. DNS dividido: interno → `10.200.41.106`, público →
> `187.189.139.176`/`201.131.40.176`. El tráfico público entra desde `100.127.1.42` (dentro de
> `100.64.0.0/10`), sin cambios en `web.config`.
>
> 🎨 **14/09/2026 — Login rediseñado y publicado** (build 14:33–14:34, 53 s sin servicio). Sistema y
> verificación en [DISENO_UI.md](DISENO_UI.md). Respaldo del build anterior:
> `apps\web\.next.bak-20260914-prelogin`. Corregido además el pie "Estado de MÃ©xico" (E24).
>
> 🎨 **14/09/2026 (misma tarde) — Panel rediseñado y publicado** (dos builds: 16:33 y 16:38, ~1 min sin
> servicio cada uno). Sidebar único para los 4 roles (`AppShell.tsx`, E26 en `CLAUDE.md`), dashboard de
> admin con tiles de datos reales, pantalla de carga del sistema, "¿Olvidaste tu clave?" y "Solicitar
> acceso" con el mismo sistema del login. `logo.png` como favicon en todo el sitio (antes no había
> `favicon.ico`, caía al ícono por defecto). Detalle y qué falta en [DISENO_UI.md](DISENO_UI.md) §5-7.
> Respaldos: `apps\web\.next.bak-20260914-prepanel` y `-prepanel2`.
>
> 🔐 **14/09/2026 — Repositorio git.** El proyecto ya tiene git (`main`, commits `e993228` base y
> `fecb5eb` login) con remoto `https://github.com/comecyt0/SIDECyT_DT.git`, **que es público**. No se
> ha hecho push: falta la confirmación del usuario y revisar qué de `CLAUDE.md`/`docs/` no debe ser
> público. El repositorio anterior `comecyt0/Desarrollo-Tecnol-gico` también es público y su README
> publicaba las contraseñas del seeder. **Las 4 contraseñas se rotaron el 14/09/2026** (20 caracteres,
> entregadas al usuario, no escritas en ningún archivo); la del seeder ya no entra en ninguna cuenta.
> **2FA del admin desactivado el 14/09/2026** a pedido del usuario (no tenía la app autenticadora y sin
> SMTP no hay recuperación). Ninguna cuenta tiene 2FA hoy: reactivarlo desde el perfil del admin
> (`POST /auth/2fa/setup` + `confirm`) en cuanto haya SMTP y un dispositivo asignado.
>
> 🔴 **14/09/2026 (mañana) — El dominio respondía `404` desde el balanceador** (resuelto, arriba). Infraestructura publicó el sitio
> hacia Internet (IP pública `187.189.139.176` / `201.131.40.176`, EIP `10.200.41.131`) y con eso el
> dominio pasó a un **balanceador nuevo que no tiene registrada la ruta al servidor**. El `404` lo
> genera el balanceador: las peticiones **no llegan** a este servidor (cero registros del rango
> `100.64.0.0/10` en el log de IIS ese día, ni nada en `HTTPERR`). **No hay nada que corregir en el
> servidor**: el VIP anterior `10.200.41.106` sigue respondiendo `307 → /login` contra esta misma
> configuración, y el acceso por `https://10.250.36.241` funciona. **Correo a infraestructura enviado
> el 14/09/2026; esperando respuesta.** Evidencia y seguimiento:
> [DOMINIO_BALANCEADOR.md §12](DOMINIO_BALANCEADOR.md) y
> `Desktop\ADEM\_v5_publicacion_sep14\LEEME.md`.
>
> **Cierre de sesión del 14/09/2026.** No se aplicó ningún cambio funcional al servidor: la sesión fue
> diagnóstico y documentación. Al retomar, leer primero
> `Desktop\ADEM\_v5_publicacion_sep14\LEEME.md`, sección **Cómo continuar**.
>
> ⚠️ **URGENTE — Licencia de Windows.** El servidor corre **Windows Server 2022 Standard Evaluation**
> y al 11/09/2026 le quedan **7 días** de gracia (10 580 minutos según `slmgr /dlv`; vence alrededor del
> **18/09/2026**). Quedan **4 rearmes**. Al vencer, Windows apaga el servidor solo cada hora. Ver [Pendientes](#pendientes).
>
> **Cierre de sesión del 11/09/2026.** Se liberó el dominio y después se hizo una revisión general del
> servidor (ver [Revisión general del 11/09/2026](#revisión-general-del-11092026)). Para retomar, leer
> **Pendientes** en orden de prioridad. Lo del dominio sigue en `Desktop\ADEM\_v4_dominio_sep11\LEEME.md`.

---

## Infraestructura

| Componente | Estado | Detalle |
|---|---|---|
| Servidor | Windows Server 2022 Standard **Evaluation** | OpenStack VM, 16 GB RAM, 8 vCPU. IP `10.250.36.241` |
| Balanceador (infraestructura) | ⚠️ **Sin ruta al servidor desde el 14/09/2026** | El DNS resolvía a `10.200.41.106` (funcionaba: termina TLS y reenvía por HTTP al 80 desde `100.127.0.48`). Con la publicación externa pasó a **`10.200.41.131`**, que devuelve `404` porque no tiene la ruta registrada. Ver [DOMINIO_BALANCEADOR.md §12](DOMINIO_BALANCEADOR.md) |
| Ruta del proyecto | `F:\Desarrollo Tecnologico\` | Junction `F:\comecyt` → `F:\Desarrollo Tecnologico` (para NSSM) |
| IIS 10 | Activo | Sitio `comecyt`; URL Rewrite 7.2.1993 + ARR. `Default Web Site` detenido |
| PHP 8.4.22 FastCGI | Activo | `C:\php\php-cgi.exe` vía IIS |
| PostgreSQL 18 | Activo | Servicio `postgresql-18`, BD `comecyt_prod` |
| Node.js 24.16.0 | Activo | Servicio NSSM `comecyt-web` (Next.js 16 standalone) |

---

## Servicios NSSM

| Servicio | Estado (11/09/2026) | Comando | Puerto |
|---|---|---|---|
| `comecyt-web` | Running | `node F:\comecyt\apps\web\.next\standalone\server.js` | 3000 |
| `comecyt-reverb` | Running | `php artisan reverb:start --host=127.0.0.1 --port=8080` | 8080 |
| `comecyt-queue` | Running | `php artisan queue:work --tries=3 --timeout=90` | — |
| `comecyt-scheduler` | Running | `php artisan schedule:work` | — |

Entorno de `comecyt-web` (`AppEnvironmentExtra`): `PORT=3000`, `HOSTNAME=127.0.0.1`, `NODE_ENV=production`,
`API_INTERNAL_URL=https://10.250.36.241/api` (agregada el 11/09/2026 para `serverFetch`).

---

## URLs de acceso

| URL | Uso | Notas |
|---|---|---|
| `https://sidecyt-comecyt.edomex.gob.mx/` | **Producción** | Detrás del balanceador, certificado válido `*.edomex.gob.mx` |
| `https://10.250.36.241/` | VPN interna | Certificado autofirmado (el navegador advierte) |
| `http://10.250.36.241/` | — | `302` → `https://10.250.36.241/` |
| `http://sidecyt-comecyt.edomex.gob.mx/` | — | El balanceador no responde en el puerto 80 (pedido a infraestructura) |
| `http://localhost/` en el servidor | Administración | `302` → `https://10.250.36.241/` |
| `comecyt-sistemas.edomex.gob.mx` | **Descartado** el 31/07/2026 | Sigue en `HostAllowList` y CORS por equipos con `hosts` antiguo; sin binding |

---

## Bindings IIS (sitio `comecyt`)

| Binding | Resultado |
|---|---|
| `http *:80:localhost` | `302` → `https://10.250.36.241/` |
| `https *:443:localhost` | Sistema — certificado `CN=10.250.36.241` |
| `http *:80:10.250.36.241` | `302` → `https://10.250.36.241/` |
| `https 10.250.36.241:443` | Sistema — certificado `CN=10.250.36.241` (autofirmado) |
| `http *:80:sidecyt-comecyt.edomex.gob.mx` | **Entrada del balanceador.** Sin redirección si llega con `X-Forwarded-Proto: https` desde `100.64.0.0/10`; si no, `302` al dominio |

Cualquier `Host` fuera de la lista blanca (`HostAllowList` en `web.config`) recibe `404` vacío.

---

## Certificados

| Certificado | Dónde | Vence | Uso |
|---|---|---|---|
| `*.edomex.gob.mx` (GeoTrust TLS RSA CA G1 / DigiCert) | **Balanceador** (lo administra infraestructura) | 19/02/2027 | Dominio público |
| `CN=10.250.36.241` — `BBC4F9F90860A2B8D3AF0875D0DDA678D9E0AC38` | `LocalMachine\My` | 01/09/2027 | Bindings 443 (IP y localhost). Autofirmado |
| `CN=comecyt-sistemas.edomex.gob.mx` — `EB7921…`, `AA7D98…`, `2E676A…` | `LocalMachine\My` | 2027–2028 | Sin uso (dominio descartado) |
| `CN=sideyt_comecyt.edomex.gob.mx` — `9014C6…` | `LocalMachine\My` | 2029 | Sin uso (grafía errónea, huérfano) |
| `CN=apoyoempresarial-comecyt.gob.mx` — `81E545…` | `LocalMachine\My` | 2028 | Sin uso |

> Todos los certificados del servidor son **autofirmados** (emisor = sujeto). La versión anterior de
> `OPERATIONS.md` atribuía uno a Let's Encrypt; no es así. El único certificado de CA es el del
> balanceador.

---

## Variables de entorno clave

### Backend (`F:\Desarrollo Tecnologico\apps\api\.env`)

| Variable | Valor actual | Notas |
|---|---|---|
| `APP_ENV` / `APP_DEBUG` | `production` / `false` | Bloquea el seeder de prueba |
| `APP_URL` | `https://sidecyt-comecyt.edomex.gob.mx` | Desde el 11/09/2026 (antes `comecyt-sistemas`) |
| `NEXT_PUBLIC_APP_URL` | `https://sidecyt-comecyt.edomex.gob.mx` | Enlaces en correos |
| `CORS_ALLOWED_ORIGINS` | `https://sidecyt-comecyt.edomex.gob.mx,https://10.250.36.241,https://comecyt-sistemas.edomex.gob.mx,http://10.250.36.241` | |
| `TRUSTED_PROXIES` | `127.0.0.1,100.64.0.0/10` | Balanceador. **Debe coincidir con `web.config`** |
| `DB_DATABASE` | `comecyt_prod` | |
| `MAIL_MAILER` | `smtp` → `127.0.0.1:2525` | **No envía** (SMTP institucional pendiente) |
| `JWT_TTL` | `1440` (24 h) | |
| `SESSION_DRIVER` / `QUEUE_CONNECTION` | `database` / `database` | |

Configuración **no cacheada** (`bootstrap\cache\config.php` no existe): PHP lee el `.env` en cada
petición. Tras cambiarlo basta `php artisan queue:restart` para el worker de colas.

### Frontend (`F:\Desarrollo Tecnologico\apps\web\.env.local`)

| Variable | Valor actual | Notas |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `/api` | **Relativa**: el mismo build sirve por la IP y por el dominio. Horneada en el build |
| `NEXT_PUBLIC_REVERB_APP_KEY` | definida | |
| `NEXT_PUBLIC_REVERB_HOST/PORT/SCHEME` | **omitidas** | `echo.ts` usa el origen de la página |
| `API_INTERNAL_URL` | `https://10.250.36.241/api` | **No va aquí**: está en el entorno NSSM de `comecyt-web`, se lee en tiempo de ejecución |

Último build: **11/09/2026** (sin la IP horneada). Respaldo anterior: `apps\web\.next.bak-20260911-predominio`.

---

## Backups

| Ítem | Detalle |
|---|---|
| Tarea programada | `COMECYT-Backup-Diario` — diaria a las 02:00. Última ejecución 11/09/2026 02:00, resultado `0` |
| Script | `F:\Desarrollo Tecnologico\backup.ps1` |
| Destino | `F:\Desarrollo Tecnologico\backups\comecyt_YYYY-MM-DD_HHmm.dump` |
| Último dump | `comecyt_2026-09-11_0200.dump` |
| Retención | 14 días (confirmado en `backup.ps1` el 11/09/2026) |
| Dump verificado | `pg_restore --list` del dump del 11/09/2026: 393 entradas, 47 tablas con datos. Legible. 15 dumps en disco |
| ⚠️ Copia fuera del servidor | **No hay.** Todos los dumps están en el mismo disco `F:` |
| ⚠️ Respaldo de Laravel `comecyt:backup-db` | **Falla todas las noches** a las 02:00 (al menos desde el 28/08/2026): busca `pg_dump` y `gzip` en el PATH y no existen en Windows. Es un segundo respaldo, redundante con la tarea de Windows; deja 2 errores diarios en el log |
| Respaldos de configuración | `backups\20260911-dominio-elb\` (web.config, .env, fuentes del front, config del sitio IIS) |
| Builds anteriores del front | `apps\web\.next.bak-*` (cinco copias: preseguridad, precsp-20260813, preheaders-20260813, 20260827-precorp, 20260911-predominio) |

---

## Revisión general del 11/09/2026

Revisión de solo lectura hecha al cerrar la sesión. **No se cambió nada.** Lo único que se ejecutó fue
`php artisan comecyt:backup-db` a mano para ver su error; falló sin crear archivo. Las acciones están en
[Pendientes](#pendientes).

| Qué se revisó | Resultado |
|---|---|
| `php artisan app:deploy-check` | 4 avisos: config sin caché, rutas sin caché, "scheduler en crontab" (falso positivo en Windows: lo cubre `comecyt-scheduler`) y permisos del `.env`. Lo demás en verde: APP_ENV, APP_DEBUG, claves, BD, CORS y driver de hash |
| Usuarios | 4 en total, **los 4 de prueba**, todos activos, creados el 15 y el 25/06/2026. **3 con la contraseña del seeder de pruebas**, comprobado con `Hash::check` sin exponer hashes |
| Datos | 0 solicitudes, 5 convocatorias, 4 slides de carrusel sin imagen: el sistema aún no tiene uso real |
| Correo | `smtp` → `127.0.0.1:2525`, sin credenciales; **nada escucha en el 2525** |
| Cola | 0 trabajos pendientes, 0 fallidos |
| Log de Laravel (14 días) | Solo 2 errores diarios, ambos del respaldo `comecyt:backup-db` |
| Respaldo de Windows | Funciona: 15 dumps; el último es legible y la retención de 14 días está confirmada. Sin copia fuera del servidor |
| Respaldo de Laravel | Falla: `'pg_dump' is not recognized` (usa `pg_dump` y `gzip` del PATH) |
| Cookie JWT (`.env`) | `COOKIE_SECURE=false`, `COOKIE_SAME_SITE=Lax`, `COOKIE_DOMAIN` vacío |
| Permisos del `.env` | Lectura para `BUILTIN\Users`; escritura heredada para `IIS_IUSRS`, `NETWORK SERVICE` y el AppPool. Por web: 404 (bloqueado) |
| Variables opcionales | `HEALTH_TOKEN`, `VAPID_*` y `REVERB_APP_SECRET` definidas; `SENTRY_LARAVEL_DSN` y `TSA_URL` vacías; `RATE_LIMIT_MAX=300`; `LOG_LEVEL=warning` |
| Windows Update | Servicio `wuauserv` detenido; último parche el 27/03/2026; 3 pendientes |
| Licencia | "Initial grace period", 10 580 minutos, 4 rearmes |
| Disco | C: 6.8 GB libres (33 GB usados); F: 98.5 GB libres |
| Tarea `COMECYT-LimpiarDirectorioViejo` | Nunca ejecutada; `C:\comecyt` existe y está vacío |

---

## Verificación

```powershell
& "C:\Users\Administrator\Desktop\ADEM\_herramientas\VerificarTodo.ps1"      # 7 hallazgos del pentest + dominio + servicios
& "C:\Users\Administrator\Desktop\ADEM\_herramientas\VerificarDominio.ps1"   # solo el dominio; exit 0 = todo bien
```

---

## Pendientes

| Ítem | Prioridad | Acción requerida |
|---|---|---|
| **Licencia de Windows Server** | **Crítica — 7 días** | Vence alrededor del 18/09/2026. **Solución definitiva:** convertir Evaluation → Standard con la clave institucional: `DISM /online /Set-Edition:ServerStandard /ProductKey:<clave> /AcceptEula` (reinicia el servidor; programar ventana). **Puente:** `slmgr /rearm` y reinicio. Al 11/09/2026 quedan **4 rearmes**; cada uno da otro periodo de evaluación. Comprobar antes y después con `slmgr /dlv` |
| **Cuentas de prueba en producción** | **Crítica** | Las 4 cuentas del sistema son las de prueba de `UsuariosPruebaSeeder` **Contraseñas rotadas el 14/09/2026** en las 4 (la del seeder estuvo publicada en el README del repositorio anterior, que es público). **Falta:** crear las cuentas reales y desactivar estas. Decidir primero quién administra el sistema |
| **Correo (SMTP)** | **Crítica** | `MAIL_MAILER=smtp` → `127.0.0.1:2525`, sin usuario ni contraseña, y **nada escucha en el 2525**: no sale ningún correo (enlace de restablecimiento que aprueba el admin, aprobación de accesos, notificaciones). Faltan los datos del SMTP institucional (`MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_ENCRYPTION`) |
| **Ruta del balanceador nuevo** | **Crítica — el sitio no se ve por el dominio.** En espera de infraestructura | El VIP `10.200.41.131` (el que resuelve desde la publicación externa del 14/09/2026) devuelve `404`: no tiene registrada la entrega hacia `10.250.36.241:80`. **Solo lo puede hacer infraestructura; correo enviado el 14/09/2026.** Al responder: correr `VerificarDominio.ps1`, y si el origen **no** está en `100.64.0.0/10`, ajustar **el mismo día** las 5 apariciones del patrón en `web.config` (en dos formas distintas) y `TRUSTED_PROXIES` **juntas**, o habrá bucle de redirección. [DOMINIO_BALANCEADOR.md §12 y §9](DOMINIO_BALANCEADOR.md) · `Desktop\ADEM\_v5_publicacion_sep14\LEEME.md` |
| **Confirmaciones de infraestructura** | Alta | Rango de IPs del balanceador, HTTP→HTTPS en el balanceador, health check, 50 MB, timeouts. Incorporadas al correo del 14/09 (`_v5_publicacion_sep14\`); el original sigue en `Desktop\ADEM\_v4_dominio_sep11\`. [DOMINIO_BALANCEADOR.md §8](DOMINIO_BALANCEADOR.md#8-qué-necesita-hacer-o-confirmar-infraestructura) |
| **Prueba con usuario real por el dominio** | Alta | Login, navegación por rol, subir y previsualizar documento, notificación. [DOMINIO_BALANCEADOR.md §6](DOMINIO_BALANCEADOR.md#6-lo-que-falta-probar) |
| **Windows Update** | Alta | Servicio `wuauserv` detenido; último parche instalado el 27/03/2026. Pendientes: KB5122882 (acumulativa 2026-09), KB5126149 (.NET) y KB890830 (MSRT). Aplicar en ventana de mantenimiento, porque reinicia; conviene hacerlo junto con la activación de la licencia |
| **Respaldos** | Alta | (1) `comecyt:backup-db` de Laravel **falla cada noche**: llama a `pg_dump` y `gzip` del PATH, que no existen en Windows. La tarea de Windows sí funciona, así que es redundante: corregirlo (`C:\pgsql\bin\pg_dump.exe -Fc`, sin `gzip`) o quitarlo de `routes/console.php`. (2) **No hay copia fuera del servidor**: todos los dumps están en `F:` |
| **Cookie de sesión sin `Secure`** | Media | El `.env` tiene `COOKIE_SECURE=false` y `COOKIE_SAME_SITE=Lax`. `AuthController` usa esas variables, así que `comecyt_auth` sale sin `Secure` y con `Lax`, cuando el diseño dice `Secure` + `Strict`. Como todo va por HTTPS: poner `COOKIE_SECURE=true` y `COOKIE_SAME_SITE=Strict`, y probar el login por dominio y por IP |
| **`serverFetch` con certificado autofirmado** | Media | Listados renderizados en servidor salen vacíos (ya fallaba antes). [DOMINIO_BALANCEADOR.md §7](DOMINIO_BALANCEADOR.md#7-pendiente-previo-detectado-no-causado-por-el-dominio) |
| **CSP con `script-src 'unsafe-inline'`** | Media | Candidato probable del próximo escaneo. Ver `CLAUDE.md` |
| **Permisos del `.env`** | Media | ACL heredada: `BUILTIN\Users` puede leer; `IIS_IUSRS`, `NETWORK SERVICE` y el AppPool pueden escribir. Por web está bloqueado (404). Dejar lectura solo al AppPool `comecyt` y a los servicios, y escritura solo a Administradores. `app:deploy-check` también lo avisa |
| **Endurecimiento de red pendiente desde agosto** | Media | Firma SMB, cerrar 2179 y 135, restringir RDP a la VPN. Análisis listo pero **sin aplicar**: `Desktop\ADEM\_v2_agosto\ANALISIS_SMB_Y_PUERTOS.md` |
| **Limpieza `C:\comecyt`** | Baja | La tarea `COMECYT-LimpiarDirectorioViejo` **nunca se ha ejecutado** (resultado `267011`) y el directorio sigue existiendo. Borrarlo a mano tras confirmar que nada lo usa |
| **Limpieza de `.next.bak-*`** | Baja | Cuando el dominio lleve unas semanas estable |
| **Logo Edomex** | Baja | `NEXT_PUBLIC_EDOMEX_LOGO_URL=none` — pendiente imagen oficial |
| **Carrusel del login** | Baja | Los 4 slides no tienen imagen (`imagen_url` nula). Subir imágenes reales en `/admin/carrusel` |
| **Disco C:** | Baja | 6.8 GB libres. Vigilar al aplicar actualizaciones |
| **Caché de configuración y rutas** | Baja | `app:deploy-check` avisa que no están cacheadas. Cachearlas mejora el rendimiento, pero obliga a correr `config:cache` tras cada cambio de `.env` (ver `CLAUDE.md`, E18) |
| **Sello de tiempo NOM-151** | Según uso | `TSA_URL` vacío: los documentos no llevan sello de tiempo. Configurar cuando TIC entregue el servicio |
| **Cabeceras menores** | Baja | Cabecera `Server` en el 403 que genera http.sys (`DisableServerHeader`; requiere reiniciar el servicio HTTP) y `Cross-Origin-Resource-Policy` en `/storage/*` (ver `CLAUDE.md`) |

---

## Historial de cambios recientes

| Fecha | Cambio |
|---|---|
| 2026-09-11 | **Dominio `sidecyt-comecyt.edomex.gob.mx` publicado detrás de balanceador.** `web.config` reconoce `X-Forwarded-Proto` del balanceador (una variable por condición; corregido un bucle por caché de URL Rewrite), HSTS vía balanceador, caché de respuestas apagada. Laravel con el dominio y `TRUSTED_PROXIES`. Frontend con API relativa, recompilado. Log de IIS con `X-Forwarded-*`. Nuevo `VerificarDominio.ps1`. Ver `DOMINIO_BALANCEADOR.md` y `CLAUDE.md` E22 |
| 2026-09-11 (cierre) | Revisión general del servidor, de solo lectura: se detectaron las cuentas de prueba en producción, el SMTP sin servicio, el respaldo de Laravel roto, Windows Update detenido desde marzo, la cookie sin `Secure` y los permisos del `.env`. Documentado en esta página; **sin cambios aplicados** |
| 2026-08-27 | Enlace `public\storage` (junction) y rebuild del frontend. `Cross-Origin-Resource-Policy` (26/08). Pentest de agosto: 7 de 7 hallazgos cerrados por ADEM el 25/08 |
| 2026-08-13 | Remediación del pentest de agosto: HTTPS en la IP con certificado `CN=10.250.36.241`, cabeceras de seguridad, `HostAllowList`. Dominio definitivo fijado como `sidecyt-comecyt.edomex.gob.mx` (guion medio) |
| 2026-07-31 | Se descarta `comecyt-sistemas.edomex.gob.mx` |
| 2026-06-30 | Migración de `C:\comecyt\` a `F:\Desarrollo Tecnologico\`. Junction `F:\comecyt` para NSSM. Binding 10.250.36.241. Rebuild frontend con IP |
| 2026-06-25 | Cambio de dominio a `comecyt-sistemas.edomex.gob.mx`. Cert autofirmado. WebSocket vía ARR resuelto (`webSocket enabled=true`) |
| 2026-06-15 | Despliegue inicial en Windows Server 2022. Stack IIS+NSSM+PostgreSQL 18 |
