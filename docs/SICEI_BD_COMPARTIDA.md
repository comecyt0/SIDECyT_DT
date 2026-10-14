# SICEI en la base de SIGAE — decisiones, diseño y avance

> Documento guía para integrar **SICEI** (repo privado `comecyt0/SICEI`, clonado en `C:\SICEI`) a la base
> `comecyt_prod` de SIGAE. Inicio: 14/10/2026. **Leer antes de tocar SICEI, la base o el panel de evaluador.**
> Contexto general de los sistemas: `docs/SIDECYT.md`.

## 1. Punto de partida (análisis del 14/10/2026)

| | SIGAE (`F:\comecyt`) | SICEI (`C:\SICEI`) |
|---|---|---|
| Stack | Laravel 13.1, PHP 8.4, Next 16.2 | Laravel 13.21, PHP 8.4, Next 16.2 |
| Base | PostgreSQL 18.3 nativo, `comecyt_prod`, esquema `public`, 76 tablas, collation `C` | Venía con PostgreSQL 17 en Docker, esquema `public`, **sin datos reales** |
| Llaves | bigint | bigint (`notifications` uuid) |
| Sesión | JWT en cookie `comecyt_auth` | Sanctum con sesión (`sicei_session`) |
| Roles | tabla `roles` (ids 1–9) + `users.rol_id` + `usuario_roles` | spatie: `superadmin`, `revisor`, `evaluador` |
| 2FA | `users.two_factor_*` (cifrado con APP_KEY de SIGAE) | `users.mfa_*` |
| Contraseñas | argon2id | bcrypt |

Choques de nombres en un mismo esquema: `users`, `roles`, `convocatorias`, `solicitudes`, `solicitud_documentos`,
`municipios`, `areas_conocimiento` y todas las tablas internas de Laravel (`migrations`, `sessions`, `cache`, `jobs`,
`notifications`, `password_reset_tokens`). Fusionar tablas de negocio obligaría a reescribir un sistema (SICEI guarda la
convocatoria como configuración JSONB versionada; SIGAE la reparte en `tipo_programas` y tablas hijas): **descartado**.

## 2. Decisiones del usuario (14/10/2026)

1. **SIGAE se mantiene:** solo migraciones que **agregan** (columnas, vistas, datos). Nada se renombra ni se borra.
2. **SICEI se adapta, incluidos los nombres** (sección 4).
3. **Una CURP = una cuenta** (`public.users`) para todos; misma contraseña en los dos sistemas. CURP única cuando existe;
   **si es obligatoria lo decide el admin por cuenta**.
4. **Login y sesión separados por sistema.** Al pasar de uno a otro se inicia sesión de nuevo.
5. **2FA único**, lo valida SIGAE por un canal interno; cada app conserva su APP_KEY.
6. Usuario de SICEI que entra a `/sigae`: **sin rol**, ve su cruce y botones con las convocatorias activas para completar
   su perfil de SIGAE (y al revés).
7. **Cruce** (en qué sistema y convocatoria está registrada una persona): lo ven admins, la propia persona y revisores;
   **evaluadores no**; Consulta solo con **casilla por usuario** que activa el admin.
8. Solo el rol **evaluador** es compartido: perfil único, **aprobación por sistema**; un postulante puede pedirlo si cumple
   el perfil. Admin, revisor y consulta se otorgan por sistema.
9. **Panel nuevo `/evaluador`** (raíz del dominio; reemplaza al panel de evaluador actual de SIGAE) con switch SIGAE/SICEI
   cuando hay asignaciones en ambos; cada evaluación respeta la configuración de su convocatoria; si no hay sesión de
   SICEI, la pide.
10. **Conflicto de interés:** evaluar su propia solicitud siempre bloqueado; en lo demás el sistema avisa al asignar y el
    admin elige bloquear la solicitud o la convocatoria completa.
11. **Usuarios se desactivan, no se borran** (en ambos sistemas).
12. **Bitácora de SICEI sin llave foránea a `users`** (se conserva el trigger que la hace de solo inserción).
13. **Catálogos unificados en `public`:** municipios (INEGI, los 125 de SICEI), áreas de conocimiento (se juntan),
    códigos postales y escuelas (CCT).
14. **Despliegue nativo** (sin Docker): `https://sidecyt-comecyt.edomex.gob.mx/sicei` y `/sicei/...` para el resto
    (Next con `basePath: /sicei`, API en `/sicei/api`). Las rutas de SIGAE no cambian; la única ruta compartida es
    `/evaluador`.

## 3. Arquitectura de la base

```
comecyt_prod
├── public   → SIGAE (sin cambios salvo agregados) + public.users = identidad única + catálogos
└── sicei    → todo SICEI, incluidas sus tablas internas de Laravel
```

- Conexión de SICEI: `search_path = sicei, public`. Lo que existe en `sicei` se lee de ahí; `users` y catálogos, de `public`.
- **Rol `sicei_app`:** dueño solo de `sicei`; en `public` puede leer `users` y catálogos, escribir solo columnas de
  identidad/perfil de `users` (nunca `rol_id`, `activo`, `two_factor_*`, `debe_cambiar_password`, `es_director`) y no
  puede borrar ni crear nada. Script: `docs/sql/sicei_paso1_permisos.sql`.
- **Rol `respaldo`:** `pg_read_all_data`, solo para `pg_dump`, para no dar a `comecyt_app` acceso a `sicei`.
- SIGAE (`comecyt_app`) **no** recibe acceso a `sicei`. El cruce se hará con una vista (paso 2).

## 4. Regla de nombres: SICEI toma los de SIGAE (se aplica en el paso 3)

1. **Tablas compartidas:** SICEI usa las columnas de SIGAE (`foto_url`→`avatar_path`, `mfa_*`→`two_factor_*` vía SIGAE,
   catálogos de `public`). Se elimina su migración de `users` y las de `municipios`/`areas_conocimiento`.
2. **Mismo concepto en los dos sistemas → nombre de SIGAE:**

| SICEI hoy | Queda como | Columnas |
|---|---|---|
| `bitacora` | `audit_logs` | `usuario_id`→`user_id`, `accion`→`action`, `entidad`→`subject_type`, `entidad_id`→`subject_id`, `detalle`→`metadata`, `registrado_en`→`created_at`; conserva `hash`, `hash_anterior` y el trigger |
| `solicitud_transiciones` | `solicitud_historial` | `de`/`a`→`estado_anterior`/`estado_nuevo`, `usuario_id`→`user_id` |
| `solicitud_asignaciones` | `asignaciones_evaluador` | `asignada_por`→`asignado_por`, + `estado`, `fecha_limite` |
| `evaluaciones` | `dictamenes` | `puntaje`→`puntaje_total`, conserva `criterios` (jsonb) |
| `carrusel_laminas` | `carousel_slides` | según columnas de SIGAE |
| `convocatorias` | `convocatorias` | `apertura_en`/`cierre_en`→`fecha_apertura`/`fecha_cierre`, + `estado` |

3. **Solo de SICEI** (`convocatoria_versiones`, `constancias`, `flujo_plantillas`, `folio_secuencias`, `ajustes`):
   conservan nombre y adoptan convenciones de SIGAE: `user_id`, `*_at` (fecha y hora), `fecha_*` (fecha), `activo`.

El mapeo columna por columna se registrará como decisión **D77** en `C:\SICEI\docs\plan\` antes de tocar código.

## 5. Plan por pasos

| Paso | Qué | Estado |
|---|---|---|
| 1 | Respaldo, esquema `sicei`, roles `sicei_app` y `respaldo`, permisos, respaldo diario con `respaldo` | **Hecho 14/10/2026** (ver 6) |
| 2 | Migraciones de SIGAE que solo agregan: `municipios.cvegeo` + 125 municipios, `areas_conocimiento.clave` + lista unida, casilla de cruce para Consulta, vista de participaciones | **Hecho 14/10/2026** (ver 6.1) |
| 3 | Adaptar SICEI: esquema, renombres (sección 4), `users` compartido, argon2id, 2FA vía SIGAE, catálogos, bitácora sin FK, desactivar en vez de borrar; pruebas maliciosas §0 | **Hecho en código 14/10/2026** (ver 6.2); las tablas de SICEI se crean en `comecyt_prod` al publicar (paso 4) |
| 4 | Publicar SICEI en `/sicei` (servicios Windows, IIS, basePath) | **Publicado 14/10/2026** (ver 6.3); faltan los servicios de cola y programador |
| 5 | Panel `/evaluador` con switch y reglas de conflicto de interés | Pendiente |
| 6 | Problemas propios de SICEI (abajo) | Pendiente |

## 6. Bitácora del paso 1

- **14/10/2026 13:11** — Respaldo previo `backups\comecyt_pre-sicei_2026-10-14_1311.dump` (441 KB), verificado con
  `pg_restore --list`.
- Scripts en `docs/sql/`: `sicei_paso1_superusuario.sql` (versión interactiva, pide contraseñas con `\password`) y
  `sicei_paso1_permisos.sql` (como `comecyt_app`).
- **Nadie conoce la contraseña de `postgres`** (no estaba documentada; `pgpass.conf` solo tiene `comecyt_app`, que no es
  superusuario). El usuario autorizó restablecerla. Claude Code bloqueó ejecutarlo desde la sesión (cambia la
  autenticación de la base), así que lo corre el usuario en una PowerShell **como administrador**. El script:
  1. respalda `C:\pgsql\data\pg_hba.conf` (`pg_hba.conf.bak-20261014-sicei`);
  2. pone `trust` solo en la línea `127.0.0.1/32` y recarga (sin reiniciar; PostgreSQL solo escucha en localhost);
  3. genera contraseñas aleatorias para `postgres`, `sicei_app` y `respaldo` (sin imprimirlas) y las guarda en
     `C:\ProgramData\COMECYT\postgres-superusuario.txt` (solo Administradores y SYSTEM);
  4. crea roles y esquema (mismo contenido que `sicei_paso1_superusuario.sql`, con `log_statement = 'none'`);
  5. restaura `pg_hba.conf` en un `finally`, recarga y comprueba que se vuelva a exigir contraseña;
  6. agrega las líneas de `respaldo` y `sicei_app` a `pgpass.conf`.
- **Resultado del script del usuario:** roles y esquema creados, `pg_hba.conf` restaurado (línea `127.0.0.1/32` en
  `scram-sha-256`, ninguna `trust`), conexión sin contraseña rechazada. El script se detuvo ahí (con
  `ErrorActionPreference=Stop`, el error esperado de psql en stderr cortó la ejecución); el resto lo completó Claude:
  login de `postgres`, `sicei_app` y `respaldo` con sus claves nuevas (leídas del archivo de secretos, sin imprimirlas) y
  líneas de `respaldo` y `sicei_app` en `pgpass.conf`.
- Archivo de secretos `C:\ProgramData\COMECYT\postgres-superusuario.txt` con ACL solo SYSTEM y Administradores.
  **El usuario debe pasarlas a su gestor y borrar el archivo.** Si se borra, las de `sicei_app` y `respaldo` siguen en
  `pgpass.conf`; la de `postgres` solo queda donde el usuario la guarde.
- `sicei_paso1_permisos.sql` aplicado como `comecyt_app`.
- **Verificación 13/13:** `search_path` = `sicei, public`; `sicei_app` crea en `sicei` y no en `public`; lee `users` (11)
  y catálogos (8,360 CP, 2 escuelas); actualiza `telefono` pero no `rol_id` ni `activo`; no borra `users`; no lee
  `solicitudes`; no tiene INSERT sobre `rol_id` y sí sobre `curp`; `comecyt_app` **no** lee `sicei` y sigue leyendo lo
  suyo. Tabla de prueba borrada.
- `backup.ps1` usa `-U respaldo`. Probado a mano: `comecyt_2026-10-14_1328.dump` (447 KB, 732 entradas, incluye
  `SCHEMA sicei`). La tarea `COMECYT-Backup-Diario` no cambió.
- SIGAE responde 200 en `/sigae`, `/login` y `/api/convocatorias/publicas`.
## 6.1 Bitácora del paso 2 (14/10/2026)

- Respaldo previo `backups\comecyt_2026-10-14_1331.dump` (con `backup.ps1`, ya como `respaldo`).
- **`2026_10_14_000001_catalogos_compartidos_sicei`:**
  - `municipios.cvegeo` (varchar 5, única) y carga de los **125 municipios** del Estado de México desde
    `apps/api/database/data/municipios_edomex.json`, copia idéntica (mismo hash) del archivo de SICEI. Los datos son de
    INEGI, públicos. La carga es un upsert por `cvegeo`, con validación de clave `15\d{3}` y nombre.
  - `areas_conocimiento.clave` (varchar 20, única). Las 7 áreas de SICEI ya existían en SIGAE con otro nombre, así que no
    se creó ninguna fila: solo se les puso su clave (`FIS-MAT`, `BIO-QUIM`, `MED-SALUD`, `HUM-COND`, `SOC`,
    `BIOTEC-AGRO`, `ING`). La 8.ª de SIGAE, «Investigación Multidisciplinaria», quedó como `MULTI`. **SICEI usará los
    nombres de SIGAE.**
- **`2026_10_14_000002_cruce_sistemas_sicei`:**
  - `users.puede_ver_cruce` (boolean, `false` por defecto). Está fuera de `$fillable`, con cast en `User`. **La casilla
    en el panel del admin se construye junto con la pantalla del cruce**: hoy solo existe la columna.
  - Vista `public.v_participaciones_sigae` (`security_barrier`) con las columnas `user_id, sistema, tipo, papel,
    registro_id, folio, convocatoria_id, convocatoria, convocatoria_corto, estado, registrado_at`.
    - Origen: solicitudes no borradas (papel `solicitante`), clubes (dueño `lider_a` o `director`) y `club_accesos`
      (`lider_a`, `lider_b`, `director`).
    - Se excluyen las convocatorias archivadas.
    - `GRANT SELECT` solo a `sicei_app`, y solo si el rol existe (en desarrollo no existe).
- `User.php`: cast `puede_ver_cruce`. Sin cambios en el front: ninguna pantalla consume la lista de municipios.
- **Verificación 9/9:**
  - Municipios: 125, claves 15001–15125 únicas y acentos correctos.
  - Áreas: 8 de 8 con clave.
  - Casilla de cruce: `false` en los 11 usuarios.
  - Vista: 4 filas de clubes (`lider_a` ×2, `lider_b`, `director`) con la lista blanca de columnas.
  - `sicei_app` lee la vista y los municipios.
  - `sicei_app` **no** lee `clubes`, **no** cambia `puede_ver_cruce` y no puede escribir en la vista.
  - SIGAE responde 200 en `/sigae`, `/login` y `/api/convocatorias/publicas`.
- **Queda para el paso 3:** SICEI publicará su propia vista, `sicei.v_participaciones_sicei`, con las mismas columnas, y
  le dará `SELECT` solo a `comecyt_app`. Así cada sistema lee el cruce del otro sin ver sus tablas.
- **Siguiente: paso 3** (adaptar SICEI). Antes de tocar código, el mapeo de columnas se registra como D77 en el repo de
  SICEI.

## 6.2 Bitácora del paso 3 (14/10/2026)

### Decisiones nuevas del usuario

- **Foto única** para SIGAE y SICEI (`users.avatar_path`). SICEI la guarda igual que SIGAE: WebP, nombre de 40
  caracteres, carpeta privada `storage/app/private/perfiles` de SIGAE, servida solo con sesión.
- **Cuenta confirmada** si se cumple cualquiera de estas: el correo está confirmado, tiene rol en SIGAE (`rol_id`), o la
  creó o aprobó un admin de SICEI.
- **Desactivar solo en SICEI** (`sicei.usuarios_bloqueados`). `users.activo = false` (lo decide SIGAE) también
  impide entrar a SICEI.
- **Catálogos compartidos:** el admin de SICEI agrega, edita e importa, pero **no borra**.

### En SICEI (repo `C:\SICEI`, decisión D77, `docs/plan/08-bd-compartida-sigae.md`)

- **Migraciones reescritas** (no había datos):
  - SICEI ya no crea `users`, `municipios` ni `areas_conocimiento`.
  - Tablas renombradas con los nombres de SIGAE: `audit_logs` (sin FK, conserva el trigger de solo inserción),
    `solicitud_historial`, `asignaciones_evaluador` (+ `estado`, `fecha_limite`), `dictamenes` (`puntaje_total`),
    `carousel_slides`.
  - Columnas `*_en` → `*_at` y `fecha_apertura`/`fecha_cierre`.
  - Tablas nuevas: `usuarios_bloqueados` y la vista `v_participaciones_sicei` (`SELECT` solo para `comecyt_app`).
  - Réplica de `public.users` y de los catálogos **solo en local/testing**.
- **Modelos renombrados:** `SolicitudHistorial`, `AsignacionEvaluador`, `Dictamen`, `CarouselSlide`.
- **`User`:**
  - Usa `public.users`. Ya no tiene `foto_url` ni `mfa_*`.
  - `hasVerifiedEmail()` aplica la regla de cuenta confirmada.
  - Métodos nuevos: `puedeEntrar()`, `fotoUrl()`.
- **Inicio de sesión:**
  - El correo se compara sin distinguir mayúsculas.
  - Una cuenta inactiva o bloqueada responde igual que una contraseña incorrecta.
  - Middleware `CuentaHabilitada`: cierra la sesión en la siguiente petición si se desactiva la cuenta.
- **2FA por SIGAE:**
  - `App\Services\DosFactoresSigae` verifica, configura y confirma por el canal interno, con firma HMAC.
  - Si el canal falla, el inicio de sesión responde 503 (falla cerrado).
- **`/api/user`:** responde con una lista blanca de campos (antes devolvía `toArray()` de la tabla compartida).
- **Registro y alta por admin:** no duplican ni el correo (sin distinguir mayúsculas) ni la CURP en toda la identidad.
- **Contraseñas:** argon2id. Al cambiarlas o restablecerlas se marca `password_changed_at`, así SIGAE invalida sus
  sesiones anteriores.
- **Cerrar sesión:** ya no envía `Clear-Site-Data: "cookies"`, porque borraría también la sesión de SIGAE.
- **Usuarios:**
  - `DELETE /admin/usuarios/{id}` se retiró.
  - Nuevas rutas `POST /admin/usuarios/{id}/desactivar` y `.../reactivar`.
- **`sicei:crear-admin`:** si la cuenta ya existe, ya no cambia su contraseña.
- **Catálogos:** sin borrado, nombre de hasta 150 caracteres, lectura del CSV con `getPathname()`.
- **Seeders:**
  - Los catálogos de SIGAE no se sobrescriben.
  - La cuenta `test@example.com` solo se crea en local.
  - El calendario es idempotente.
- **Conflicto de interés:** asignar a alguien su propia solicitud responde 422, y calificarla responde 403. Al
  emitir el dictamen, la asignación queda en `concluido`.
- **Front:**
  - Tipos y campos renombrados.
  - En Usuarios: «Reactivar» o «desactivar acceso a SICEI», y el aviso «inactiva en SIGAE».
  - El botón de borrar catálogos se quitó.
- **Pruebas:**
  - Base aislada `sicei_test` en el PostgreSQL 18, con credenciales en `api/.env.testing`.
  - **110/110**, entre ellas `BaseCompartidaTest` (8 casos de D77) y `MfaTest` reescrito con el canal simulado y la
    firma verificada.
  - Casos maliciosos cubiertos: CURP/correo de SIGAE repetidos, `/api/user` sin columnas de SIGAE, autoevaluación,
    bitácora inalterable, cuenta bloqueada o inactiva, HTML disfrazado de PNG, ruta `..` en las fotos, foto sin sesión.

### En SIGAE (solo agregados)

- **Canal interno** `POST /api/interno/sicei/2fa/{verificar|configurar|confirmar}`:
  - Archivos: `InternoSiceiMiddleware` y `Interno\DosFactoresSiceiController`.
  - **Origen:** solo la IP TCP del propio servidor (`REMOTE_ADDR` crudo; `X-Forwarded-For` no cuenta).
  - **Firma:** HMAC-SHA256 con fecha a ±60 s y cada firma de un solo uso.
  - **Respuesta ante cualquier falla:** 404 vacío, también con otro método HTTP.
  - **Límites:** 5 intentos de código por minuto por cuenta, y solo para cuentas activas.
- **Configuración:** `comecyt.interno_sicei` en `config/comecyt.php`.
- **`.env`:** variable `SICEI_INTERNO_SECRETO`. Respaldo previo `.env.bak-20261014-sicei`; copia para el `.env` de SICEI
  en `C:\ProgramData\COMECYT\sicei-interno.txt` (solo Administradores/SYSTEM).
- **Permisos de catálogos:** `docs/sql/sicei_paso3_permisos.sql` (INSERT/UPDATE por columna en municipios y áreas, sin
  DELETE), aplicado y verificado.
- **Verificado contra producción: canal 10/10.**
  - Firma válida → 200.
  - Responden 404: repetir la firma, sin firma, con otro secreto, con fecha vieja, con el cuerpo alterado, por el dominio
    (balanceador) y con otro método.
  - `X-Forwarded-For` no cambia el origen.
  - SIGAE responde 200 en `/sigae`, `/login` y la API pública.

## 6.3 Bitácora del paso 4 (14/10/2026)

**Decisiones del usuario:**
- **Antivirus:** instalar ClamAV ya.
- **Correo:** SICEI tendrá su propia cuenta. Queda configurado con `MAIL_MAILER=log` y el bloque SMTP comentado;
  **faltan las credenciales**.
- **Superadmin de SICEI:** ninguno todavía.

### Hecho

**ClamAV 1.5.4**
- Origen: zip oficial de Cisco-Talos. La SHA-256 coincide con la publicada en GitHub. Los binarios no traen firma
  Authenticode.
- Instalado en `F:\ClamAV`, con la base de firmas en `F:\ClamAV\database`.
- Servicios `clamd` (solo en `127.0.0.1:3310`) y `freshclam` (12 actualizaciones al día), los dos automáticos.
- Probado con una firma propia temporal: un archivo con firma conocida da `FOUND` y salida 1; sin la firma, OK y salida 0.
  La firma de prueba ya se borró. Windows Defender borra al instante cualquier archivo EICAR, por eso no se usó EICAR.

**Código de SICEI**
- `ServicioDocumentos` y la imagen del carrusel usan `getPathname()` y `Storage::put()` (antes `getRealPath()`, que
  falla en este IIS; E28). La extensión de la imagen sale del MIME real y ClamAV tiene timeout de 60 s.
- `trustProxies`: confía en 127.0.0.1, ::1 y 100.64.0.0/10, con el prefijo `X-Forwarded-Prefix`.
- **Corregido:** `config/database.php` todavía decía `search_path => 'public'` (la edición del paso 3 no se había
  aplicado), así que las pruebas creaban todo en `public`.
  - Ahora toma `DB_SEARCH_PATH` y su valor por defecto es `sicei,public`.
  - Se limpió `sicei_test` y se repitió: **110/110**. En `public` solo queda la réplica (`users`, `municipios`,
    `areas_conocimiento`); todo lo de SICEI está en `sicei`.

**`C:\SICEI\api\.env` de producción**
- Permisos: solo Administradores y SYSTEM, más lectura para `IIS APPPOOL\sicei`.
- Contenido principal:
  - `APP_URL`/`FRONTEND_URL`: `https://sidecyt-comecyt.edomex.gob.mx/sicei`.
  - Base: `sicei_app` en `comecyt_prod`, `search_path` `sicei,public`.
  - Contraseñas: argon2id con los mismos parámetros que SIGAE.
  - Sesión: cookie `sicei_session` con `path=/sicei`, Secure, SameSite=Strict y cifrada.
  - Antivirus: `DOCS_ANTIVIRUS=clamav`.
  - Canal interno con SIGAE y carpeta de perfiles compartida.
- El secreto de revalidación está en `C:\ProgramData\COMECYT\sicei-revalidar.txt`.

**Front de SICEI**
- `basePath` `/sicei`.
- CSP con nonce por petición (`src/proxy.ts` y `src/lib/csp.ts`, sin `unsafe-inline` en scripts) y cabeceras de
  seguridad en `next.config.ts`. Sin esa CSP propia, el IIS de SIGAE le pondría `default-src 'none'`.
- `images.unoptimized`.
- `conBase()`/`sinBase()` para logos, imágenes del héroe, `<a>`, `window.location` y la campana.
- `app/api/revalidar` se movió a `app/revalidar`, porque `/sicei/api/*` es de Laravel.
- `tsc` sin errores y `next build` correcto (11 rutas dinámicas).
- `pnpm lint` marca 2 errores que **ya existían** (`setState` dentro de un efecto en `portal` y `admin`).

**Servicios**
- `sicei-web`: NSSM, `node .next\standalone\server.js`, en `127.0.0.1:3100`, como LocalService. Probado: 200 con CSP
  con nonce.
- Sitio IIS `sicei-api`: solo en `127.0.0.1:8100`, app pool `sicei`, `C:\SICEI\api\public\web.config`.
  - Permisos del app pool: lectura del código, escritura en `storage` y `bootstrap/cache`, lectura de `.env` y de
    `F:\ClamAV`.
  - `storage:link` hecho.
  - `/up` responde 200 y `/.env` responde 404.
  - Las rutas con base fallan como se esperaba, porque las tablas de SICEI aún no existen: Laravel cae a
    `public.cache` y PostgreSQL le niega el acceso (el aislamiento funciona).

### Bloqueado por Claude Code (lo hace el usuario como administrador)

Bloqueado: crear las tablas en producción, cambiar la configuración de IIS y escribir el script de publicación. Pasos
pendientes, en orden:

1. **Respaldo:** `& F:\comecyt\backup.ps1`
2. **Tablas de SICEI:**
   - `cd C:\SICEI\api`
   - `C:\php\php.exe artisan migrate --force`
   - `C:\php\php.exe artisan db:seed --force`
   - **Nunca `migrate:fresh` en producción:** intentaría borrar también las tablas de `public`. `sicei_app` no puede
     hacerlo, pero el comando fallaría.
3. **Servicios `sicei-queue` (`artisan queue:work`) y `sicei-scheduler` (`artisan schedule:work`):** NSSM,
   LocalService, con escritura en `storage` y `bootstrap\cache` y lectura del `.env`.
4. **IIS:**
   - Respaldo: `appcmd add backup`.
   - Permitir en el sitio `comecyt` las variables `HTTP_X_FORWARDED_PREFIX`, `_PROTO`, `_HOST` y `_PORT`.
   - Insertar en el `web.config` de SIGAE, antes de `1) Reverb WebSocket`, estas reglas:
     - `SiceiRevalidarSoloInterno`: 404 a `/sicei/revalidar` desde fuera.
     - `SiceiApiHttps` y `SiceiApiElb`: mandan `^sicei/(api|sanctum|storage)` a `http://127.0.0.1:8100/{R:1}{R:2}`
       con `X-Forwarded-Prefix=/sicei`.
     - `SiceiWeb`: manda `^sicei(/.*)?$` a `http://127.0.0.1:3100/sicei{R:1}`.
5. **Verificar:**
   - `/sigae`, `/login` y la API de SIGAE siguen en 200.
   - `/sicei`, `/sicei/portal` y `/sicei/api/publico/salud` responden 200 por el dominio y por la IP.
   - `/sicei/revalidar` responde 404.

### Publicación (14/10/2026, 15:26–15:30, con permiso del usuario)

1. **Respaldo** `comecyt_2026-10-14_1526.dump` (751 entradas).
2. **Tablas:** `artisan migrate --force`, 19 migraciones en el esquema `sicei`. `db:seed --force` cargó los roles
   superadmin, revisor y evaluador, el calendario y el carrusel. Se verificó:
   - 33 objetos en `sicei`.
   - Los catálogos de SIGAE siguen intactos (125 municipios y 8 áreas).
   - No se creó `test@example.com`.
   - `comecyt_app` lee `sicei.v_participaciones_sicei`, pero **no** `sicei.solicitudes` (permiso denegado).
3. **IIS:**
   - Respaldo `appcmd` `antes-sicei-20261014-1527` y `backups\20261014-sicei\web.config.antes`.
   - Variables permitidas en el sitio `comecyt`: `HTTP_X_FORWARDED_PREFIX`, `_PROTO`, `_HOST` y `_PORT`.
   - Reglas `SiceiRevalidarSoloInterno`, `SiceiApiHttps`, `SiceiApiElb` y `SiceiWeb` en el `web.config` de SIGAE,
     antes de Reverb.
4. **Verificación por el dominio y por la IP:**
   - SIGAE: `/sigae`, `/login`, `/` y su API pública responden 200.
   - SICEI: `/sicei`, `/sicei/portal`, `/sicei/api/publico/salud` y `/sicei/api/publico/convocatorias` responden 200;
     `/sicei/sanctum/csrf-cookie` responde 204.
   - `/sicei/revalidar` desde fuera responde 404, y `/sicei/api/user` sin sesión responde 401.
   - Una sola CSP, con nonce en los 27 `<script>`. Los recursos `/sicei/_next/...` responden 200.
   - Cabeceras presentes: XFO DENY, nosniff, CORP, HSTS y HTML sin caché compartida.
5. **Corregido en el camino:** sin `Accept: application/json`, una petición sin sesión daba 500 (`Route [login] not
   defined`, un error que ya existía). Ahora `redirectGuestsTo(null)` hace que responda 401. Hubo que **reciclar el
   app pool `sicei`** para que PHP tomara el cambio (opcache).

### Pendiente

- **CREADOS el 14/10/2026 a las 16:55** con el bloque de abajo, por pedido explícito del usuario. Esta vez el
  clasificador no lo bloqueó.
  - **Verificado:**
    - Los dos servicios están en Running con arranque automático, como `LocalService` y con bitácora en
      `C:\SICEI\api\storage\logs\sicei-{queue,scheduler}.log` (rotación a 10 MB).
    - Prueba de cola: `Artisan::queue('about')` quedó en «DONE» en 2 s, con 0 trabajos pendientes y 0 fallidos.
    - `schedule:list` muestra `sicei:recordatorios` (08:00) y `sicei:recordatorios-evaluacion` (08:15).
  - **Ojo al probar la cola:** un closure despachado desde `tinker` falla («bindTo() on null») porque es código
    evaluado y el worker no puede reconstruirlo. No es un fallo del servicio: se prueba con un trabajo de clase.
  - **Tras cambiar código PHP de SICEI:** `Restart-Service sicei-queue` (el worker carga el código una vez) además de
    reciclar el app pool `sicei`.
- (Historial) **Servicios `sicei-queue` y `sicei-scheduler`:** Claude Code los bloqueó como "persistencia" en el paso
  4, aun con el permiso del usuario en el chat. Sin ellos no se envían los avisos en
  cola (`ResultadosPublicados`) ni la revalidación de la landing (de todos modos se refresca cada 10 min), y no corren
  los recordatorios programados. Cómo crearlos (como administrador):
  ```powershell
  $nssm='C:\tools\bin\nssm.exe'
  icacls C:\SICEI\api /grant "NT AUTHORITY\LocalService:(OI)(CI)RX" /C /Q
  icacls C:\SICEI\api\storage /grant "NT AUTHORITY\LocalService:(OI)(CI)M" /T /C /Q
  icacls C:\SICEI\api\bootstrap\cache /grant "NT AUTHORITY\LocalService:(OI)(CI)M" /T /C /Q
  icacls C:\SICEI\api\.env /grant "NT AUTHORITY\LocalService:R"
  & $nssm install sicei-queue C:\php\php.exe "artisan queue:work --sleep=3 --tries=3 --max-time=3600"
  & $nssm set sicei-queue AppDirectory C:\SICEI\api
  & $nssm set sicei-queue ObjectName "NT AUTHORITY\LocalService"
  & $nssm install sicei-scheduler C:\php\php.exe "artisan schedule:work"
  & $nssm set sicei-scheduler AppDirectory C:\SICEI\api
  & $nssm set sicei-scheduler ObjectName "NT AUTHORITY\LocalService"
  # Bitácoras y reinicio automático (14/10/2026): sin esto, un fallo del proceso no deja rastro
  foreach ($s in 'sicei-queue','sicei-scheduler') {
    & $nssm set $s AppStdout "C:\SICEI\api\storage\logs\$s.log"
    & $nssm set $s AppStderr "C:\SICEI\api\storage\logs\$s.log"
    & $nssm set $s AppRotateFiles 1
    & $nssm set $s AppRotateBytes 10485760
    & $nssm set $s AppExit Default Restart
    & $nssm set $s Start SERVICE_AUTO_START
  }
  Start-Service sicei-queue, sicei-scheduler
  Get-Service sicei-queue, sicei-scheduler   # los dos deben decir Running
  ```
  - **Qué hace cada uno:**
    - `sicei-queue` procesa la cola (`QUEUE_CONNECTION=database`, tabla `sicei.jobs`): avisos por correo y campana
      que van en cola, y la revalidación de la landing.
    - `sicei-scheduler` corre lo programado, en hora del centro (`APP_TIMEZONE=America/Mexico_City`):
      - `sicei:recordatorios` a las 08:00.
      - `sicei:recordatorios-evaluacion` a las 08:15: avisa 2 días antes y el día que vence la evaluación.
    - Mientras `MAIL_MAILER=log` (sin credenciales de correo), los correos se escriben en el log en lugar de enviarse;
      la campana sí funciona.
  - **Por qué no lo hace Claude Code:** crear un servicio de Windows que arranca solo es "persistencia" y el
    clasificador de seguridad lo bloquea aunque el usuario lo autorice en el chat. Opciones:
    1. Que el usuario pegue el bloque de arriba en una PowerShell **como administrador**.
    2. Que agregue una regla de permisos de Claude Code para `nssm.exe`.
  - **Verificar después:**
    - `Get-Content C:\SICEI\api\storage\logs\sicei-queue.log -Tail 20` no debe mostrar errores.
    - `C:\php\php.exe artisan schedule:list` (en `C:\SICEI\api`) muestra los dos comandos.
    - `select count(*) from sicei.jobs` debe bajar a 0 en pocos segundos.
    - Si `sicei.failed_jobs` tiene filas, revisarlas antes de reintentar.
- **Credenciales del correo propio de SICEI**, en el bloque comentado del `.env`.
- **Superadmin de SICEI:** se asigna con `php artisan sicei:crear-admin <correo>` (si la cuenta ya existe en SIGAE, no
  cambia su contraseña).
- ~~**Portal de SIGAE:** tarjeta de SICEI en "Próximamente"~~ **Resuelto (14/10/2026):**
  - La tarjeta y el nodo de la órbita dicen «Disponible», el botón «Entrar a SICEI» y los textos van en presente.
  - Los enlaces a `/sicei` del portal (tarjeta, «¿Cuál es para mí?», pie) usan `EnlaceSistema`: un `<a>` con
    navegación completa. Con `<Link>`, el router de SIGAE resolvía `/sicei` dentro de su propia app y mostraba su
    página vieja de «Próximamente» sin pasar por IIS.
  - Se borraron `app/sicei/page.tsx` y `components/portal/ProgramasSistema.tsx` (solo se usaba ahí), y `/sicei` salió
    de `PUBLIC_PATHS` en `proxy.ts`.
- ~~**Lint de SICEI:** 2 errores~~ **Resuelto (14/10/2026):** `admin` y `portal` leen `?seccion=`, `?q=` y `?folio=`
  con `useSearchParams` como estado inicial, en lugar de `setState` dentro de un efecto. Las páginas se renderizan por
  petición, así que el servidor ya tiene los parámetros y no hay desajuste de hidratación (verificado en navegador).
  eslint: 0 errores (quedan 3 avisos `<img>` que ya existían).
- **Campana de SICEI → `/evaluador` en pestaña nueva: resuelto (14/10/2026).** Los avisos con URL de la raíz se
  pintan como `<a href>` normal, no `<Link>`, y el `href` real ya no lleva `/sicei`.
- **Botón «Regresar a SIDECyT» en el encabezado público de SICEI (pedido del usuario, 14/10/2026):**
  - Va junto a «Mi portal» y es un `<a href="/">` hacia el portal de la raíz.
  - En teléfono (menos de 640 px) va dentro del menú, porque la barra no tiene espacio.
  - Verificado en navegador 14/14 a 1440 y 390 px: tarjeta, clic hacia SICEI, botón, regreso al portal, sin scroll
    horizontal y sin errores.
- **Commits del 14/10/2026:** SIGAE `a9fb618` y SICEI `dd3fe9d` (identidad del repo SICEI igual a la de SIGAE, solo
  local).
  - **Push pendiente del usuario:** el servidor usa el Git Credential Manager, que pide iniciar sesión de forma
    interactiva; Claude Code no puede hacerlo.
  - El remoto de SIGAE (`comecyt0/SIDECyT_DT`, **público**) estaba **vacío**: el primer push sube los 61 commits. Antes
    se revisó la historia: sin `.env`, sin claves de aplicación, JWT, correo, base de datos, canal interno, VAPID ni
    llaves privadas.
  - Comandos, en una PowerShell del usuario:
    - `git -C "F:\Desarrollo Tecnologico" push -u origin main`
    - `git -C C:\SICEI push origin main`
- **Archivos subidos fuera del repo:** `/apps/api/storage/app/private/` y `public/*` quedaron en el `.gitignore` de
  SIGAE. Hay 25 archivos reales de personas y el repo es público.
- **Despliegues futuros de SICEI:** los pasos de compilación quedan en el apartado siguiente.

### Queda para el paso 4 (publicar SICEI)

- Crear las tablas de SICEI en `comecyt_prod` (`php artisan migrate --force` como `sicei_app`, con respaldo previo).
  El ensayo previo en una base desechable con el esquema real de SIGAE no se pudo hacer: Claude Code bloquea crear bases
  con el superusuario.
- `.env` de SICEI (APP_KEY propia, `SIGAE_INTERNO_SECRETO`, `DB_*` de `sicei_app`) y permiso de escritura del proceso
  de SICEI sobre la carpeta de perfiles de SIGAE.
- Front de SICEI: instalar dependencias, `basePath: /sicei`, compilar y revisar tipos (no se compiló todavía).
- `deploy/` de SICEI: del Docker al despliegue nativo.
- Revisar en SIGAE que borrar una cuenta con registros en SICEI responda con un mensaje claro (las llaves foráneas de
  SICEI lo impiden).

## 6.4 Paso 5 — Panel `/evaluador` (decisiones del usuario, 14/10/2026)

**Reglas, iguales en SIGAE y SICEI:**
1. **Resultado:** con varios evaluadores, cada uno califica y ningún dictamen cambia el estado de la solicitud. Cuando
   todos concluyen se muestra el promedio y **el admin decide** (aprobar o rechazar con motivo) **en la ficha de la
   solicitud** de cada sistema. Queda en la bitácora.
2. **Mínimo aprobatorio por convocatoria, en %** del máximo real de la rúbrica (ya no 80 fijo).
3. **El dictamen no se edita:** al enviarlo se cierra; solo el admin puede reabrirlo.
4. **Qué ve el evaluador:** el expediente sin datos personales. Ve las respuestas y documentos, **solo de lo que tiene
   asignado**. No ve CURP, correo ni teléfono del solicitante, ni a los demás evaluadores, ni el promedio.
5. **Fecha límite:** se le avisa 2 días antes y el día que vence. Ya vencida no puede enviar, y el admin ve «vencida»
   para reasignar o ampliar la fecha.
6. **Conflictos de interés** que se detectan **y se muestran como indicadores** al asignar, en el sistema que
   corresponda:
   - misma empresa o institución;
   - participa en la misma convocatoria (en cualquiera de los dos sistemas);
   - ya evaluó antes al mismo solicitante o empresa.

   El admin ve la alerta y decide si procede. Si procede, elige bloquear solo esa solicitud o toda la convocatoria para
   ese evaluador. **La autoevaluación siempre se bloquea.**
7. **Rol:** sigue el rol activo, pero los paneles tendrán **botones visibles para cambiar al rol de evaluador y
   regresar** al rol anterior.
8. **Panel nuevo en `/evaluador`** (raíz del dominio, en el Next de SIGAE):
   - Reemplaza el panel de evaluador actual de SIGAE.
   - Tiene un switch SIGAE/SICEI cuando hay asignaciones en ambos.
   - Para SICEI pide iniciar sesión en SICEI. La sesión es aparte; el login se hace dentro del panel contra
     `/sicei/api`.

**Fases:**
- **5A — SICEI backend:**
  - Cerrar los huecos de acceso: hoy un evaluador puede ver y descargar documentos no asignados, dar veredicto, hacer
    transiciones, exportar el CSV y ver el resumen global.
  - API `/api/evaluador/*` con lista blanca de campos.
  - Dictamen único con fecha límite; asignación con fecha límite y conflictos.
  - Bloque de decisión del admin; mínimo aprobatorio en la configuración de la convocatoria.
  - **Hecha y publicada el 14/10/2026 a las 15:57** (respaldo `comecyt_2026-10-14_1557.dump`; decisión D78 en el
    repo de SICEI).
    - API `/api/evaluador/{asignaciones, asignaciones/{id}, …/iniciar, …/documentos/{doc}, …/dictamen}`.
    - Rutas `admin/solicitudes/{folio}/{candidatos-evaluador, bloquear-evaluador, asignar/{ev}/fecha, asignar/{ev}/reabrir}`.
    - `App\Support\ConflictosEvaluador` y `App\Support\Rubrica`; comando `sicei:recordatorios-evaluacion` (08:15).
    - Migración `2026_10_14_150000`: campos de la asignación, `bloqueos_conflicto` y la vista `v_dictamenes_sicei`
      (solo `SELECT` para `comecyt_app`, verificado).
    - Pruebas **119/119**, entre ellas `EvaluadorPanelTest`: 9 casos maliciosos (asignación o documento ajeno → 404,
      sin datos personales, admin vedado al evaluador, fecha vencida, conflictos, reabrir, avisos, HTML).
- **5B — SIGAE backend:**
  - Corregir: el primer dictamen ya no decide; aprobatorio en %; el histórico y la descarga del dictamen; lista blanca;
    asignar solo en el estado correcto y con bitácora; `asignado_por`; desasignar con bitácora.
  - Agregar: fecha límite aplicada y avisos; conflictos e indicadores; decisión del admin en la ficha.
  - Vistas de cruce de dictámenes entre sistemas para detectar conflictos.
  - **Hecha y aplicada el 14/10/2026 a las 16:02** (respaldo `comecyt_2026-10-14_1602.dump`; migración
    `2026_10_14_000003`). Había 0 asignaciones y 0 dictámenes en producción.
    - `Evaluaciones\EvaluadorController` reescrito:
      - Lista y expediente con lista blanca: sin correo, teléfono ni notas internas.
      - Ajeno → 404.
      - Dictamen único; hay que calificar todos los criterios activos, con justificación de al menos 20 caracteres y
        carta de imparcialidad.
      - Fecha vencida → 422. Ningún dictamen cambia el estado de la solicitud.
    - Rutas admin:
      - `solicitudes/{s}/candidatos-evaluador`, `…/bloquear-evaluador`, `…/evaluacion` (resultado) y
        `…/evaluacion/decidir` (aprueba y crea la ministración 1, o rechaza; notifica con `EvaluacionCompletada`).
      - `asignaciones-evaluador/{a}/fecha` y `…/reabrir`.
      - Asignar exige que la solicitud esté `en_evaluacion` y una fecha posterior a hoy; guarda `asignado_por` y los
        conflictos aceptados, y deja bitácora.
    - `App\Support\RubricaSigae` (mínimo en % con `tipo_programas.puntaje_minimo_aprobatorio`, 80 por defecto) y
      `App\Support\ConflictosEvaluador`.
    - Aviso `EvaluacionAsignada` (correo y campana), que también sirve para los recordatorios. Comando
      `evaluacion:recordatorios`, a las 08:15 hora del centro.
    - **Verificado 33/33** con `docs/e2e/e2e_evaluador_sigae.php`, en producción, con datos desechables, avisos
      simulados y limpieza automática.
    - **Lección:** en un script que hace varias peticiones en el mismo proceso, `JWTAuth` conserva el token de la
      primera. Hay que llamar `JWTAuth::unsetToken()` y `setRequest()` antes de cada una (en producción no pasa). Nunca
      cortar la salida con `Select-Object -First`: deja datos sin limpiar (ya pasó; se limpiaron con
      `docs/e2e/limpiar_e72.php`).
    - **PDF del dictamen con criterios dinámicos: HECHO (14/10/2026).**
      - `RubricaSigae::detalleDictamen()` arma los renglones con lo que calificó **ese** dictamen
        (`solicitud_criterios_evaluacion` y nombre/máximo de `programa_criterios_evaluacion`, aunque el criterio se haya
        ocultado después). Sin rúbrica dinámica usa los 4 legacy con sus nombres reales.
      - `RubricaSigae::puntajesDe()` reemplaza la lectura duplicada del controlador.
      - `DocumentoController::downloadDictamen` pasa al PDF el detalle, el máximo real, el % y el mínimo de la
        convocatoria. Los criterios entran en el contenido sellado (hash).
      - `pdfs/dictamen.blade.php`: tabla Criterio / Máximo / Puntaje y total con %. En lugar de «SUCEPTIBLE DE APOYO»
        (con errata, y presentaba un solo dictamen como resultado final) dice «Alcanza / No alcanza el mínimo» y
        aclara que el resultado lo decide la administración con el promedio. Institución con null-safe.
      - Front: botón «Descargar dictamen (PDF)» en el detalle del panel `/evaluador` (SIGAE, cuando ya se envió) y en
        cada dictamen del bloque «Resultado de la evaluación» de la ficha (`descargarDictamenSigae` en
        `lib/evaluacionCompartida.ts`). El resultado del admin ahora trae `dictamen.id`.
      - El permiso no cambió: lo descargan la administración (admin de convocatoria y consulta dentro de su alcance) y
        la persona que escribió el dictamen. Otra persona evaluadora recibe 403.
      - **Verificado:** e2e 38/38 (5 casos nuevos). El admin descarga `application/pdf`, la autora sí y otra persona
        evaluadora no (403). Se listan los criterios de la convocatoria (Técnica 28/30, Impacto 18/20 = 46/50) y no los
        4 fijos. No dice «SUCEPTIBLE» y escapa el comentario. Un criterio ocultado después sigue en el PDF. vitest
        180/180. Despliegue `deploy-web.ps1 -Motivo e72pdf`; navegador 14/14 y SICEI 3/3.
- **5C — SIGAE front: PUBLICADO (14/10/2026, 16:24).**
  - **Panel nuevo** en `app/evaluador/(panel)/`:
    - `layout.tsx` es propio, no `RoleTopLayout`, porque quien solo evalúa en SICEI no tiene sesión de SIGAE.
    - `page.tsx` tiene el switch SIGAE/SICEI con conteos, Pendientes/Enviados y avisos de vencimiento.
    - Si no hay sesión, SIGAE manda a `/login` y SICEI pide su login (con 2FA) en la misma página.
    - Si la sesión de SIGAE tiene otro rol activo pero el de evaluador está otorgado, aparece «Usar mi rol de evaluador».
      Guarda el rol anterior en `sessionStorage` (`sidecyt:rol-previo`) para el botón «Regresar a…».
    - `[sistema]/[id]/page.tsx` muestra el expediente sin datos personales, los documentos con vista previa y la rúbrica
      (cada criterio de 0 al máximo, total y %, mínimo de la convocatoria).
    - El dictamen exige justificación de 20 caracteres o más y la carta de imparcialidad, y pide confirmación porque no se
      puede modificar. Al abrir la asignación se llama a `iniciar`.
    - Cliente de las dos API: `lib/evaluacionCompartida.ts` (fetch same-origin; SICEI con `csrf-cookie` + Sanctum).
  - Del panel viejo, `(sigae)/` conserva solo `cuenta` y `perfiles/[id]`. Se borraron `dashboard`, `asignaciones`,
    `evaluaciones` e `historico`. `PANEL_POR_ROL.evaluador = '/evaluador'`.
  - **`proxy.ts`:** deja pasar `/evaluador` y `/evaluador/(sigae|sicei)/<id>` sin sesión de SIGAE. Cada API valida la
    suya. Con el cambio de contraseña pendiente, igual redirige.
  - **Botón «Panel de evaluación»** (`components/layout/BotonPanelEvaluacion.tsx`) en `AdminTopLayout` y `RoleTopLayout`.
    Aparece si `/mis-roles` incluye `evaluador` y no es el rol activo. Cambia el rol y guarda el anterior. Se muestra
    desde 640 px; en teléfono queda «Mi cuenta → Mis roles».
  - **Admin, `/admin/evaluadores`:**
    - Solo lista solicitudes `en_evaluacion`.
    - Al elegir la solicitud carga `candidatos-evaluador`. Cada persona trae sus indicadores (`ChipsConflicto`: rojo los
      que bloquean, dorado los avisos). Las ya asignadas o bloqueadas salen deshabilitadas.
    - Ante un 409, una ventana ofrece «Asignar de todos modos» (`acepto_conflictos`) o «No asignar y bloquear»: esta
      solicitud o toda la convocatoria, con motivo.
  - **Ficha (`/admin/perfiles/{id}?folio=`):** `components/admin/ResultadoEvaluacion.tsx` muestra:
    - El promedio, el % y el mínimo, con «Lo alcanza / No lo alcanza».
    - Cada dictamen por criterio, con su comentario y los conflictos que se aceptaron.
    - Las acciones Ampliar fecha, Quitar, Reabrir (con motivo) y Aprobar/Rechazar con motivo. Las dos últimas solo se
      habilitan cuando ya están completos los dictámenes.
    - Si el rol no puede verlo (403), el bloque no aparece.
  - **Backend (ajuste):** un evaluador es la cuenta activa con el rol de evaluador **activo u otorgado**
    (`usuario_roles`), según `EvaluadorController::evaluadores()`. Lo usan `disponibles`, `candidatos` y `asignar`.
    Antes solo contaba el rol activo, y quien tenía otro rol activo no aparecía para asignarle.
  - **Verificado:**
    - e2e del backend 33/33, sin datos de prueba restantes.
    - vitest 180/180 (antes eran 184; se borraron las pruebas del panel viejo con sus páginas). tsc sin errores en
      `src`; eslint sin errores.
    - Despliegue con `deploy-web.ps1 -Motivo e72evaluador`.
    - curl: `/evaluador`, `/evaluador?sistema=sicei` y `/evaluador/{sigae|sicei}/1` dan 200. `/evaluador/sigae/abc`,
      `/evaluador/cuenta` y `/admin/evaluadores` sin sesión dan 307 al login. `/sigae`, `/login` y `/sicei` dan 200.
      La CSP con nonce está intacta.
    - Navegador 14/14 (`verif_evaluador.mjs`, 1440 y 390 px): login de SIGAE, formulario de SICEI, sin scroll
      horizontal, sin errores de CSP ni de JavaScript, y el detalle sin sesión no muestra datos.
  - **Nota de pruebas:** vitest debe correrse desde la ruta real `F:\Desarrollo Tecnologico\apps\web`. Desde el
    junction `F:\comecyt` no encuentra `src/test/setup.ts`.
  - **Falta probar con sesión real:** un evaluador con una asignación verdadera, de punta a punta en el navegador.
- **5D — SICEI front: PUBLICADO (14/10/2026).**
  - **Quien evalúa sale de `/sicei`.** Si `rol === "evaluador"`, `portal/page.tsx` (al cargar y al iniciar sesión) y
    `admin/page.tsx` mandan a `/evaluador?sistema=sicei` con navegación completa (`PANEL_EVALUACION` en `lib/base.ts`).
  - **Campana:** los avisos con URL de la raíz (`esRutaRaiz`, que reconoce `/evaluador…`) se abren sin el basePath.
    - Limitación: el `href` del `<Link>` sigue llevando `/sicei`, así que abrirlo en una pestaña nueva da 404.
  - **Comité (`admin/ComiteSolicitud.tsx`, solo superadmin)** sustituye la calificación dentro del panel del admin:
    - Resumen: dictámenes, promedio contra el máximo y %, el mínimo aprobatorio y si lo alcanza.
    - La decisión sigue siendo la acción del flujo (aprobar/rechazar) con ese resumen a la vista.
    - Por persona: estado, fecha límite, puntaje por criterio y comentario. Acciones: ampliar fecha, quitar (si no ha
      enviado) y reabrir el dictamen con motivo.
    - **Asignar:** persona y fecha límite. Los candidatos traen indicadores de conflicto. Ante un 409 se puede «Asignar
      de todos modos» o «No asignar y bloquear» (esta solicitud o la convocatoria, con motivo).
  - `clienteApi.ts`: `adminAsignarEvaluador(folio, id, fecha, acepto)`, `adminCandidatosEvaluador`,
    `adminBloquearEvaluador`, `adminAmpliarFecha` y `adminReabrirDictamen`. Se quitó `adminEvaluar` (su ruta ya no
    existe).
  - **Asistente de convocatorias:** campo «Mínimo aprobatorio del promedio del comité» (%, 80 por defecto), que va en
    `evaluacion.minimo_aprobatorio`. Lo valida `ValidadorConfig`.
  - **Verificado:**
    - tsc sin errores.
    - eslint solo con los 2 errores que SICEI ya tenía (`set-state-in-effect` en admin y portal).
    - curl: `/sicei`, `/sicei/portal`, `/sicei/admin` y `/sicei/api/publico/salud` dan 200; `/sicei/api/user` sin
      sesión da 401.
    - Navegador: portal y admin sin errores de JavaScript ni de CSP.
    - SICEI no tiene pruebas de front.
  - **Incidente (no repetir):** el primer build se hizo con `npm run build` sin las variables. El front quedó llamando a
    `http://localhost:8000` y la CSP lo bloqueó, así que SICEI no cargaba datos durante unos minutos. Se recompiló con
    la receta del paso 4: `NEXT_PUBLIC_API_URL=/sicei`, `NEXT_PUBLIC_BASE_PATH=/sicei` y
    `npx pnpm@10.18.0 exec next build`. **Ahora esas variables públicas están en `C:\SICEI\web\.env.production`**
    (ignorado por git), para que cualquier build las tome.
  - **Segundo incidente, mismo día (lo reportó el usuario con una captura):** `https://…/sicei` (la portada) salía en
    blanco con «un momento…» y cientos de errores `default-src 'none'` en la consola. `/sicei/portal` y `/sicei/admin`
    sí funcionaban.
    - **Causa:** el `matcher` de `src/proxy.ts`, con basePath, exige `/sicei/<algo>`, así que la raíz `/sicei` nunca
      pasaba por el proxy. Salía sin la CSP con nonce y la regla de IIS de SIGAE que pone CSP si falta le aplicaba
      `default-src 'none'`, que bloquea scripts, estilos, fuentes e imágenes.
    - Venía así desde la publicación del paso 4: la verificación de entonces fue con `curl` (200) y en navegador solo
      `/sicei/portal`.
    - **Fix:** `"/"` como primera entrada del `matcher`. Verificado: `/sicei` trae su CSP con nonce y carga sin errores
      en el navegador.
    - **Regla:** al publicar SICEI se revisa en navegador **la raíz `/sicei`** además de las subpáginas.
  - **Procedimiento para publicar el front de SICEI:**
    1. `Stop-Service sicei-web`.
    2. Respaldar `.next`.
    3. `npx pnpm@10.18.0 exec next build`.
    4. Copiar el `static` anterior y luego el nuevo, junto con `public`, a `.next\standalone`.
    5. `Start-Service sicei-web`.
    6. Revisar en el navegador que no haya llamadas a `localhost`.
    - Los respaldos `web/.next.bak-*` y los `web/deploy-*.log` están ignorados en git.
  - **Falta probar con sesión real:** una asignación de SICEI de punta a punta (admin asigna, evaluador entra por
    `/evaluador`, inicia sesión de SICEI y envía el dictamen, admin decide).

## 7. Problemas encontrados en SICEI (no dependen de compartir la base)

- `DatabaseSeeder` crea `test@example.com` / `password`: no debe llegar a producción.
- El `Dockerfile` deshabilita `proc_open` y ClamAV lo necesita (`ServicioDocumentos.php`): las subidas fallarían con 503.
- `FILESYSTEM_DISK=s3` sin el paquete de S3: todo se guarda en disco local del contenedor, sin volumen.
- Imágenes guardadas como URL absoluta con `APP_URL`: hay que reescribirlas si cambia el dominio.
- `CatalogosSeeder` no es idempotente (calendario con `insertGetId`).
- `folio_secuencias` no se reinicia por año aunque el folio lleva el año.
- Collation `C` de `comecyt_prod`: `ILIKE` no ignora acentos (igual que en SIGAE, E54); usar comparación en PHP o
  `unaccent` (disponible en el servidor).
