# Dominio `sidecyt-comecyt.edomex.gob.mx` detrás del balanceador

**Estado al 11/09/2026:** publicado y funcionando por el dominio y por la IP interna.
**Pendiente:** confirmaciones de infraestructura (ver [§8](#8-qué-necesita-hacer-o-confirmar-infraestructura)).

Documentos relacionados: `CLAUDE.md` (error E22), `C:\Users\Administrator\Desktop\ADEM\_v4_dominio_sep11\LEEME.md`
(seguimiento con ADEM y correo listo para enviar).

---

## 1. Resumen

Infraestructura publicó el dominio y reportó: *"al ingresar, la aplicación redirecciona hacia la IP
https://10.250.36.241/"*.

El dominio no apunta a este servidor sino a un **balanceador (ELB)**. El ELB termina el HTTPS y reenvía
a IIS por **HTTP**. IIS veía una petición sin cifrar y su regla de "forzar HTTPS" redirigía a la IP,
que estaba escrita fija. Se ajustó IIS para reconocer el tráfico que ya viene cifrado desde el ELB, se
actualizó Laravel y se recompiló el frontend para que un mismo build funcione por la IP y por el
dominio.

---

## 2. Arquitectura

```
                          HTTPS 443                         HTTP 80
Navegador (Internet) ───────────────▶  Balanceador (ELB)  ───────────────▶  IIS  10.250.36.241
                                        10.200.41.106                         sitio "comecyt"
                                        cert *.edomex.gob.mx                    │
                                        (GeoTrust, válido)                     ├─ /api, /up    → PHP FastCGI (Laravel)
                                        origen hacia IIS: 100.127.0.48         ├─ /app, /apps  → Reverb 127.0.0.1:8080 (ARR)
                                                                               ├─ archivos     → estáticos (/storage)
                          HTTPS 443                                            └─ resto        → Next.js 127.0.0.1:3000 (ARR)
Equipo en la VPN ─────────────────────────────────────────────────────▶  IIS  10.250.36.241
                                        (cert autofirmado CN=10.250.36.241)
```

| Dato | Valor verificado el 11/09/2026 |
|---|---|
| DNS `sidecyt-comecyt.edomex.gob.mx` | A `10.200.41.106`, TTL 300 |
| Certificado del ELB | `CN=*.edomex.gob.mx`, O=Gobierno del Estado de Mexico, emisor GeoTrust TLS RSA CA G1 (DigiCert), vence **19/02/2027**, cadena válida, TLS 1.3 |
| Puerto 80 del ELB | **No responde** (timeout) |
| Destino en este servidor | Puerto **80** (HTTP), binding `*:80:sidecyt-comecyt.edomex.gob.mx` |
| IP de origen del ELB vista por IIS | `100.127.0.48` |
| WebSocket (`wss://dominio/app/...`) | Pasa por el ELB: `101 Switching Protocols` |
| Método `TRACE` | Lo rechaza el propio ELB (`405`, `Server: elb`) |

### Cabeceras que agrega el ELB

| Cabecera | Valor |
|---|---|
| `Host` | `sidecyt-comecyt.edomex.gob.mx` (se conserva) |
| `X-Forwarded-Proto` | `https` |
| `X-Forwarded-For` | IP real del cliente |
| `X-Real-IP` | IP real del cliente |
| `X-Forwarded-Host` | `sidecyt-comecyt.edomex.gob.mx` |
| `X-Forwarded-Port` | `443` |

---

## 3. Cambios aplicados

Respaldos previos a todos los cambios: `F:\Desarrollo Tecnologico\backups\20260911-dominio-elb\` y
`apps\web\.next.bak-20260911-predominio` (build anterior completo). Reversión en [§10](#10-reversión).

### 3.1 IIS — `apps\api\public\web.config`

Rango del ELB usado en las reglas: **`100.64.0.0/10`** (espacio compartido RFC 6598, no enrutable desde
los equipos cliente). Regex: `^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\.`

| Regla (en orden) | Qué hace | Cambio |
|---|---|---|
| `HostAllowList` | 404 vacío a cualquier `Host` no autorizado (hallazgo 5) | Solo comentario |
| `CertificadoPublico` | Sirve `certificado-comecyt.cer` por HTTP | — |
| `LocalhostRedirect` | `http://localhost` → `https://10.250.36.241/` | — |
| `IpRedirect` | `http://10.250.36.241` → `https://10.250.36.241/` | — |
| `DominioRedirectFueraDelElb` | Dominio por HTTP que **no** viene del rango del ELB → `https://sidecyt-comecyt.edomex.gob.mx/` | **Nueva** |
| `DominioRedirectElbSinTls` | Dominio desde el ELB **sin** `X-Forwarded-Proto: https` → mismo destino | **Nueva** |
| `HttpsRedirect` | Resto por HTTP que no viene del ELB → `https://10.250.36.241/` | Condición de origen agregada |
| `HttpsRedirectElbSinTls` | Resto desde el ELB sin `X-Forwarded-Proto: https` → misma IP | **Nueva** |
| `ReverbWS`, `StaticFiles`, `LaravelApi`, `NextJsProxy` | Enrutamiento | — |

Lo que llega del ELB con `X-Forwarded-Proto: https` no coincide con ninguna redirección y sigue
directo al enrutamiento.

Además:

- **Regla de salida `HstsSiFaltaElb`** (precondición `RespuestaSinHstsEnElb`): agrega HSTS a las
  respuestas que genera IIS cuando la petición llegó cifrada al ELB. La regla `HstsSiFalta` solo cubría
  `{HTTPS}=on`.
- **`<caching enabled="false" enableKernelCache="false" />`**: defensa en profundidad, ver [§4](#4-trampa-caché-de-url-rewrite-bucle-infinito).

**Comportamiento verificado:**

| Petición | Respuesta |
|---|---|
| `https://sidecyt-comecyt.edomex.gob.mx/` | `307` → `https://sidecyt-comecyt.edomex.gob.mx/login` |
| `https://sidecyt-comecyt.edomex.gob.mx/login` | `200` |
| `https://sidecyt-comecyt.edomex.gob.mx/api/carousel/slides` | `200` |
| `https://sidecyt-comecyt.edomex.gob.mx/admin/dashboard` sin sesión | `307` → `/login` del dominio |
| `http://10.250.36.241/login` con `Host` del dominio (sin pasar por el ELB) | `302` → `https://sidecyt-comecyt.edomex.gob.mx/login` |
| Lo mismo con `X-Forwarded-Proto: https` falsificado | `302` (no se confía en la cabecera fuera del rango) |
| `http://10.250.36.241/login` | `302` → `https://10.250.36.241/login` |
| `https://10.250.36.241/login` | `200` |
| `http://localhost` en el servidor | `302` → `https://10.250.36.241/` |
| `Host` no autorizado | `404` vacío |

### 3.2 IIS — log del sitio

Se agregaron campos personalizados al log del sitio `comecyt` (`C:\inetpub\logs\LogFiles\W3SVC2`):
`X-Forwarded-Proto`, `X-Forwarded-For`, `X-Forwarded-Host`, `X-Forwarded-Port` y `X-Real-IP`. Van al
final de cada línea. Sirven para ver la IP real del cliente y para diagnosticar el ELB.

### 3.3 Laravel — `apps\api\.env`

| Variable | Antes | Ahora | Para qué |
|---|---|---|---|
| `APP_URL` | `https://comecyt-sistemas.edomex.gob.mx` | `https://sidecyt-comecyt.edomex.gob.mx` | URLs de `/storage`, dominio del correo |
| `NEXT_PUBLIC_APP_URL` | `https://comecyt-sistemas.edomex.gob.mx` | `https://sidecyt-comecyt.edomex.gob.mx` | Enlaces en los correos |
| `NEXT_PUBLIC_REVERB_HOST` | `"comecyt-sistemas.edomex.gob.mx"` | `"sidecyt-comecyt.edomex.gob.mx"` | Informativo: el front no lo lee de aquí |
| `CORS_ALLOWED_ORIGINS` | `https://comecyt-sistemas…,http://10.250.36.241` | `https://sidecyt-comecyt.edomex.gob.mx,https://10.250.36.241,https://comecyt-sistemas.edomex.gob.mx,http://10.250.36.241` | Orígenes permitidos con credenciales |
| `TRUSTED_PROXIES` | `127.0.0.1` | `127.0.0.1,100.64.0.0/10` | Ver nota |

> **Por qué `TRUSTED_PROXIES`:** sin confiar en el ELB, `$request->ip()` devuelve la IP del ELB para
> **todos** los usuarios. `AuthLoginRateLimitMiddleware` (5 intentos/min por IP), `RateLimitMiddleware`
> y la auditoría los tratarían como uno solo, y bastarían 5 intentos fallidos de cualquiera para
> bloquear el login de todos.

La configuración de Laravel **no está cacheada** (`bootstrap\cache\config.php` no existe), así que
PHP lee el `.env` en cada petición. Se ejecutó `php artisan queue:restart` para que el worker de colas
tome el nuevo `APP_URL`.

### 3.4 Frontend — Next.js

| Archivo | Cambio |
|---|---|
| `apps\web\.env.local` | `NEXT_PUBLIC_API_URL=https://10.250.36.241/api` → **`/api`** (relativa). Se retiraron `NEXT_PUBLIC_REVERB_HOST/PORT/SCHEME` |
| `src\lib\echo.ts` | Sin `NEXT_PUBLIC_REVERB_HOST/PORT/SCHEME` usa el origen de la página (`window.location`) |
| `src\lib\server-api.ts` | `serverFetch` usa `API_INTERNAL_URL` (entorno) antes que `NEXT_PUBLIC_API_URL` |
| `next.config.ts` | Con API relativa no agrega origen a la CSP (`'self'` la cubre). WebSocket solo se declara si hay host explícito. `img-src` incluye el dominio. Sin orígenes vacíos en la CSP |
| Servicio NSSM `comecyt-web` | `AppEnvironmentExtra` + `API_INTERNAL_URL=https://10.250.36.241/api` |

El resto del código que usa `NEXT_PUBLIC_API_URL` funciona igual con la URL relativa: `api.ts`,
`useNotifications.ts`, `login-carousel.tsx`, `ConveniosClient.tsx` y `DocumentosAdjuntos.tsx`.

**Recompilado el 11/09/2026** siguiendo el E20 de `CLAUDE.md` (parar `comecyt-web`, `npm run build`,
copiar `static` y `public` al standalone, arrancar). Tardó 67 s. Resultado: 0 de 84 archivos JS contienen la
IP, y la CSP servida queda:

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:;
img-src 'self' data: blob: https://picsum.photos https://images.comecyt.gob.mx https://comecyt.edomex.gob.mx
https://comecyt-sistemas.edomex.gob.mx https://sidecyt-comecyt.edomex.gob.mx; connect-src 'self';
frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
```

> **Consecuencia útil:** ya **no hay que recompilar** el frontend si cambia el nombre del dominio o se
> accede por otro host autorizado. Solo cambian `web.config` y el `.env` de Laravel.

---

## 4. Trampa: caché de URL Rewrite (bucle infinito)

La primera versión de la regla usaba **una sola condición con dos variables concatenadas**:

```xml
<add input="{HTTP_X_FORWARDED_PROTO}|{REMOTE_ADDR}" pattern="^https\|100\.(...)" negate="true" />
```

Funcionaba en una prueba aislada, pero la caché interna de URL Rewrite (versión 7.2.1993) guardaba el
resultado **variando por la cabecera y no por la IP de origen**. Bastaba **una** petición por HTTP
directo a la IP con `Host` del dominio y `X-Forwarded-Proto: https` para dejar el `302` en caché. A partir
de ahí, todos los usuarios que llegaban por el ELB recibían un `302` hacia la misma URL: **bucle
infinito**.

Cómo se confirmó el 11/09/2026:

| Secuencia sobre una ruta nueva | ¿Envenena? |
|---|---|
| 3 peticiones directas **sin** `X-Forwarded-Proto` y luego el ELB | No |
| **1** petición directa **con** `X-Forwarded-Proto: https` y luego el ELB | **Sí** |
| 1 petición directa con `X-Forwarded-Proto: http` y luego el ELB | No |
| Lo mismo tras apagar la caché de kernel de HTTP.sys | **Sí**: no era esa caché |

**Corrección:** **una sola variable por condición**. Como la lógica es un "O" (*no viene del ELB* **o**
*viene del ELB sin https*), cada redirección se partió en dos reglas. Tras el cambio, ninguna de las
secuencias envenena, ni en `/login`, ni en rutas de Next, ni en `/api`.

> **Regla para cualquier cambio futuro:** en condiciones que dependan del origen de la petición,
> **nunca** concatenar variables. `VerificarDominio.ps1` falla si encuentra una condición concatenada
> en `web.config`.

La caché de respuestas del sitio se dejó apagada igualmente. Tampoco distingue el origen, y casi todo
lo sirven Next (vía ARR) y PHP, así que no aporta rendimiento apreciable.

---

## 5. Verificación

### Automática

```powershell
& "C:\Users\Administrator\Desktop\ADEM\_herramientas\VerificarDominio.ps1"   # solo el dominio; exit 0 = todo bien
& "C:\Users\Administrator\Desktop\ADEM\_herramientas\VerificarTodo.ps1"      # pentest completo + dominio
```

`VerificarDominio.ps1` comprueba:

- el DNS;
- el certificado del ELB y su vigencia;
- las redirecciones por dominio y por IP;
- HSTS y la CSP;
- el WebSocket;
- el **envenenamiento** (§4);
- que las IPs de origen del ELB en el log estén dentro del rango configurado;
- la configuración en disco: sin condiciones concatenadas, `TRUSTED_PROXIES`, `APP_URL`, la API relativa, el build sin la IP y `API_INTERNAL_URL`.

> Usar `&`, no `.` (dot-source): el script termina con `exit`.

### Manual, lo mínimo

```powershell
$d = 'sidecyt-comecyt.edomex.gob.mx'
curl.exe -sk -o NUL -w "%{http_code} -> %{redirect_url}`n" "https://$d/"        # 307 -> https://$d/login
# Envenenamiento: el segundo resultado debe ser 404, NUNCA 302
$p = "/api/prueba$(Get-Random)"
curl.exe -sk -o NUL -w "%{http_code}`n" -H "Host: $d" -H 'X-Forwarded-Proto: https' "http://10.250.36.241$p"
curl.exe -sk -o NUL -w "%{http_code}`n" "https://$d$p"
```

### Ver qué manda el ELB (log de IIS)

```powershell
netsh http flush logbuffer | Out-Null
$f = Get-ChildItem C:\inetpub\logs\LogFiles\W3SVC2 | Sort-Object LastWriteTime -Desc | Select-Object -First 1
Get-Content $f.FullName -Tail 20 | Select-String 'sidecyt-comecyt'
# Últimos 5 campos: X-Forwarded-Proto X-Forwarded-For X-Forwarded-Host X-Forwarded-Port X-Real-IP
```

---

## 6. Lo que falta probar

> **Antes de invitar a pruebas** (revisión del 11/09/2026):
> - **Cuentas:** las 4 cuentas del sistema son las de prueba y 3 siguen con la contraseña del seeder. Crear las cuentas reales y cambiar o desactivar estas primero.
> - **Correo:** no sale ningún correo (SMTP sin servicio), así que no probar recuperación de contraseña ni avisos por correo.
>
> Ver `docs/ESTADO_ACTUAL.md`.

- **Navegador con un usuario real por el dominio**: iniciar sesión, navegar por rol, subir un documento
  y verlo en la vista previa, recibir una notificación. Hasta ahora se verificó con `curl` (páginas,
  API, CORS, login con credenciales inválidas → `401`, WebSocket `101`).
- **Vista previa de adjuntos entrando por la IP:** con `APP_URL` en el dominio, las URLs de `/storage`
  apuntan al dominio. Desde `https://10.250.36.241` el iframe quedaría bloqueado por
  `X-Frame-Options: SAMEORIGIN` (otro origen). Es lo esperado, pero no se ha probado porque aún no hay
  adjuntos subidos. La vía oficial es el dominio.

---

## 7. Pendiente previo detectado (no causado por el dominio)

> **Resuelto — verificado el 24/09/2026 (E44).** El servicio `comecyt-web` ya tiene
> `NODE_EXTRA_CA_CERTS=C:\ProgramData\COMECYT\iis-10.250.36.241.pem` en su entorno NSSM y el render en servidor trae
> datos (probado con `/admin/audit-logs`). El efecto secundario descrito abajo (todas las llamadas desde la IP del
> servidor, un solo cubo de rate limit) se corrigió: `serverFetch` reenvía `X-Forwarded-For` y `TRUSTED_PROXIES`
> incluye `10.250.36.241`. Laravel toma la IP no confiable más a la derecha de la cadena: el cliente no puede
> falsificarla. Se conserva el texto original como historia.

**`serverFetch` falla con el certificado autofirmado.** Los Server Components (listados de admin,
revisor, evaluador y solicitante) llaman desde Node a `https://10.250.36.241/api`. Node rechaza el
certificado (`DEPTH_ZERO_SELF_SIGNED_CERT`), el `catch` lo oculta y esas páginas se renderizan con
listas vacías. Se comprobó con `node -e "fetch('https://10.250.36.241/api/carousel/slides')"`. Ya
fallaba antes de este cambio: los logs de IIS no registran ninguna petición de Node. **No se tocó.**

Opción de corrección, **no aplicada**: exportar el certificado `BBC4F9F90860A2B8D3AF0875D0DDA678D9E0AC38`
(`CN=10.250.36.241`, SAN con la IP) a PEM y agregarlo a `NODE_EXTRA_CA_CERTS` en el entorno NSSM de
`comecyt-web`. **Antes de aplicarla:** al funcionar, todas esas llamadas llegarán a Laravel desde la IP
del propio servidor, y el rate limit por IP las contaría juntas. Hay que revisar
`RateLimitMiddleware`/`ApiGatewayMiddleware` o reenviar la IP del cliente.

---

## 8. Qué necesita hacer o confirmar infraestructura

Correo listo para enviar: `Desktop\ADEM\_v4_dominio_sep11\CORREO_INFRAESTRUCTURA_DOMINIO.md`.

| # | Punto | Por qué importa | Si la respuesta es "no" |
|---|---|---|---|
| 1 | **Rango de IPs de origen del ELB** hacia nuestro servidor (hoy `100.127.0.48`). ¿Siempre dentro de `100.64.0.0/10`? | Una IP del ELB fuera del rango se trata como "no viene del ELB" → **bucle de redirección** para esos usuarios | Pedir la lista o el rango y aplicar el [§9](#9-si-cambia-el-rango-de-ips-del-balanceador) |
| 2 | **Redirección HTTP → HTTPS en el ELB** (puerto 80) | Hoy `http://sidecyt-comecyt.edomex.gob.mx` no responde; quien escriba la dirección sin `https://` no entra | No bloquea el uso por `https://` |
| 3 | **Tipo de health check** del ELB hacia el backend | Un check HTTP no envía `X-Forwarded-Proto` → recibe `302`. Si el ELB exige `200`, marcaría el servidor como caído | Recomendado: check **TCP al puerto 80**, o HTTP a `/up` aceptando `3xx` |
| 4 | **Tamaño máximo de petición y tiempos de espera** | La aplicación acepta PDFs de hasta **50 MB** (IIS y `php.ini`). Algunos procesos tardan decenas de segundos | Ajustar el límite de cuerpo a ≥ 50 MB y el timeout a ≥ 120 s |
| 5 | **Timeout de inactividad para WebSocket** | Las notificaciones en tiempo real mantienen una conexión abierta (`/app`) | Debe ser ≥ 60 s; si no, cae al polling cada 60 s (no se rompe nada) |
| 6 | **Que `X-Forwarded-Proto` lo fije el ELB**, sustituyendo el valor que pudiera mandar el cliente | IIS confía en esa cabecera cuando la petición viene del rango del ELB. Si el ELB la dejara pasar tal cual, una petición por HTTP podría hacerse pasar por HTTPS | Avisar: habría que revisar la configuración |

---

## 9. Si cambia el rango de IPs del balanceador

El rango aparece en **dos lugares que deben coincidir**:

1. **`apps\api\public\web.config`**: 5 condiciones con el patrón
   `^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\.`, en las reglas `DominioRedirectFueraDelElb`,
   `DominioRedirectElbSinTls`, `HttpsRedirect` y `HttpsRedirectElbSinTls`, y en la precondición
   `RespuestaSinHstsEnElb`.

   **Son 5 apariciones en DOS formas distintas** (localizadas el 14/09/2026; las líneas se mueven al
   editar el archivo, verificar siempre con el comando de abajo):

   | Forma | Patrón | Dónde | Líneas al 14/09/2026 |
   |---|---|---|---|
   | Larga (IP completa, anclada) | `^100\.(6[4-9]\|[7-9][0-9]\|1[01][0-9]\|12[0-7])\.[0-9]+\.[0-9]+$` | las 4 reglas de redirección | 164, 173, 190, 199 |
   | Corta (solo prefijo, sin `$`) | `^100\.(6[4-9]\|[7-9][0-9]\|1[01][0-9]\|12[0-7])\.` | precondición `RespuestaSinHstsEnElb` | 377 |

   **Cambiar las 5, no 4.** Si se olvida la corta, todo parece funcionar pero las respuestas propias
   de IIS que pasan por el ELB salen **sin HSTS**, y eso no se nota a simple vista: lo detecta la
   prueba *"HSTS tambien en respuestas propias de IIS"* de `VerificarDominio.ps1`.

   Localizarlas antes de editar:

   ```powershell
   $p = "F:\Desarrollo Tecnologico\apps\api\public\web.config"
   Select-String -Path $p -SimpleMatch '^100\.(6[4-9]' | ForEach-Object { "linea $($_.LineNumber)" }
   # Deben salir 5. Si salen menos, alguien ya toco el patron: revisar antes de continuar.
   ```

2. **`apps\api\.env`**: `TRUSTED_PROXIES=127.0.0.1,100.64.0.0/10`. Laravel acepta CIDR directo, así
   que aquí no hace falta traducir a expresión regular.

Para agregar otro rango, **mantener una sola variable por condición** y usar alternancia dentro del
mismo patrón. Ejemplo para sumar `10.200.50.0/24`:

```xml
<add input="{REMOTE_ADDR}" pattern="^(100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\.[0-9]+\.[0-9]+|10\.200\.50\.[0-9]+)$" negate="true" />
```

```env
TRUSTED_PROXIES=127.0.0.1,100.64.0.0/10,10.200.50.0/24
```

Después: respaldar, editar, y correr `VerificarDominio.ps1`. IIS recarga `web.config` solo y Laravel
lee el `.env` en cada petición. Solo `comecyt-queue` necesita `php artisan queue:restart`.

---

## 10. Reversión

> Revertir **vuelve a romper el dominio** (redirige a la IP). Solo si algo grave falla por IP.

```powershell
$root = 'F:\Desarrollo Tecnologico'; $b = "$root\backups\20260911-dominio-elb"
Copy-Item "$b\web.config" "$root\apps\api\public\web.config" -Force
Copy-Item "$b\api.env"    "$root\apps\api\.env" -Force
Set-Location "$root\apps\api"; C:\php\php.exe artisan queue:restart
Copy-Item "$b\web.env.local"         "$root\apps\web\.env.local" -Force
Copy-Item "$b\src_lib_echo.ts"       "$root\apps\web\src\lib\echo.ts" -Force
Copy-Item "$b\src_lib_server-api.ts" "$root\apps\web\src\lib\server-api.ts" -Force
Copy-Item "$b\next.config.ts"        "$root\apps\web\next.config.ts" -Force
Stop-Service comecyt-web -Force
robocopy "$root\apps\web\.next.bak-20260911-predominio" "$root\apps\web\.next" /MIR /NFL /NDL
Start-Service comecyt-web
```

`API_INTERNAL_URL` en NSSM y los campos extra del log de IIS pueden quedarse: no afectan nada.
`$b\iis-site-comecyt.xml` guarda la configuración del sitio en IIS tal como estaba antes.

---

## 11. Diagnóstico rápido

| Síntoma | Causa probable | Qué revisar |
|---|---|---|
| El dominio redirige a `https://10.250.36.241/` | El ELB dejó de mandar `X-Forwarded-Proto: https`, o su IP de origen salió del rango | Log de IIS (§5): columnas `c-ip` y `X-Forwarded-Proto` |
| **Bucle de redirección** en el dominio ("demasiadas redirecciones") | IP del ELB fuera del rango, o alguien concatenó variables en una condición | `VerificarDominio.ps1`; §4 y §9 |
| **`404 Not Found` con «ELB» debajo, en TODAS las rutas** | El balanceador no tiene ruta hacia el servidor. **No es del servidor**: la petición nunca llega | §12. Cabecera `X-ROUTER-STATUS`; primera prueba de `VerificarDominio.ps1` |
| `404` vacío en el dominio (solo algunas rutas, sin cuerpo) | El `Host` no está en `HostAllowList` (p. ej. otro nombre publicado) | `web.config`, regla `HostAllowList` |
| `502` en el dominio | `comecyt-web` detenido o caído | `Get-Service comecyt-web`; `logs\comecyt-web.err.log` |
| Login bloqueado para todos (`429`) | `TRUSTED_PROXIES` sin el rango del ELB: todos comparten IP | `.env` de Laravel |
| Notificaciones no llegan en tiempo real | WebSocket cortado por el ELB | Prueba `101` en `VerificarDominio.ps1`; timeout de inactividad del ELB |
| Enlaces de correos apuntan a otro dominio | `NEXT_PUBLIC_APP_URL` / `APP_URL` | `.env` de Laravel + `queue:restart` |
| Listados de admin vacíos al cargar | Pendiente previo de `serverFetch` (§7) | — |
| El ELB marca el servidor como caído | Health check HTTP que no acepta `302` | §8, punto 3 |

---

## 12. 14/09/2026 — Publicación externa: el balanceador nuevo no tiene la ruta

**Aviso de infraestructura (14/09/2026):** el sitio quedó publicado con IP pública
`187.189.139.176` / `201.131.40.176`, **EIP `10.200.41.131`**, IP interna `10.250.36.241`.

**Síntoma:** `https://sidecyt-comecyt.edomex.gob.mx` muestra una página `404 Not Found` con la
palabra `ELB` debajo, en todas las rutas.

**Causa: el dominio cambió de balanceador.** El DNS interno resolvía a `10.200.41.106` el 11/09 y
desde la publicación resuelve a **`10.200.41.131`**, un VIP distinto **sin la ruta al servidor
registrada**. El 404 lo genera el balanceador antes de entregar la petición.

**El servidor no tiene nada que corregir.** Evidencia recogida el 14/09/2026, 11:25–11:28 h:

| Prueba | Resultado |
|---|---|
| `https://$dominio/` vía `10.200.41.131` | `404`, `Server: elb`, `X-ROUTER-STATUS: MISS : cant find any router from cache or remote` |
| `https://$dominio/` vía `10.200.41.106` | `307 → /login`, con todas las cabeceras de la aplicación |
| Ruta única vía `10.200.41.106` | **Llega a IIS**: `17:27:45 … 100.127.0.48 … 404` (404 correcto de Laravel) |
| Ruta única vía `10.200.41.131` | **No aparece en el log de IIS** |
| Log de IIS del día completo | Cero peticiones desde `100.64.0.0/10` |
| `https://10.250.36.241/login` | `200` — el sitio funciona |
| `VerificarDominio.ps1` | Config en disco, acceso por IP y anti-envenenamiento **OK**; solo falla el bloque del dominio |

**Cómo distinguirlo de un 404 nuestro.** La cabecera `X-ROUTER-STATUS` la agrega el ELB, no IIS:

```powershell
$d = 'sidecyt-comecyt.edomex.gob.mx'
curl.exe -sk -D - -o NUL "https://$d/" | Select-String 'X-ROUTER-STATUS|Server'
# MISS : cant find any router...  -> falta la ruta en el balanceador, NO tocar el servidor
```

Comparar con el VIP anterior aísla la causa en una sola orden:

```powershell
foreach ($vip in '10.200.41.131', '10.200.41.106') {
    curl.exe -sk -o NUL -w "$vip -> %{http_code}`n" --resolve "${d}:443:$vip" "https://$d/"
}
```

Y la prueba definitiva, con una ruta única por VIP: la que pasa por el balanceador con ruta aparece
en el log de IIS; la otra no aparece nunca (§5 para leer el log).

**Descartado también en HTTP.sys.** Si el balanceador llegara con un `Host` que IIS no reconoce,
HTTP.sys lo rechazaría **antes** de entrar al sitio y no quedaría registrado en `W3SVC2`, sino en
`C:\Windows\System32\LogFiles\HTTPERR\httperr4.log`. Ahí tampoco hay nada del balanceador ese día
(las únicas dos entradas son `Timer_ConnectionIdle` de `10.10.21.10`, un equipo interno). Revisar
**los dos logs** antes de concluir que no llega nada.

**Escalado: correo ENVIADO el 14/09/2026**, texto en
`Desktop\ADEM\_v5_publicacion_sep14\CORREO_INFRAESTRUCTURA_404.md`. Pide registrar la entrega hacia
`10.250.36.241:80` con el nombre del dominio, tal como está en `10.200.41.106`, y **confirmar las IPs
de origen del VIP nuevo**. Seguimiento y cómo continuar:
`Desktop\ADEM\_v5_publicacion_sep14\LEEME.md`.

> **Lo único que hay que hacer aquí cuando respondan:** si el balanceador nuevo se conecta desde un
> rango distinto a `100.64.0.0/10`, cambiar **juntos** el patrón de las 5 condiciones de `web.config`
> y `TRUSTED_PROXIES` del `.env` (§9). Sin eso el dominio entrará en bucle de redirección en cuanto
> la ruta quede registrada.

**Puente si urge:** apuntar el DNS de vuelta a `10.200.41.106`, que sigue funcionando. Pierde la IP
pública, así que sirve como puente, no como destino.

## 13. 24/09/2026 — "El dominio se queda cargando" (caché de HTML) — E42

**Síntoma reportado:** al entrar por el dominio, la pantalla de carga (logo con anillos) no se retira y la
página nunca aparece. Desde el servidor, con navegador limpio, cargaba bien (splash oculto, sin errores).

**Causa:** Next.js marcaba el HTML prerenderizado con `s-maxage=31536000` (un año de caché **compartida**).
Cualquier intermediario que respete esa cabecera (el balanceador, un proxy institucional) podía seguir
entregando el HTML de un despliegue anterior, que referencia archivos `/_next/static/chunks/<hash>.js` que el
siguiente despliegue borró. Sin esos scripts React no arranca, y `RouteChangeOverlay` —que es quien oculta el
`#boot-splash`— nunca corre. El service worker **no** cachea HTML (se revisó), así que no era él.

**Corrección en tres capas:**
1. **IIS (`apps/api/public/web.config`)** — regla de salida `HtmlSinCacheCompartida` con la precondición
   `RespuestaHtmlORsc` (`text/html` o `text/x-component`): reescribe `Cache-Control` a
   `private, no-cache, no-store, max-age=0, must-revalidate`. Los estáticos con hash (`/_next/static`) siguen con
   `public, max-age=31536000, immutable` y la API no cambia. Respaldo previo:
   `web.config.bak-20260924-prehtmlcache`.
2. **Despliegue (`deploy-web.ps1`)** — tras un build correcto copia primero los `static` del respaldo
   (`robocopy ... /E /XO`) y encima los nuevos: una pestaña abierta o una copia vieja todavía encuentra sus
   scripts. Los nombres llevan hash, no chocan. (Crece `standalone\.next\static` con cada despliegue; se limpia
   al borrar respaldos viejos.)
3. **Navegador (`app/layout.tsx`, `RECUPERAR_CARGA`)** — script en línea en `<head>`: si falla un script de
   `/_next/static`, aparece un `ChunkLoadError`, o a los 15 s el splash sigue visible, recarga **una sola vez**
   (bandera en `sessionStorage`, ventana de 60 s, nunca en bucle) con `?_r=<hora>` para saltarse cualquier copia
   guardada; el parámetro se limpia de la barra después. Constante propia, sin datos de usuario (la CSP ya permite
   `'unsafe-inline'`; no se relajó nada).

**Verificación:** `curl.exe -sk -D - https://sidecyt-comecyt.edomex.gob.mx/sigae` → `Cache-Control: private,
no-cache, no-store...` con HSTS, XFO y CSP intactas; Edge headless por el dominio: splash oculto en la primera
visita y al recargar con el service worker ya instalado. Los `ERR_ABORTED` de `?_rsc=` que aparecen son prefetch
de Next cancelados al cerrar la página: normales.

**Pendiente con infraestructura:** preguntar si el ELB cachea respuestas; si sí, que purgue y respete
`Cache-Control`. Un usuario que ya tenga la copia vieja se recupera solo con el script (o con Ctrl+F5).
