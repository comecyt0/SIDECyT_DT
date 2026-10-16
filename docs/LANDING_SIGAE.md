# Landing pública SIGAE — `/sigae`

**Publicada:** 23/09/2026 · **URL:** https://sidecyt-comecyt.edomex.gob.mx/sigae
(también por VPN: `https://10.250.36.241/sigae`)

Página de presentación del sistema **antes del login** y **puerta de entrada a todas las convocatorias de
Apoyo Empresarial del COMECYT**. Muestra las convocatorias abiertas en vivo, los programas, los sectores, el
recorrido de una solicitud y los roles, y cierra con la tarjeta «Entra a SIGAE», que lleva a `/registro` o a
`/login`.

> **16/10/2026, pedido del usuario:**
> - Se quitó también la tarjeta final **«Entra a SIGAE»** (`.lp-final`): la landing termina en «Un lugar para cada
>   quien» y luego el pie. Iniciar sesión y Crear cuenta siguen en la barra.
> - La barra ya no lleva el logo COMECYT: lleva el logotipo tipográfico «SIGAE · Apoyo Empresarial» (E77).
>
> **15/10/2026, pedido del usuario:** se quitaron las secciones **«Lo que vas a preparar»** (documentos y notas de
> `contenido_sitio`) y **«¿Cómo obtengo acceso?»** (los 3 pasos). La tarjeta final se conservó sola (`.lp-cierre`), y
> el CSS de `.lp-docs`, `.lp-doc-notes` y `.lp-access` se borró.
> - Los documentos y las notas **se siguen editando** en `/admin/sitio`, pero ya no se muestran en la landing.
> - Si el usuario los quiere de vuelta, el código está en git (commit de este día). En la landing el sistema se llama **SIGAE — Sistema de Gestión de Apoyo Empresarial**
(nombre y significado confirmados por el usuario; antes decía SIDECyT). El nombre completo aparece en el texto
del hero, en la tarjeta final, en el `title` del logo del nav y en los metadatos de la página.

> **25/09/2026 (E48):** el sistema pasó de **SIGAC** ("Sistema de Gestión de Apoyos Científicos") a **SIGAE** ("Sistema
> de Gestión de Apoyo Empresarial"); la landing se movió de `/sigac` a **`/sigae`** (carpeta `app/sigae`) y `/sigac`
> redirige con 308. Además **`/` ya no redirige a la landing**: muestra el portal de sistemas del COMECYT (SIGAE y SICEI),
> documentado en `docs/DISENO_UI.md` §16. Las secciones de abajo conservan su historia con el nombre nuevo.
>
> **25/09/2026 (E49):** **programas, sectores estratégicos, documentos y notas ya no están en `Landing.tsx`**: vienen de
> `GET /api/sitio/sigae` y se editan en el panel (Configuración → Contenido público, `/admin/sitio`). Son 9 programas
> (los del sitio oficial). El titular cuenta los programas reales ("Nueve programas…"). Las etapas del recorrido, los
> roles y los pasos de acceso siguen en el código porque describen el sistema, no un programa. Ver `docs/SIDECYT.md`.

## 0. Cambios del 23/09/2026 (tarde), en orden

1. Nombre **SIGAE** en toda la landing ("Entra a SIGAE", marca del nav, metadatos).
2. **Contenido de Apoyo Empresarial** de https://comecyt.edomex.gob.mx/apoyo-empresarial y de la página de
   cada programa (consultadas el 23/09/2026): 4 programas con público objetivo, descripción, correo y
   enlace oficial; 30 sectores estratégicos; formatos que piden las convocatorias; Reglas de Operación,
   Lineamientos del Comité, garantía con afianzadora y reporte del IMPI; dirección y teléfonos del COMECYT.
   **No se copian fechas ni estatus** de esas páginas: cambian cada año; se enlaza a la página oficial.
3. Correo del pie: **`proyectos.comecyt@edomex.gob.mx`**.
4. **Acentos en vino institucional** (`oklch(36% 0.1 358)`, el mismo `--auth-vino` del login), solo en
   detalles: barra corta bajo cada título, números de etapa, línea "Consejo Mexiquense…", etiqueta "Nuevo"/
   "Abiertas", "Para:" de los programas, enlaces a convocatorias, fecha de cierre y filo superior de cada
   convocatoria, números de acceso, viñetas de documentos, título de la tarjeta final, íconos y filo del pie,
   hover de botones secundarios y selección de texto. Nunca fondos grandes ni botones rellenos.
5. **Logo de COMECYT 3 veces más grande** en encabezado (dibujo visible ~26 → 78 px) y pie (~35 → 104 px),
   con `public/logo-recortado.png` (el `logo.png` original tiene ~46 % de margen transparente). En teléfono
   el del encabezado se limita a 40–46 px para que quepa con "SIGAE" y el botón.
6. **Convocatorias abiertas en vivo** (§10) y píldora del nav "N convocatorias abiertas".
7. Botón **"Ir al sitio"** en el login (arriba a la izquierda) → `/sigae`.
8. Nombre completo **"SIGAE, el Sistema de Gestión de Apoyo Empresarial"** en el texto del hero (en vino).
9. **Halo detrás del titular en vino** (`oklch(36% 0.1 358 / 0.13)`), antes lavanda de la referencia.
10. El mismo sistema visual se llevó a todos los paneles: `DISENO_UI.md` §12.

---

## 1. Rutas y enrutamiento

| Petición | Resultado |
|---|---|
| `/` sin sesión | `302` → `/sigae` (lo resuelve `proxy.ts`) |
| `/` con sesión | `302` → el panel de su rol (sin pasar por `/login`) |
| `/sigae` | Pública para todos (en `PUBLIC_PATHS`) |
| `/privacidad`, `/terminos` | **Públicas desde este cambio.** Antes mandaban al login a quien no tenía sesión, y la landing las enlaza desde el pie |
| `/login?email=…` | El login prellena el correo (y enfoca la contraseña) si el valor parece un correo válido |

`src/app/page.tsx` redirige a `/sigae` solo como respaldo: en la práctica `proxy.ts` resuelve `/` antes.
En IIS no hubo que tocar nada: `/sigae` cae en la regla `NextJsProxy` de `public/web.config`.

## 2. Archivos

| Archivo | Qué hace |
|---|---|
| `apps/web/src/app/sigae/page.tsx` | Página de servidor: metadatos (título, descripción, OpenGraph, canonical) y fuentes locales |
| `apps/web/src/app/sigae/Landing.tsx` | Componente cliente: nav, hero con collage, etapas, roles, acceso y pie |
| `apps/web/src/app/sigae/landing.css` | Todos los estilos, con prefijo `.lp-*`. Los tokens viven en `.lp-root`, **no** en `:root` |
| `apps/web/src/fonts/` + `apps/web/src/lib/fonts.ts` | `Switzer-Variable.woff2`, `Satoshi-Variable.woff2` y su licencia (FFL). Desde la unificación de paneles (E39) las comparten landing y paneles; el layout raíz pone sus variables en `<html>` (el login sigue en Geist) |
| `apps/web/src/app/sigae/Landing.a11y.test.tsx` | axe sin violaciones + validación del correo + enlaces a login/acceso |
| `apps/web/src/proxy.ts` | `/sigae`, `/privacidad` y `/terminos` en `PUBLIC_PATHS`; regla de `/` |
| `apps/web/src/app/(auth)/login/page.tsx` | Prellenado de `?email=` |

La landing está aislada: no usa ni modifica `--auth-*`, `--app-*` ni `globals.css`. Los paneles, el login
y el menú no cambian.

## 3. Referencia de estilo: portrait.so

El usuario entregó el `design.md` de https://portrait.so (tokens CSS, Tailwind v4 y DTCG) y pidió copiar
sus efectos, animación e interfaz. Se tomó su **ADN**, no sus píxeles ni su contenido:

| De portrait.so | En SIDECyT |
|---|---|
| Lienzo blanco, tinta navy `#08304c` como único color de texto y líneas | Igual |
| Arcoíris de firma solo en 3 lugares | Contorno del botón "Iniciar sesión"/"Continuar" (uno por vista), la palabra **convenio** del titular y el cuadrito de marca junto a "SIDECyT" |
| Nav flotante en píldora con anuncio "New" | Píldora "Nuevo · Conoce el recorrido de tu solicitud" que baja a las etapas |
| Campo de dominio con el CTA arcoíris embebido | Campo de **correo institucional** con "Continuar" embebido: lleva al login con el correo ya escrito |
| Collage de fotos tipo polaroid inclinadas en el hero | Polaroids con **piezas del expediente** (convocatoria, rúbrica, convenio con firma, expediente, observación, ministración) |
| Lavados pastel menta / cielo / durazno | Igual, cada uno con su tinta oscura para texto (≥ 7:1) |
| Radios 24 px tarjetas / 28 px botones / píldora en chips | Igual |
| Sombras de 6 capas al 3 % | Igual (nunca más de 8 %) |
| Un solo degradado radial lavanda detrás del titular | Igual |

**Desviaciones deliberadas (y por qué):**

- **Sin fotografías.** Las imágenes del carrusel del login son logotipos, no fotos, y no hay fotografía
  real del programa. Poner fotos de banco como si fueran reales es contenido inventado; las polaroids
  ilustran el proceso con arte CSS/SVG. Si COMECYT entrega fotos reales de proyectos, pueden sustituir
  el contenido de `PINS` en `Landing.tsx` sin tocar el CSS.
- **La palabra arcoíris va en redonda, no en cursiva** (regla de Hallmark: nada de titulares en cursiva).
- **Fuentes:** Switzer es gratuita (Fontshare) y se usa tal cual. Basier Circle es comercial: se sustituyó
  por **Satoshi** (Fontshare, gratuita), que es uno de los sustitutos que el propio `design.md` sugiere.
  Ambas se auto-hospedan con `next/font/local` porque la CSP solo permite `font-src 'self'`, y porque el
  servidor **no alcanza `fonts.googleapis.com`** (sí `api.fontshare.com`, con `--ssl-no-revoke`).
  Licencia FFL: uso comercial y web permitido.
- **Texto de ayuda en `#585858`, no `#797979`:** el gris de referencia da 4.48:1 sobre blanco y no llega a
  AA en texto chico. `#797979` queda solo para el placeholder.
- **Vino institucional como acento secundario** (pedido del usuario): la referencia no lo tiene; se agrega
  solo en detalles para que la página se reconozca como COMECYT sin saturarla (lista en §0).
- **El logo de Edomex no aparece** porque producción tiene `NEXT_PUBLIC_EDOMEX_LOGO_URL=none`; la landing
  respeta la misma regla que `DualBranding`.

## 4. Estructura

1. **Nav flotante** (fija, píldora): logo COMECyT grande + "SIGAE" + cuadro arcoíris · píldora (≥ 900 px):
   "N convocatorias abiertas" si hay, o "Conoce los programas de apoyo empresarial" si no · "Solicitar
   acceso" (≥ 560 px) · "Iniciar sesión" con contorno arcoíris. Al hacer scroll gana un filo de 1 px.
2. **Hero:** nombre de la institución · titular "Tu proyecto, de la idea al **convenio**" · texto ·
   campo de correo con "Continuar" · "¿Todavía no tienes cuenta? Solicita acceso". Polaroids alrededor
   (≥ 1100 px, 6 tarjetas, algunas recortadas por el borde de la pantalla); en móvil, una tira de 3
   tarjetas encimadas bajo el formulario. Las polaroids usan los nombres reales de los formatos.
3. **Convocatorias abiertas** (en vivo, §10).
4. **Cuatro programas de apoyo, una sola plataforma:** tarjetas con público objetivo, descripción, correo del
   programa y "Ver convocatoria y formatos" (abre el sitio oficial en otra pestaña).
5. **¿Tu proyecto encaja?:** los 30 sectores estratégicos como etiquetas pastel.
6. **Ocho etapas, un mismo expediente:** las 8 etapas reales del ciclo (Convocatoria → Solicitud →
   Revisión documental → Evaluación técnica → Convenio → Ministración → Informe final → Cierre), con
   quién actúa en cada una. La numeración está justificada: es una secuencia.
7. **Lo que vas a preparar:** los 6 formatos habituales y notas (Reglas de Operación, afianzadora, IMPI).
8. **Un lugar para cada quien:** los 4 perfiles (solicitantes, revisión documental, evaluación técnica,
   administración) con encabezado fijo a la izquierda en escritorio.
9. **¿Cómo obtengo acceso?:** 3 pasos (solicitar, validación por la administración, entrar) y la tarjeta
   final "Entra a SIGAE" con los dos botones.
10. **Pie:** logo grande, aviso de privacidad, términos, enlace a Apoyo Empresarial del sitio oficial,
    dirección, teléfonos, `proyectos.comecyt@edomex.gob.mx` y `copyrightLine()`.

## 10. Convocatorias en vivo, por estado (E37 → E40, 24/09/2026)

- **Fuente:** `GET /api/convocatorias/publicas` (alias `/abiertas`), `ConvocatoriaPublicaController`. Es la misma
  base de datos del sistema: cuando el admin publica, edita, da prórroga, cambia el banner o el cierre
  automático cierra una convocatoria, la landing lo refleja al instante (caché invalidada por eventos).
- **Estados** (los calcula el backend con las fechas en hora de Toluca — ver `CLAUDE.md`, "Estado público"):
  | Estado | Cuándo | Cómo se ve |
  |---|---|---|
  | Próxima a abrir | publicada y aún no llega su apertura | píldora cielo, "Abre en N días", botón "Prepárate: solicita acceso" |
  | Abierta | entre apertura y cierre | píldora menta con punto que late, "Quedan N días" (vino si ≤ 7), "Postular en SIGAE" |
  | Con prórroga | abierta con plazo ampliado | píldora durazno, "Prórroga hasta X" y la fecha original tachada |
  | Cerrada | cerrada a mano o pasó su fecha límite (últimos 180 días) | píldora gris, banner desaturado, sin botón |
- **Pestañas:** Abiertas / Próximas a abrir / Cerradas con su conteo; abre en la primera que tenga
  convocatorias. Flechas ←/→ para moverse entre pestañas (`role="tablist"`). En teléfono la etiqueta se acorta a
  "Próximas" y el nombre accesible completo va en `aria-label`.
- **Banner:** el de la convocatoria o, si no tiene, el de su programa. 3:1, con zoom lento al pasar el cursor.
  Solo se pinta si es una ruta propia `/storage/banners/…` o `https` de un dominio autorizado (doble filtro:
  `safeBanner` en el backend y `bannerSeguro` en el front); cualquier otro valor → sin imagen.
- **Píldora del menú:** "N convocatorias abiertas"; si no hay abiertas pero sí próximas, "N convocatorias por
  abrir"; si no hay ninguna, "Conoce los programas de apoyo empresarial".
- **Estados de la sección:** esqueleto mientras carga; "Por ahora no hay convocatorias publicadas" si no hay
  nada; "No pudimos cargar las convocatorias" si la API falla.
- **Seguridad:** `fetch` relativo (CSP `connect-src 'self'`), sin cookies, cada registro validado en
  `parseGrupo()` (tipos, fechas, estado dentro de la lista permitida) y pintado como texto.
- **Datos de prueba:** las 5 convocatorias de carga inicial se cerraron y archivaron el 24/09/2026 (E40); hoy la
  landing no muestra ninguna hasta que el admin publique una real.

### Cómo publica el admin

1. **Alta** en `/admin/convocatorias/nueva` (asistente): se publica sola con sus fechas; al terminar abre la
   ficha. Si la apertura es futura, la landing la muestra como "Próxima a abrir".
2. **Banner** en la ficha de la convocatoria (y/o en la ficha del programa): subir JPG/PNG/WebP (≤ 5 MB, mínimo
   600×200, recomendado 1600×540) o pegar un enlace `https` de un dominio institucional autorizado.
3. **Prórroga** con "Dar prórroga" (lista o ficha): nueva fecha posterior a la vigente + motivo.
4. **Cerrar antes de tiempo:** editar y elegir "Cerrada".

**Acento de firma:** desde el 24/09/2026 el arcoíris de la referencia se sustituyó por **vino no saturado**
(`--gradient-vino`): contorno del CTA con relleno de lavado vino que barre de izquierda a derecha al pasar el
cursor, cuadro de marca y la palabra "convenio" del titular, que recibe un destello de luz una sola vez al
terminar la entrada.

**Contenido honesto:** no hay cifras, testimonios ni logotipos inventados. Nombres, correo y textos
institucionales salen de `lib/institution.ts` (variables `NEXT_PUBLIC_INSTITUTION_*`).

## 5. Movimiento (emil-design-eng)

| Momento | Cómo | Por qué |
|---|---|---|
| Entrada del hero | Palabra por palabra (55 ms entre palabras, 760 ms, `translateY` + desenfoque 8→0 px), luego texto y campo; las polaroids "caen" al muro (rotación 8°→0, escala 0.94→1, 90 ms entre tarjetas) | Un solo momento orquestado. **Espera a que se retire la pantalla de carga del sistema** (`BOOT_MS` = 1100 ms, el mismo de `RouteChangeOverlay`) |
| Firma del convenio | `stroke-dashoffset` una vez, 1.4 s | Explica qué es esa tarjeta |
| Paralaje de polaroids | Resorte de Framer (`stiffness 60, damping 18`) según el puntero, con `transform` completo (acelerado por hardware) | Decorativo; solo con puntero fino, ≥ 1100 px y sin "reducir movimiento" |
| Etapas | Revelado escalonado (60 ms) una sola vez al entrar en pantalla | Se anima la propiedad `translate` con `fill: backwards`, así no pisa la rotación de cada tarjeta ni su hover |
| Hover de tarjetas | Se enderezan y suben 4–6 px | Solo con `@media (hover: hover) and (pointer: fine)` |
| Botones | `scale(0.97)` al presionar (140 ms); la flecha avanza 3 px; resplandor arcoíris por opacidad | Respuesta inmediata |

Curvas: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` y `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`.
Con `prefers-reduced-motion: reduce` todo se vuelve un fundido de 150 ms, sin desplazamientos; la firma
aparece dibujada; no hay paralaje. Sin JavaScript, un `<noscript>` deja todo visible.

## 6. Estados del formulario del hero

| Estado | Comportamiento |
|---|---|
| Normal | Placeholder `INSTITUTION.emailHint` |
| Foco | Filo navy de 1.5 px + halo cielo de 6 px |
| Error | Filo rojo y mensaje con ícono: "Escribe un correo válido, por ejemplo usuario@institucion.edu.mx" (`role="alert"`); se borra al escribir |
| Enviando | El botón muestra un giro, queda deshabilitado y aparece la pantalla de carga "Abriendo inicio de sesión…" |
| Éxito | `router.push('/login?email=…')`; el login prellena el correo y enfoca la contraseña |
| Móvil ≤ 400 px | "Continuar" se reduce a la flecha (conserva `aria-label`) |

## 7. Verificación hecha (23/09/2026)

- `tsc --noEmit` sin errores; ESLint 0 errores (2 avisos `set-state-in-effect`, mismo patrón que ya usa
  `login-carousel.tsx` para E7).
- `vitest`: 5/5 en `Landing.a11y.test.tsx` (axe sin violaciones, validación del correo, convocatorias en
  vivo con datos maliciosos, estados vacío/error, enlaces) y la prueba del login sigue pasando.
- Producción tras la tercera vuelta: 5 convocatorias pintadas, píldora "5 convocatorias abiertas", "Ir al
  sitio" del login lleva a `/sigae`, sin errores de consola, sin scroll horizontal a 1440 y 375 px.
- Capturas con Edge headless a 1440×900 y 375×812: **sin scroll horizontal** en ninguna.
- Flujo real: `/` → `/sigae`; correo inválido muestra el error; correo válido abre
  `/login?email=persona%40institucion.edu.mx` con el campo lleno; `/privacidad` y `/terminos` responden
  200 sin sesión.
- Producción: ver §8.

## 8. Despliegue

`& "F:\Desarrollo Tecnologico\deploy-web.ps1" -Motivo landing` (respaldo `.next.bak-20260923-prelanding`,
log en `logs\deploy-landing-20260923.log`). Solo frontend; el backend no cambió.

## 9. Cómo cambiar cosas

- **Textos de etapas, roles o pasos:** arreglos `STEPS`, `ROLES`, `ACCESS` al inicio de `Landing.tsx`.
- **Programas, sectores y documentos:** arreglos `PROGRAMS`, `SECTORS`, `DOCUMENTS` (contenido del sitio
  oficial; revisar cada año contra comecyt.edomex.gob.mx). Correo del pie: `CONTACT_EMAIL`.
- **Convocatorias abiertas:** no se editan aquí — se administran en `/admin/convocatorias`.
- **Titular:** `HEADLINE` + `HEADLINE_ACCENT` (la palabra arcoíris; mantener una sola).
- **Polaroids:** arreglo `PINS` (`slot` a–f fija la posición en escritorio, `r` la inclinación, `depth` la
  intensidad del paralaje).
- **Colores:** tokens al inicio de `landing.css`, dentro de `.lp-root`. No introducir otro color de marca:
  la paleta es tinta navy + vino oficial `#56212F` (detalles) + dorado `#BC955B` (acentos) + tres lavados pastel.
- Después de cualquier cambio: `npx vitest run src/app/sigae` y `deploy-web.ps1`.

## 11. Cambios del 28/09/2026 (E50)

- **Banda institucional arriba** (`BandaInstitucional`, convivencia oficial de logos) en flujo antes de la barra; la
  barra flotante empieza desplazada `--banda-h` y sube a su sitio cuando el scroll pasa de 64 px (`data-scrolled`,
  animación de `translate`). El pie ya no lleva franja ni el marcador de Edomex.
- **Logo oficial** en barra, tarjeta final y pie (`LogoComecyt`); el pie suma el enlace "SIDECyT".
- **"Regresar a SIDECyT"** en la barra (`/`): texto completo desde 1100 px, "SIDECyT" debajo, solo flecha < 380 px.
- **Correo del héroe → login:** `EmailClaim` guarda el correo en `sessionStorage['sidecyt:correo-login']` antes de ir a
  `/login?email=…`; el login lo lee primero (y lo borra) y usa `?email=` como respaldo. Evita la carrera entre la
  navegación del cliente y la lectura de la URL.
- **Barra sin encimarse:** marca `flex: none`; la píldora "Nuevo" aparece desde 1240 px (antes 900) y se recorta con
  puntos suspensivos si no cabe.
- **Títulos en Montserrat** (`--font-basier-circle` = `--font-titulos`, sustituto de Gotham). Ver `docs/IDENTIDAD.md`.
