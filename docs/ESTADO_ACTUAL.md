# Estado Actual del Sistema COMECYT

**Fecha de actualización:** 28 de septiembre de 2026 (versión anterior: 25/09/2026)

> 📱 **28/09/2026 (tarde) — E51.** Corregido el **login "atorado" en la pantalla de carga** al entrar desde el correo de
> `/sigae` (la pantalla global no se apagaba tras navegar; ahora se apaga sola al cambiar de ruta y nunca dura más de
> 15 s). Barras de `/sigae` y del portal corregidas en teléfono (se encimaban). **Portal rediseñado**: botón "Sitio
> COMECYT", órbita de sistemas interactiva, sello SIDECyT, pie en vino. Auditoría móvil nueva que detecta
> encimados: **186 vistas (públicas 320–1024 px y 4 paneles 360/390/768), 0 hallazgos, 0 errores JS**. Ver `CLAUDE.md` E51.

> 🏛 **28/09/2026 — Identidad institucional 2026 (E50).** Logos oficiales COMECYT 2026 en todo el sistema; **regla
> permanente: el favicon de todo el sistema es el logo COMECYT**; franja institucional (convivencia de logos) en el
> **encabezado** de portal, `/sigae`, `/sicei`, páginas de acceso y legales (no en pies ni paneles); colores oficiales
> (vino `#56212F`, dorado `#BC955B`); títulos en Montserrat como sustituto de Gotham. Además: herramienta de **encuadre
> del carrusel** en `/admin/carrusel` (imagen completa o recorte con punto focal, vista previa en 3 tamaños); login,
> recuperación y solicitud de acceso **sin scroll**; "Regresar a SIDECyT" y correo que se prellena en el login desde
> `/sigae`; menú, barra, pie y avisos de los paneles **traducibles** ES/EN; sin botón de tema; portal más interactivo
> ("Cómo funciona", señal en vivo, selector con teclado). Referencia: `docs/IDENTIDAD.md`, `DISENO_UI.md` §19, `CLAUDE.md`
> E50. Verificado: seguridad 38/38, vitest 129/129, login en 13 tamaños sin scroll de página.

> 🔚 **Cierre de sesión 25/09/2026.** Publicado y verificado: E48 (SIGAC → SIGAE, portal SIDECyT en `/`, menú móvil,
> auditoría responsive 270 vistas / 0 hallazgos) y E49 (SIDECyT definido, programas/sectores/documentos editables en
> `/admin/sitio`, SIGAE con 9 programas, SICEI documentado y pendiente). Regresión de seguridad 38/38. **Para retomar:**
> leer `docs/SIDECYT.md`; (1) push a GitHub (lo hace el usuario); (2) definir SICEI (preguntas en `SIDECYT.md` §7);
> (3) enlace de "Asistencia Técnica e Innovación"; (4) pendientes del 24/09: borrador 4, recuperación pendiente, correo
> real del admin. Resto en la tabla de Pendientes.
>
> 🌐 **25/09/2026 (tarde) — SIDECyT definido y contenido administrable (E49).** **SIDECyT = Sistema Digital de
> Emprendimiento, Ciencia y Talento Mexiquense** (el dominio y el portal). SIGAE se nutre de
> comecyt.edomex.gob.mx/apoyo-empresarial: ahora muestra sus **9 programas** (antes 4), y programas, sectores,
> documentos y notas **se editan en el panel → Configuración → Contenido público** (`/admin/sitio`), nada en el código.
> SICEI (becas e investigación) queda **pendiente**: sus 19 programas están cargados ocultos y documentados en
> `docs/SIDECYT.md`. Verificado 28/28 (backend) y 18/18 (navegador).
>
> 🏛 **25/09/2026 — SIGAE, portal de sistemas y responsive (E48).** El sistema se llama ahora **SIGAE — Sistema de
> Gestión de Apoyo Empresarial** (antes SIGAC); la landing está en **`/sigae`** y `/sigac` redirige. **El dominio
> (`/`) muestra el portal de sistemas del COMECYT** con acceso a SIGAE y a **SICEI — Sistema de Impulso a la Ciencia,
> Educación e Innovación** (`/sicei`, "Próximamente" hasta que se defina). Corregido el **menú móvil que no se
> desplazaba** y auditoría responsive de todas las vistas (6 roles × 6 anchos): barra en tablet, pestañas y asistente
> en teléfono corregidos. Ver `CLAUDE.md` E48 y `DISENO_UI.md` §16–17.
>
> 🔚 **Cierre de sesión 24/09/2026 (noche).** Publicado y verificado en producción: E44 (auditoría de seguridad), E45
> (alcance por convocatoria/periodo, perfiles, buzón, folios, límites de archivo), avisos del buzón ligados a su hilo,
> E46 (correo de recuperación: aviso al admin también en la campana, enlaces sin localhost) y E47 (asistente de
> convocatorias atómico + borradores). **Para retomar:** (1) completar el **borrador 4** "Programa Jóvenes Emprendedores
> e Innovadores 2026" (faltan opciones de una pregunta de lista, el criterio y revisar fechas, que ya pasaron);
> (2) aprobar la **recuperación de contraseña pendiente** en Recuperación Contraseñas; (3) **correo real para la cuenta
> admin**; (4) el usuario debe hacer el **push** (`git -C "F:\Desarrollo Tecnologico" push -u origin main`; 4 commits
> nuevos hoy además de E44). Pendientes completos en la tabla de abajo.
>
> 🧩 **24/09/2026 (noche, 3) — Seis funciones nuevas (E45).** Roles **Admin de convocatoria** (opera solo sus
> convocatorias) y **Consulta** (solo lectura); **periodos** en las convocatorias y alcance por periodo; **foto de
> perfil y portada** (WebP) visibles en todo el sistema y **ficha completa** por usuario/folio; **historial y
> seguimiento** de cada folio, vista de aprobados/no aprobados y **publicación confirmada** de folios en la landing
> (con confeti); **buzón con chat en tiempo real** con el equipo de la convocatoria; **tipo y tamaño de archivo**
> configurables por documento. Probado en producción con datos desechables (72/72, 38/38, 13/13 en navegador) y
> corregidos 3 bugs de fondo (crear solicitud, abrir solicitud en admin, throttle antes de la sesión). Ver
> `docs/IMPLEMENTACIONES_E45.md` y `CLAUDE.md` E45.
>
> 🔒 **24/09/2026 (noche, 2) — Auditoría de ciberseguridad de todo el código (E44).** Se corrigieron, entre otros:
> el seeder que en cada despliegue devolvía la contraseña del admin a una publicada; documentos de solicitantes que
> se descargaban **sin sesión** (ahora privados, con permiso por rol); cerrar sesión que no terminaba la sesión; el
> service worker que guardaba páginas con datos personales; cuentas desactivadas que seguían entrando; notificaciones
> ajenas visibles para revisores/evaluadores; dictámenes que se podían reescribir o inflar; CSP con nonce (adiós
> `unsafe-inline` en scripts); enumeración de correos; auto-apagado de la API; política de contraseñas. Permisos del
> `.env` restringidos, firma SMB y 3 puertos cerrados, `F:\COMECYT_CREDENCIALES.txt` borrado. Verificado 38/38
> (backend en producción) y 28/28 (navegador). Ver `CLAUDE.md` E44.
>
> 🧭 **24/09/2026 (noche) — "El dominio se queda cargando" (E42) y vistas internas + menú + pie (E43).**
> La pantalla de carga infinita la causaba HTML viejo guardado en una caché intermedia que pedía scripts ya
> borrados; se corrigió en tres capas (HTML sin caché compartida en IIS, el despliegue conserva los scripts
> anteriores, y la página se recarga sola una vez si no arranca). Verificado por el dominio: carga normal en
> primera visita y al recargar. Rediseño del contenido de todas las vistas de los 4 paneles, del menú y del pie
> (logo ×5); quitado el bloque de Reverb/"Buenas prácticas" del dashboard. Login y landing sin cambios.
> Ver `CLAUDE.md` E42/E43 y `DISENO_UI.md` §14.

> 🎨 **24/09/2026 (tarde) — Paneles v3.** Rediseño estructural de los 4 paneles (menos el login) con la landing
> y la referencia aboardhr.com: barra flotante en píldora, lienzo papel con salpicaduras de color tenues, héroes
> con titular grande, marcos pastel con tarjetas blancas, dashboards reestructurados. Verificado en los 4 roles,
> escritorio y teléfono (375 px), modo oscuro y login intacto (E41, `DISENO_UI.md` §13).
>
> 🗓 **24/09/2026 — Convocatorias con estado público, prórroga y banners (E40).** Las 5 convocatorias de prueba
> se **cerraron y archivaron** (la landing ya no las muestra). Las convocatorias ahora se ven en la landing como
> **Próxima a abrir / Abierta / Con prórroga / Cerrada** según sus fechas; el admin puede **dar prórroga**
> (con motivo, en bitácora) y **cargar un banner** por archivo o enlace institucional en convocatorias **y
> programas** (solo admin). Se corrigieron 5 bugs de fechas encontrados al hacerlo (cierre automático el mismo
> día, zona UTC, envío de solicitudes tras el cierre, fechas mostradas un día antes en todo el panel, alertas
> sin prórroga). En landing y paneles el **arcoíris pasó a vino no saturado**. Pruebas: backend 50/50 de punta a
> punta en producción, front 103/103. Migración aplicada con respaldo previo.

> 🎨 **23/09/2026 (tarde) — Paneles unificados con la landing.** Admin, solicitante, revisor y evaluador
> usan ahora el sistema visual SIGAE de la landing (tinta navy, blanco, pastel, vino de detalle, píldoras,
> Switzer/Satoshi, logo y marca SIGAE en la barra). El login no cambió. Capa única
> `src/styles/panel-sigae.css`; verificado en producción con los 4 roles, móvil 375 px y modo oscuro
> (E39 en `CLAUDE.md`, `DISENO_UI.md` §12). **SIGAE = Sistema de Gestión de Apoyo Empresarial.**
>
> 📨 **23/09/2026 (tarde) — SMTP institucional FUNCIONANDO.** Infraestructura quitó el autenticador (MFA)
> de `proyectos.comecyt@edomex.gob.mx` y le asignó licencia Exchange Online. Probado: autenticación,
> envío real y envío desde Laravel por `smtp.office365.com:587` (STARTTLS). `MAIL_MAILER=smtp` en
> producción; `comecyt-queue` y `comecyt-scheduler` reiniciados. Pendiente: reactivar el 2FA del admin con
> el usuario presente (E38 en `CLAUDE.md`).
>
> 📣 **23/09/2026 (tarde) — Landing ampliada.** Nombre **SIGAE**, los 4 programas de Apoyo Empresarial,
> **convocatorias abiertas en vivo** desde el nuevo endpoint público `GET /api/convocatorias/abiertas`
> (solo lectura, lista blanca de campos, 30/min, E37), acentos vino, logo ×3 y botón "Ir al sitio" en el
> login. ⚠️ Las 5 convocatorias `activa` de producción parecen datos de carga inicial: la landing las
> anuncia; revisarlas en `/admin/convocatorias`. **Nueva regla permanente de ciberseguridad** para toda
> implementación: `CLAUDE.md`, Reglas Críticas §0.
>
> 🌈 **23/09/2026 (tarde) — Landing pública publicada en `/sigae`.** https://sidecyt-comecyt.edomex.gob.mx/sigae
> presenta el sistema antes del login (qué es, las 8 etapas, los 4 perfiles, cómo obtener acceso) y lleva
> a `/login` o `/solicitar-acceso`. **`/` sin sesión ahora redirige a `/sigae`** (con sesión, directo al
> panel). `/privacidad` y `/terminos` pasaron a ser públicas (antes mandaban al login). El campo de correo
> del hero abre el login con el correo prellenado. Estilo basado en portrait.so a pedido del usuario,
> aislado del resto del sistema. Solo frontend. Detalle: `docs/LANDING_SIGAE.md`.

> 📧 **23/09/2026 (tarde) — SMTP, carrusel y cabeceras.** El usuario subió las **4 imágenes reales del
> carrusel** vía `/admin/carrusel` (confirmado en BD) — con eso se probaron y cerraron dos pendientes
> que esperaban un archivo real: la cabecera `Cross-Origin-Resource-Policy` en `/storage/*` (activada) y
> se confirmó que `Server` ya estaba oculta desde agosto. **SMTP institucional probado con credenciales
> reales** (`proyectos.comecyt@edomex.gob.mx`, Microsoft 365): bloqueado por dos políticas del lado de la
> institución, ninguna corregible desde este servidor (E35 en `CLAUDE.md`). **Correo enviado el
> 23/09/2026** pidiendo habilitar SMTP AUTH para esa cuenta o autorizar la IP del servidor en el relevo
> interno — en espera de respuesta:
> `Desktop\ADEM\_v6_smtp_sep23\CORREO_SMTP_INSTITUCIONAL.md`. Mientras tanto `MAIL_MAILER=log` (seguro).
>
> 🔧 **23/09/2026 — Tres pendientes cerrados de fondo.** (1) **Cookie `comecyt_auth` con `Secure` +
> `SameSite=Strict`** activados en `.env` (antes `false`/`Lax`); verificado con un JWT real que el
> `Set-Cookie` real trae ambos atributos. `COOKIE_DOMAIN` se queda en `null` a propósito (acceso dual por
> IP y dominio). (2) **Decidida e implementada la transición `aprobada → convenio → ministracion`** que
> E31 había dejado como hueco: avanza al generar el convenio y al firmarlo (E33). Al verificarla
> aparecieron **tres bugs más, nunca antes ejercitados** (0 convenios reales hasta hoy): `generate()`
> daba 500 siempre (`FOR UPDATE` con función agregada, Postgres lo rechaza), `generateConvenioContent()`
> usaba una relación inexistente (`$sol->empresa` en vez de `institucion()`, mismo patrón de E25) y el
> PDF del convenio se guardaba en una ruta distinta a la que `pdf_url` decía (404 garantizado). Los tres
> corregidos y verificados de punta a punta con una solicitud de prueba desechable (E34 en `CLAUDE.md`).
> (3) **Limpieza:** 18 respaldos `.next.bak-*` eliminados (**7.84 GB liberados** en `F:`, se conservó el
> más reciente como red de seguridad) y la tarea programada rota `COMECYT-LimpiarDirectorioViejo`
> eliminada. **`C:\comecyt` borrado** (el sandbox de Claude Code no podía hacerlo directamente; lo borró
> el usuario a mano el mismo día, confirmado).
>
> 🎨 **21/09/2026 — Rediseño VIVO Y MULTICOLOR de los 4 paneles, publicado.** Contenido interno de
> admin/evaluador/revisor/solicitante rediseñado (wine principal + paleta amplia, píldoras estilo
> sticker; deroga "nada de píldoras" y "fondos poco saturados" — el login/auth no se tocó). Barrido
> vista por vista de las 34 páginas/componentes. `tsc`/`eslint`/`vitest` (97/97) limpios. Publicado
> (`deploy-web.ps1 -Motivo rediseno-paneles`, luego `-Motivo fix-uploads`). Detalle en
> [DISENO_UI.md §10](DISENO_UI.md).
>
> 🐞 **21/09/2026 — Tres bugs de producción encontrados y corregidos la misma tarde** (ninguno causado
> por el rediseño; se detectaron al usar el sistema en producción justo después de publicar):
> 1. **E30:** "Aprobar" en solicitudes de acceso daba `500` (correo duplicado con una cuenta creada a
>    mano) y, de fondo, **ninguna solicitud de acceso se había cerrado nunca** — un `$guarded` de
>    seguridad bloqueaba también la propia escritura del controlador.
> 2. **E31, mismo patrón, mucho más grave:** el modelo `Solicitud` tenía el mismo error en **14 puntos**
>    de 4 controllers. Antes del fix, **ninguna transición de estado del sistema se habría guardado
>    nunca** — ni siquiera "enviar" una solicitud desde borrador. No se había notado porque la tabla
>    `solicitudes` tenía 0 filas (sistema recién publicado). Corregido antes de que llegara la primera
>    solicitud real.
> 3. **E32:** subir una imagen en `/admin/carrusel` daba `422` — el cliente HTTP mandaba el archivo como
>    JSON en vez de multipart. Corregido; **todavía no se ha subido ninguna imagen real**.
>
> Detalle técnico completo de los tres en `CLAUDE.md` (E30, E31, E32). Verificado de punta a punta
> contra datos reales de producción (no simulado): la solicitud de acceso que fallaba quedó
> correctamente aprobada y vinculada a su cuenta.
>
> ⚠️ **Hallazgo nuevo, NO corregido — requiere decisión de producto:** `Solicitud.estado` nunca avanza a
> `'convenio'` ni `'ministracion'` aunque se genere el convenio o se cree la ministración. Efecto:
> `iniciarSeguimiento()` y `cerrar()` son inalcanzables hoy. Ver Pendientes y E31 en `CLAUDE.md`.
>
> ✅ **21/09/2026 — Licencia de Windows con más margen.** `slmgr /dlv` muestra **180 días** de gracia y
> **3 rearmes** (alguien hizo `rearm` entre el 15/09 y hoy). Sigue en Evaluation, no Standard — la
> activación definitiva sigue pendiente, pero deja de ser la urgencia de esta semana.
>
> ✅ **14/09/2026 (tarde) — El dominio funciona desde Internet.** Infraestructura corrigió el balanceador.
> `VerificarDominio.ps1` da exit 0. DNS dividido: interno → `10.200.41.106`, público →
> `187.189.139.176`/`201.131.40.176`. El tráfico público entra desde `100.127.1.42` (dentro de
> `100.64.0.0/10`), sin cambios en `web.config`.
>
> 🎨 **14/09/2026 — Login rediseñado y publicado** (build 14:33–14:34, 53 s sin servicio). Sistema y
> verificación en [DISENO_UI.md](DISENO_UI.md). Respaldo del build anterior:
> `apps\web\.next.bak-20260914-prelogin`. Corregido además el pie "Estado de MÃ©xico" (E24).
>
> 🎨 **14/09/2026 (tarde) — Panel: contenido rediseñado, menú intacto.** Una primera versión cambió el menú
> por un sidebar; **el usuario lo rechazó** y se restauró el menú original byte a byte (E26). Lo que sí
> quedó: dashboard de admin v2 (héroe, "Pendientes ahora" accionables, anillo de avance, actividad
> reciente — todo con datos reales), modal de usuarios, carrusel con **subida de imágenes locales**
> (`POST /admin/carousel/upload`), `Badge` sin píldora en 27 vistas, "¿Olvidaste tu clave?" y "Solicitar
> acceso" con el sistema del login, pantalla de carga v2 (logo grande, 1.4 s por clic en cualquier enlace,
> también en el login) y `logo.png` como favicon. **Reverb:** el widget decía "Daemon no responde" por un
> connect a `0.0.0.0` en Windows (E27) — corregido en PHP, el daemon siempre estuvo bien.
> Detalle y qué falta en [DISENO_UI.md](DISENO_UI.md) §5-7.
>
> 🔔 **15/09/2026 (tarde) — Notificaciones en tiempo real y últimos formularios.** Aviso flotante al
> llegar una notificación por WebSocket (medido: 0.8 s desde el servidor), en los 4 roles. Paso 1-2 del
> asistente de convocatoria y formularios anidados de la ficha de programa con el sistema (ya no se piden
> claves internas). Detalle en [DISENO_UI.md](DISENO_UI.md) §7.
>
> 🐞 **15/09/2026 — Safari rompía al navegar ("This page couldn't load").** Causa: el splash inicial se
> quitaba del DOM siendo un nodo de React (E29 en `CLAUDE.md`). Corregido (se oculta), más `ThemeProvider`
> sin remontar toda la app y pantallas de error en español (`app/error.tsx`, `app/global-error.tsx`).
> Reproducido y verificado con Playwright WebKit.
>
> 🎨 **14/09/2026 (noche) — Reglas globales de UI y formularios por pasos.** Íconos de vidrio sin blur,
> cero emojis, `<select>` y botones unificados, tablas, sin jerga técnica, responsive móvil primero; y la
> última ola: **todos los formularios de crear/editar (16) son asistentes por pasos** (`StepFrame`,
> [DISENO_UI.md](DISENO_UI.md) §6b). Publicado (respaldos `.next.bak-20260914-prestepframes` y
> `-pretopbar-movil`) y verificado en producción con Playwright (admin y solicitante, escritorio y 390 px,
> 0 errores de consola). Corregido de paso: la barra superior desbordaba 31 px en teléfonos.
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
| Balanceador (infraestructura) | ✅ **Funciona** (corregido el 14/09/2026 por la tarde, verificado de nuevo el 21/09/2026) | DNS dividido: interno → `10.200.41.106`, público → `187.189.139.176`/`201.131.40.176`. Tráfico público entra desde `100.127.1.42` (dentro de `100.64.0.0/10`). `https://sidecyt-comecyt.edomex.gob.mx/login` y `https://10.250.36.241/login` responden **200**. Ver [DOMINIO_BALANCEADOR.md §12](DOMINIO_BALANCEADOR.md) |
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
| `https://sidecyt-comecyt.edomex.gob.mx/` | **Producción** | Detrás del balanceador, certificado válido `*.edomex.gob.mx`. Sin sesión redirige a `/sigae` |
| `https://sidecyt-comecyt.edomex.gob.mx/sigae` | **Landing pública** (23/09/2026) | Antes del login; ver `LANDING_SIGAE.md` |
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
| `MAIL_MAILER` | `smtp` | **Desde el 23/09/2026:** `smtp.office365.com:587` STARTTLS con `proyectos.comecyt@edomex.gob.mx` (contraseña solo en `.env`). Respaldo previo: `.env.bak-20260923-presmtp`. E38 en `CLAUDE.md` |
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
| **Licencia de Windows Server** | Alta (bajó de Crítica) | Verificado el 21/09/2026: `slmgr /dlv` muestra **180 días** de gracia y **3 rearmes** (alguien hizo `rearm` entre el 15/09 y hoy). **Solución definitiva sigue pendiente:** convertir Evaluation → Standard con la clave institucional: `DISM /online /Set-Edition:ServerStandard /ProductKey:<clave> /AcceptEula` (reinicia el servidor; programar ventana) |
| **Cuentas de prueba en producción** | **Crítica** | Las 4 cuentas del sistema son las de prueba de `UsuariosPruebaSeeder` **Contraseñas rotadas el 14/09/2026** en las 4 (la del seeder estuvo publicada en el README del repositorio anterior, que es público). **21/09/2026:** se aprobó la única solicitud de acceso pendiente (ver E30 en `CLAUDE.md`), vinculada a una cuenta ya creada a mano — no cambia el fondo del pendiente. **Falta:** crear las cuentas reales y desactivar estas. Decidir primero quién administra el sistema |
| ~~`Solicitud.estado` nunca llega a `convenio`/`ministracion`~~ | ✅ Resuelto 23/09/2026 | Decidido e implementado (E33 en `CLAUDE.md`): avanza a `convenio` al generar el convenio, y a `ministracion` al firmarlo. Al verificarlo aparecieron 3 bugs más en `ConvenioController`, nunca antes ejercitados — corregidos (E34) |
| ~~**Correo (SMTP)**~~ | ✅ **Resuelto 23/09/2026 (tarde)** | Infraestructura respondió: la cuenta tenía el autenticador (MFA) activo y se le asignó licencia Exchange Online. Tras el cambio, `smtp.office365.com:587` STARTTLS autentica y envía, también desde Laravel. `MAIL_MAILER=smtp` activo (E38 en `CLAUDE.md`) |
| **2FA del admin desactivado** | Alta | Apagado desde el 14/09 por falta de correo. Ya hay SMTP: reactivarlo con el usuario presente y probar el restablecimiento de contraseña por correo de punta a punta |
| ~~**Convocatorias `activa` que parecen de prueba**~~ | ✅ Resuelto 24/09/2026 | Cerradas y archivadas (`deleted_at`) a pedido del usuario; ya no aparecen en la landing ni en la lista del admin. Reversibles (E40) |
| **Push a GitHub** | **Alta** | El repositorio remoto `comecyt0/SIDECyT_DT` está configurado pero el servidor no tiene credenciales: el usuario debe correr `git -C "F:\Desarrollo Tecnologico" push -u origin main`. Commits locales sin subir: E44, E45, avisos del buzón, E46, E47, E48, E49 y E50 |
| **Archivos oficiales de Gotham** | Media | El manual pide Gotham (comercial). Hoy se usa Montserrat (libre) en los títulos. Si COMECYT entrega los `.woff2` de Gotham con licencia web, se agregan en `lib/fonts.ts` y todo el sistema los toma (la pila ya los pone primero). Ver `docs/IDENTIDAD.md` §4 |
| **Traducción completa ES/EN** | Baja | E50 traduce menú, barra, pie, avisos, búsqueda y botones comunes de los 4 paneles. El contenido de cada vista (títulos, tablas, formularios) sigue en español: hay que pasarlo al diccionario vista por vista si se quiere el panel completo en inglés |
| **Diseño del resto del sistema (pedido 28/09)** | Media | El usuario pidió "mejorar todo el diseño del sistema con más animaciones e interacción". En E50 se hizo el portal (`/`); faltan la landing `/sigae`, el login y los paneles, por partes y con capturas para que el usuario apruebe cada una |
| **SICEI** | Según el usuario | `/sicei` es "Próximamente". Información reunida y preguntas abiertas en `docs/SIDECYT.md` §7; sus 19 programas están ocultos en `/admin/sitio` → Programas SICEI (completar descripción/contacto y activarlos cuando se defina) |
| **Enlace de "Asistencia Técnica e Innovación"** | Baja | La página oficial da 404; el programa quedó sin enlace. Ponerlo en `/admin/sitio` cuando se conozca |
| **Borrador 4 de convocatoria** | Media | Recuperado del intento fallido (E47). Faltan: opciones de "Número de personas solicitantes?", el criterio de evaluación (nombre corto, detalle en la descripción) y revisar las fechas (01/05–01/06/2026 ya pasaron) |
| **Recuperación de contraseña pendiente** | Media | Solicitud del 24/09 16:45 para una cuenta de solicitante (`un***@edomex.gob.mx`): el enlace sale solo cuando el admin la aprueba en Recuperación Contraseñas |
| **Correo real para la cuenta admin** | **Alta** | El único admin tiene un correo de dominio sin servidor de correo (`comecyt.gob.mx`, sin MX): no le llega ningún aviso por correo (recuperaciones, accesos). Desde el 24/09 los avisos también llegan a la campana y el dashboard lo alerta, pero conviene cambiarlo en Usuarios (E46) |
| **`env()` fuera de `config/`** | Media | Cookies, límites de peticiones, SSO, VAPID y TSA leen `env()` directo: si algún día se corre `config:cache` en este servidor devolverían null. Los enlaces de correo ya están corregidos (E46). Moverlos a `config/` antes de cachear |
| **3 correos que nunca salieron (14 y 22/09)** | Baja | `failed_jobs` 1–3, de antes del SMTP real: 2 avisos de solicitud de acceso al admin y 1 "acceso aprobado" a un usuario (14/09). Se pueden reenviar con `php artisan queue:retry 2` si se quiere avisar al usuario |
| **Dar de alta periodos, admins de convocatoria y usuarios Consulta** | Media | E45 está listo pero sin datos: crear los periodos en `/admin/periodos`, asignarlos a las convocatorias, y dar de alta los usuarios de los roles nuevos con su alcance (paso "Alcance" en `/admin/usuarios`) |
| **Publicar convocatorias reales** | Media | Hoy no hay ninguna publicada: la landing muestra "Por ahora no hay convocatorias publicadas" hasta que el admin dé de alta la primera |
| **¿El balanceador guarda HTML en caché?** | Media | Preguntar a infraestructura si el ELB cachea respuestas y, si es así, pedir que purgue y que respete `Cache-Control: private, no-store` (lo que ahora envía el HTML, E42). El servidor ya se defiende solo, pero confirmar evita que un usuario vea una versión vieja |
| ~~**Ruta del balanceador nuevo**~~ | ✅ Resuelto 14/09/2026 (tarde) | Infraestructura corrigió el balanceador; el dominio funciona desde Internet (E23 en `CLAUDE.md`). Texto original: El VIP `10.200.41.131` (el que resuelve desde la publicación externa del 14/09/2026) devuelve `404`: no tiene registrada la entrega hacia `10.250.36.241:80`. **Solo lo puede hacer infraestructura; correo enviado el 14/09/2026.** Al responder: correr `VerificarDominio.ps1`, y si el origen **no** está en `100.64.0.0/10`, ajustar **el mismo día** las 5 apariciones del patrón en `web.config` (en dos formas distintas) y `TRUSTED_PROXIES` **juntas**, o habrá bucle de redirección. [DOMINIO_BALANCEADOR.md §12 y §9](DOMINIO_BALANCEADOR.md) · `Desktop\ADEM\_v5_publicacion_sep14\LEEME.md` |
| **Confirmaciones de infraestructura** | Alta | Rango de IPs del balanceador, HTTP→HTTPS en el balanceador, health check, 50 MB, timeouts. Incorporadas al correo del 14/09 (`_v5_publicacion_sep14\`); el original sigue en `Desktop\ADEM\_v4_dominio_sep11\`. [DOMINIO_BALANCEADOR.md §8](DOMINIO_BALANCEADOR.md#8-qué-necesita-hacer-o-confirmar-infraestructura) |
| **Prueba con usuario real por el dominio** | Alta | Login, navegación por rol, subir y previsualizar documento, notificación. [DOMINIO_BALANCEADOR.md §6](DOMINIO_BALANCEADOR.md#6-lo-que-falta-probar) |
| **Windows Update** | Alta | Servicio `wuauserv` detenido; último parche instalado el 27/03/2026. Pendientes: KB5122882 (acumulativa 2026-09), KB5126149 (.NET) y KB890830 (MSRT). Aplicar en ventana de mantenimiento, porque reinicia; conviene hacerlo junto con la activación de la licencia |
| **Respaldos** | Alta | (1) `comecyt:backup-db` de Laravel **falla cada noche**: llama a `pg_dump` y `gzip` del PATH, que no existen en Windows. La tarea de Windows sí funciona, así que es redundante: corregirlo (`C:\pgsql\bin\pg_dump.exe -Fc`, sin `gzip`) o quitarlo de `routes/console.php`. (2) **No hay copia fuera del servidor**: todos los dumps están en `F:` |
| ~~Cookie de sesión sin `Secure`~~ | ✅ Resuelto 23/09/2026 | `COOKIE_SECURE=true` y `COOKIE_SAME_SITE=Strict` activados. Verificado con un JWT real: el `Set-Cookie` trae `secure; httponly; samesite=strict`. `COOKIE_DOMAIN` se queda en `null` a propósito (acceso dual IP/dominio) |
| ~~`serverFetch` con certificado autofirmado~~ | ✅ Verificado 24/09/2026 | `NODE_EXTRA_CA_CERTS` en el servicio ya lo resolvía (el render en servidor trae datos); ahora además reenvía la IP real del cliente (E44) |
| ~~CSP con `script-src 'unsafe-inline'`~~ | ✅ Resuelto 24/09/2026 | Nonce por petición (E44). Queda `style-src 'unsafe-inline'` (bajo riesgo) |
| ~~Permisos del `.env`~~ | ✅ Resuelto 24/09/2026 | Solo SYSTEM, Administradores y lectura del AppPool `comecyt` (E44). Respaldo de ACL en `backups\20260924-seguridad\` |
| **Endurecimiento de red** | Baja (parcial) | **24/09/2026:** firma SMB requerida y reglas 5357/2179/135 cerradas (E44). **Falta:** restringir RDP (3389) y WinRM (5985) a la VPN — necesita el rango confirmado por infraestructura |
| **`Desktop\correo.txt`** | Media | Contiene la contraseña SMTP vigente en texto plano (solo la lee el administrador). Ya está en el `.env`: borrarlo cuando el usuario lo confirme |
| ~~Limpieza `C:\comecyt`~~ | ✅ Resuelto 23/09/2026 | Confirmado vacío y sin referencias; tarea rota eliminada; el directorio lo borró el usuario a mano (el sandbox de Claude Code no podía hacerlo desde ahí) |
| ~~Limpieza de `.next.bak-*`~~ | ✅ Resuelto 23/09/2026 | 18 respaldos eliminados, **7.84 GB liberados**. Se conservó `.next.bak-20260921-prefix-uploads` (el más reciente) como red de seguridad para un rollback rápido |
| **Logo Edomex** | Baja | `NEXT_PUBLIC_EDOMEX_LOGO_URL=none` — pendiente imagen oficial |
| ~~**Carrusel del login**~~ | ✅ Resuelto 23/09/2026 | Imágenes reales subidas por el usuario. Texto original: Los 4 slides no tienen imagen (`imagen_url` nula). La subida daba 422 (E32, corregido el 21/09/2026) — ya funciona, pero **todavía no se ha subido ninguna imagen real** en `/admin/carrusel` |
| **Disco C:** | Baja | 6.8 GB libres. Vigilar al aplicar actualizaciones |
| **Caché de configuración y rutas** | Baja | `app:deploy-check` avisa que no están cacheadas. Cachearlas mejora el rendimiento, pero obliga a correr `config:cache` tras cada cambio de `.env` (ver `CLAUDE.md`, E18) |
| **Sello de tiempo NOM-151** | Según uso | `TSA_URL` vacío: los documentos no llevan sello de tiempo. Configurar cuando TIC entregue el servicio |
| ~~Cabeceras menores~~ | ✅ Resuelto 23/09/2026 | Cabecera `Server`: confirmada ya oculta (`removeServerHeader` aplicado desde agosto, solo faltaba verificarlo con `curl.exe`). `Cross-Origin-Resource-Policy` en `/storage/*`: activada tras confirmar con las imágenes reales del carrusel |

---

## Historial de cambios recientes

| Fecha | Cambio |
|---|---|
| 2026-09-25 (tarde) | **E49:** SIDECyT definido; tablas `programas_publicos` y `contenido_sitio` (migración `2026_09_25_000001`, respaldo `comecyt_2026-09-25_1456.dump`); `/admin/sitio`; landing SIGAE con 9 programas, sectores y documentos desde la API; portal y SICEI con SIDECyT; `docs/SIDECYT.md` |
| 2026-09-25 | **E48:** SIGAC → **SIGAE** (código, correos, metadatos, docs; `/sigac` → 308 `/sigae`); **portal de sistemas en `/`** (SIGAE + SICEI, interactivo, pie con datos del COMECYT) y `/sicei` "Próximamente"; menú móvil con scroll y página fija; auditoría responsive (barra en 768 px, `.seg-tabs`, indicador del asistente) |
| 2026-09-24 (noche, 5) | **E47 — "Nueva convocatoria":** guardado atómico (una petición, todo o nada, errores por campo), borradores con autoguardado en el servidor y lista "Borradores sin terminar"; corregida la pérdida de opciones de listas y % de rubros. El intento fallido del usuario se recuperó como borrador. Migración `2026_09_24_000005` con respaldo previo. Verificado 24/24 + 16/16 |
| 2026-09-24 (noche, 4) | **E46 — correo de recuperación:** el SMTP funcionaba; la solicitud esperaba aprobación del admin y su aviso iba solo a un correo sin MX. Aviso ahora también en la campana (canal `CampanaChannel`, que además reemplaza el canal `database` que nadie leía), clic → página de la acción, alerta de correo de admin inválido, enlaces de correo sin localhost. Verificado 15/15 con envío real. Buzón: avisos ligados a su hilo (migración `2026_09_24_000004`) y campana del admin solo con lo propio |
| 2026-09-24 (noche, 3) | **E45 — alcance por convocatoria y periodo, perfiles con foto y portada, buzón con chat, historial y publicación de folios, límites de archivo por campo.** Migración `2026_09_24_000003` con respaldo previo (`comecyt_2026-09-24_1508.dump`). Bugs corregidos: `store` de solicitud (nadie podía crear una), `adminShowFull` 500, orden de `throttle` vs autenticación. Front desplegado (`e45`, `e45b`) |
| 2026-09-24 (noche, 2) | **E44 — Auditoría de ciberseguridad** de backend y front: documentos privados, cierre de sesión real, SW sin HTML, cuentas inactivas, notificaciones propias, dictamen blindado, CSP con nonce, seeder sin contraseña publicada, enumeración, política de contraseñas, invalidación de JWT al cambiar clave, `.env` con ACL restringida, firma SMB y 3 puertos cerrados, credenciales sueltas borradas. Migración `2026_09_24_000002` con respaldo previo. Incidente de 11 min con el SW (CSP de `sw.js`), corregido |
| 2026-09-24 (noche) | **E42 — carga infinita por el dominio** corregida en 3 capas (IIS: HTML `private, no-store`; `deploy-web.ps1` conserva los chunks anteriores; script de recuperación en `layout.tsx`). **E43 — vistas internas, menú y pie** rediseñados (marco pastel por sección, menú en bloques pastel, pie con logo ×5), bloque de Reverb/"Buenas prácticas" quitado del dashboard, botón "Menú" con nombre accesible en móvil |
| 2026-09-24 (tarde) | **E41 — Paneles v3:** barra flotante, `PageHeader` héroe, `PastelFrame`, `StatTile` v3, dashboards reestructurados, lienzo papel con salpicaduras; login sin cambios |
| 2026-09-24 | **E40:** estados públicos de convocatorias (próxima/abierta/con prórroga/cerrada), prórroga, banners de convocatorias y programas (solo admin, validación de MIME real y dominios), convocatorias de prueba cerradas y archivadas, 5 bugs de fechas corregidos, arcoíris → vino en landing y paneles. Migración `2026_09_24_000001` con respaldo previo |
| 2026-09-23 (tarde, 3) | **Paneles unificados con el diseño de la landing** (E39, `DISENO_UI.md` §12); login intacto. Landing: nombre completo "SIGAE — Sistema de Gestión de Apoyo Empresarial" y halo vino detrás del titular |
| 2026-09-23 (tarde, 2) | **SMTP Microsoft 365 funcionando** (E38). **Landing:** SIGAE, programas de Apoyo Empresarial, convocatorias en vivo (endpoint público E37 con throttle y lista blanca), vino de detalle, logo ×3, "Ir al sitio" en el login. **Regla permanente de ciberseguridad** en `CLAUDE.md` §0 |
| 2026-09-23 (tarde) | **Landing pública `/sigae` publicada** (referencia portrait.so, fuentes Switzer + Satoshi auto-hospedadas). `/` sin sesión → `/sigae`; `/privacidad` y `/terminos` públicas; `?email=` prellena el login. Pruebas axe 3/3, sin scroll horizontal a 375 y 1440 px. Ver `LANDING_SIGAE.md` y `CLAUDE.md` E36 |
| 2026-09-23 | **Cookie de sesión endurecida** (`Secure`+`Strict`, verificado). **Definida e implementada la transición `aprobada→convenio→ministracion`** (E33), que destapó 3 bugs más en `ConvenioController` nunca antes ejercitados — corregidos y verificados con datos desechables (E34). **Limpieza:** 7.84 GB liberados en respaldos `.next.bak-*`, tarea rota eliminada, `C:\comecyt` borrado. **SMTP institucional probado con credenciales reales — bloqueado por la institución** (E35): dos rutas rechazadas por políticas de Microsoft 365 / red interna, ninguna corregible desde el servidor. **Carrusel:** imágenes reales ya subidas por el usuario. **Cabeceras:** `Server` confirmada oculta; `Cross-Origin-Resource-Policy` activada en `/storage/*` |
| 2026-09-21 | **Rediseño vivo y multicolor de los 4 paneles, publicado**, más 3 bugs de producción encontrados y corregidos la misma tarde (E30, E31, E32 en `CLAUDE.md`): aprobar accesos daba 500 y nunca cerraba la solicitud; el mismo patrón bloqueaba **las 14 transiciones de estado** del ciclo de vida de `Solicitud` antes de que llegara la primera solicitud real; subir imagen del carrusel daba 422. Licencia de Windows con más margen (180 días, 3 rearmes). Ver `DISENO_UI.md` §10 |
| 2026-09-11 | **Dominio `sidecyt-comecyt.edomex.gob.mx` publicado detrás de balanceador.** `web.config` reconoce `X-Forwarded-Proto` del balanceador (una variable por condición; corregido un bucle por caché de URL Rewrite), HSTS vía balanceador, caché de respuestas apagada. Laravel con el dominio y `TRUSTED_PROXIES`. Frontend con API relativa, recompilado. Log de IIS con `X-Forwarded-*`. Nuevo `VerificarDominio.ps1`. Ver `DOMINIO_BALANCEADOR.md` y `CLAUDE.md` E22 |
| 2026-09-11 (cierre) | Revisión general del servidor, de solo lectura: se detectaron las cuentas de prueba en producción, el SMTP sin servicio, el respaldo de Laravel roto, Windows Update detenido desde marzo, la cookie sin `Secure` y los permisos del `.env`. Documentado en esta página; **sin cambios aplicados** |
| 2026-08-27 | Enlace `public\storage` (junction) y rebuild del frontend. `Cross-Origin-Resource-Policy` (26/08). Pentest de agosto: 7 de 7 hallazgos cerrados por ADEM el 25/08 |
| 2026-08-13 | Remediación del pentest de agosto: HTTPS en la IP con certificado `CN=10.250.36.241`, cabeceras de seguridad, `HostAllowList`. Dominio definitivo fijado como `sidecyt-comecyt.edomex.gob.mx` (guion medio) |
| 2026-07-31 | Se descarta `comecyt-sistemas.edomex.gob.mx` |
| 2026-06-30 | Migración de `C:\comecyt\` a `F:\Desarrollo Tecnologico\`. Junction `F:\comecyt` para NSSM. Binding 10.250.36.241. Rebuild frontend con IP |
| 2026-06-25 | Cambio de dominio a `comecyt-sistemas.edomex.gob.mx`. Cert autofirmado. WebSocket vía ARR resuelto (`webSocket enabled=true`) |
| 2026-06-15 | Despliegue inicial en Windows Server 2022. Stack IIS+NSSM+PostgreSQL 18 |
