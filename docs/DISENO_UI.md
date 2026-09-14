# Diseño UI — COMECYT

Sistema visual y de interacción del front. Empezó con el rediseño del login del **14/09/2026**, se
extendió ese mismo día al panel (shell + dashboard), a "¿Olvidaste tu clave?", a "Solicitar acceso" y a
la pantalla de carga del sistema. Es la referencia para cualquier vista nueva o rediseño.

---

## 1. Skills de diseño (usar siempre)

Instaladas el 14/09/2026 de forma global para Claude Code (`npx skills add <origen> -g -a claude-code -y`),
en `C:\Users\Administrator\.claude\skills\`. Cualquier trabajo de diseño debe pasar por ellas.

| Skill | Origen | Cuándo |
|---|---|---|
| `hallmark` | `https://github.com/Nutlope/hallmark` | Antes de diseñar o rediseñar: pre-flight del proyecto, estados completos, sello en el CSS, slop test. Verbos `audit`, `redesign`, `study` |
| `frontend-design` | `npx skills add https://github.com/anthropics/skills --skill frontend-design` | Dirección estética propia del tema; evita los rasgos de "página generada" |
| `ui-ux-pro-max` | `https://github.com/nextlevelbuilder/ui-ux-pro-max-skill` | Accesibilidad, táctil, formularios, paletas. Su buscador `scripts/search.py` necesita Python, que **no está instalado** en el servidor; las guías en `references/` sí se pueden leer |
| `emil-design-eng` y familia (`animate`, `improve-animations`, `review-animations`, `animation-vocabulary`…) | `npx skills add emilkowalski/skill` | Animaciones: si conviene animar, curva, duración, `prefers-reduced-motion` |

Reinstalar o actualizar: repetir el mismo `npx skills add`. Las skills son instrucciones que se ejecutan
con los permisos del agente: revisar su `SKILL.md` después de actualizarlas.

---

## 2. Principios (decisiones del usuario + skills)

- **Sin píldoras.** Nada de `rounded-full` en etiquetas, sellos, badges ni botones de navegación. Las
  etiquetas son texto con una línea dorada delante (`.auth-tag` en auth, `.app-tag` en el panel — `rounded-md`,
  no `rounded-full`); los botones son cuadrados redondeados. **Excepción deliberada:** el campo de búsqueda
  (`GlobalSearch`) y los indicadores de paso circulares (stepper de "Solicitar acceso") siguen `rounded-full`
  porque son afordancias reconocidas (campo de búsqueda, punto de progreso), no insignias de estado — la
  regla apunta a badges/etiquetas, no a todo `rounded-full`. Sigue habiendo usos de la insignia vieja
  (`rounded-full` + padding, tipo badge) en el contenido interno de varias vistas de `/admin/*` que no se
  tocó en esta pasada (tablas, formularios): homogeneizarlos es trabajo pendiente, ver §7.
- **Fondos poco saturados y translúcidos.** Una sola familia de color (vino → rosa → rubor) con alfa;
  el papel de la página se asoma detrás. El dorado es acento, no fondo: mezclado con el vino da café.
- **Logo protagonista.** `DualBranding size="xl"` sobre el formulario y logo blanco grande en el banner.
- **Una sola coreografía.** Entrada escalonada al cargar (60 ms por bloque). El resto del movimiento
  responde a una acción o marca un cambio real (diapositiva, estado del botón).
- **Accesible por defecto.** Etiquetas visibles (flotantes, nunca solo placeholder), foco visible sin
  animación, objetivos ≥ 24 px (≥ 44 px en los botones principales), `prefers-reduced-motion` respetado,
  carrusel pausable (WCAG 2.2.2).

---

## 3. Tokens (`apps/web/src/app/globals.css`)

Prefijo `--auth-*` para no pisar los `--ease-*` de Tailwind v4. Colores en OKLCH.

| Token | Uso |
|---|---|
| `--auth-paper` | Fondo de la página y del recorte del banner (deben ser iguales) |
| `--auth-field` / `--auth-field-hover` | Campos rellenos del formulario |
| `--auth-ink` / `--auth-ink-2` | Texto principal / secundario (≥ 4.5:1 sobre papel y campo) |
| `--auth-rule` / `--auth-rule-strong` | Bordes y subrayados |
| `--auth-vino` / `--auth-vino-strong` / `--auth-vino-soft` | Botón principal, foco, anillo de foco |
| `--auth-gold` | Línea de las etiquetas |
| `--auth-success` / `--auth-danger` | Botón "Acceso concedido" / errores y aviso de Bloq Mayús |
| `--auth-banner-base`, `--auth-blob-vino`, `--auth-blob-blush`, `--auth-blob-rose`, `--auth-glass` | Fondo del banner y panel de vidrio (el texto blanco del panel queda ≥ 4.5:1) |
| `--auth-ease-out` `cubic-bezier(0.23, 1, 0.32, 1)` / `--auth-ease-in-out` `cubic-bezier(0.77, 0, 0.175, 1)` | Curvas (Emil Kowalski) |
| `--auth-radius-card` 28 px / `--auth-radius-field` 14 px / `--auth-notch` 22 px | Radios |

---

## 4. Login (`/login`)

Archivos: `src/app/(auth)/login/page.tsx`, `src/components/ui/login-carousel.tsx`,
`src/components/branding/DualBranding.tsx` (tamaño `xl`), textos en `src/i18n/messages/{es,en}.json`
(`auth.login_success`, `auth.caps_lock_on`, `auth.carousel_*`).

### Banner (escritorio, `lg` en adelante)

- Tarjeta con margen y radio de 28 px sobre el papel. Fondo: imagen del admin (si hay) al 55 % y
  desaturada, tres manchas de color difuminadas y un grano muy tenue.
- Las manchas **cambian de posición solo al cambiar de diapositiva** (transición de 1.6 s): marcan el
  cambio sin moverse por su cuenta.
- Etiqueta (`badge_texto`) con línea dorada + panel de vidrio con título, subtítulo y descripción. El
  texto entra con desenfoque y un desplazamiento de 24 px en la dirección de navegación.
- **Recorte inferior derecho** (`.auth-notch`): las flechas quedan en una muesca del color del papel; las
  dos esquinas cóncavas son `::before`/`::after` con un gradiente radial.
- Progreso en segmentos (uno por diapositiva, 6.5 s). La animación del segmento activo marca el tiempo y
  su `animationend` avanza; pausar congela la barra (`animation-play-state`).
- **Pausa** al pasar el mouse, con foco de teclado dentro, con la pestaña oculta o con el botón de pausa.
  Con "reducir movimiento" arranca en pausa y, si el usuario reanuda, avanza por temporizador sin animar.
- Teclado: flechas ← → con el banner enfocado. Táctil o mouse: arrastre horizontal ≥ 60 px.

### Formulario

- Logo `xl`, título grande (`clamp(2rem, 3.2vw, 2.5rem)`, peso 700, tracking −0.035em), subtítulo.
- Campos rellenos de 58 px con **etiqueta flotante**: sube y se reduce al enfocar o al tener texto
  (`:placeholder-shown`). El ejemplo de correo aparece como placeholder solo con foco.
- Contraseña: mostrar/ocultar con transición del ícono y **aviso de Bloq Mayús** (`getModifierState`).
- Botón con cuatro estados visibles: normal (flecha que avanza al pasar el mouse), presionado
  (`scale(0.98)`), cargando (spinner + "Autenticando…") y éxito ("Acceso concedido" en verde mientras
  carga el panel). Deshabilitado al 60 %.
- Error: borde rojo en los campos (`aria-invalid`) + `AlertBox` enlazada con `aria-describedby`.
- 2FA con el mismo sistema de campos y botón.
- Estados de hover solo con puntero fino (`@media (hover: hover) and (pointer: fine)`).

---

## 5. Panel (shell interno: sidebar + topbar)

**14/09/2026.** Mismo sistema de colores del login, extendido con tokens `--app-*` / `--tile-*` en
`globals.css`. Antes el panel usaba un menú superior en mega-dropdown; ahora es un sidebar fijo, siguiendo
las referencias que dio el usuario (paneles con sidebar claro, tiles de color, saludo grande).

### Arquitectura — un solo componente para los 4 roles

- **`src/components/layout/AppShell.tsx`** — el shell real (sidebar + topbar + notificaciones + footer).
  Recibe `groups: AppNavGroup[]` (con o sin `label`), no roles hardcodeados.
- **`AdminTopLayout.tsx`** y **`RoleTopLayout.tsx`** (revisor/evaluador/solicitante) son ahora envolturas
  delgadas sobre `AppShell` — **mismo prop-interface externo que antes**, así que ningún `layout.tsx` de
  rol se tocó. Cambiar `AppShell.tsx` cambia los ~38 paneles de los 4 roles a la vez.
- Esto es lo que "aplica a todo el sistema, no solo a admin": el nav, el header, el pie y el fondo de
  **cada** vista de los 4 roles ya usan el shell nuevo. El **contenido interno** de cada vista (tablas,
  formularios) no se rediseñó vista por vista — ver §7 Pendiente.

### Sidebar

- Escritorio (`lg+`): fijo, 272 px, `position: sticky`, logo + nombre arriba, grupos con encabezado en
  mayúsculas (admin tiene 4 grupos; los demás roles, uno solo sin encabezado), tarjeta de usuario + botón
  de salir abajo.
- Item activo: bloque lleno vino (`.app-nav-item[data-active="true"]`), no una franja ni un punto.
- Item con hover: fondo tenue + `translateX(3px)` con resorte (solo con `hover: hover`).
- Móvil (`< lg`): drawer que entra desde la izquierda (`x: -100% → 0`, 220 ms) con scrim; el botón
  hamburguesa vive en el topbar compacto.

### Topbar

- Título de la sección activa (en vez de la migaja de pan con cápsula que había antes), buscador global
  (`GlobalSearch`, solo si el rol lo define), idioma, tema, campana de notificaciones.
- El contador de no leídas y la campana de notificaciones se movieron a `.app-tag` (`rounded-md`), no al
  círculo rojo `rounded-full` de aviso (ese sigue siendo un punto de estado, no una insignia con texto).

### Dashboard de administrador (`/admin/dashboard`)

- Saludo real: hora del navegador (mañana/tarde/noche) + primer nombre de la cookie `userName` — nunca
  texto inventado.
- Los 7 indicadores de `/admin/stats` rotan por 4 tonos institucionales (`--tile-vino/gold/sky/emerald`):
  fondo muy tenue (8-14 %) + chip sólido con el ícono. Con `data-interactive="true"` (`.app-card`): se
  eleva 3 px y se le nota el borde vino al pasar el mouse.
  - `IconMap` no tenía `Clock` (el ícono de "Ministraciones Pendientes" caía a `Bookmark` por defecto):
    corregido de paso.
- Gráficas (recharts) intactas, solo re-vestidas con `.app-card` y `var(--app-rule)` en vez de grises fijos.
- Alertas: tono vino o cielo según si es error, sin la insignia `rounded-full` que tenían antes.

### Pantalla de carga (`RouteLoadingScreen`, `.route-loading-*`)

Referencia del usuario: logo centrado, anillos concéntricos muy tenues, fondo transparente — nada
saturado. Implementación:

- **`src/components/ui/GlobalLoader.tsx`** exporta `RouteLoadingScreen` (logo + dos anillos "sonar" que
  laten hacia afuera, `--auth-vino` y `--auth-gold` al 100 %→0 % de opacidad) y sigue exportando
  `GlobalLoaderProvider`/`useGlobalLoader` con la **misma API** de antes — solo cambió el dibujo, no cómo
  se usa. La versión anterior (velo negro, doble anillo giratorio, mensaje, puntitos) quedó reemplazada.
- **`loading.tsx`** en `app/`, `app/(auth)/`, `app/admin/`, `app/revisor/`, `app/evaluador/` y
  `app/solicitante/` — el mecanismo nativo de Next.js App Router: se muestra solo mientras Next resuelve
  la navegación a una ruta (primera carga de cualquier página, y cambio de página cuando el segmento de
  esa ruta todavía no está en caché). **No hace falta togglearlo a mano.**
- **Decisión de diseño — no se puso en cada botón.** El usuario pidió la pantalla también "al pulsar
  botones... realizar alguna interacción con el sistema". Se dejó fuera a propósito: casi todos los
  botones del sistema ya tienen su propio spinner local (`isLoading` en `Button`), y una pantalla completa
  en cada clic — incluidas acciones frecuentes como búsquedas o filtros — iría en contra de "interactivo y
  rápido" (ver `emil-design-eng/SKILL.md` — nunca una pantalla completa para algo que pasa cientos de
  veces al día) y duplicaría el spinner que ya existe. Para una acción puntual que sí bloquea toda la
  página (ninguna hoy lo hace), está `useGlobalLoader()` — ya construido — para activarla ahí.
- **Verificado en producción** (no en un mock): con los chunks de JS retardados artificialmente y un clic
  real de navegación, la pantalla aparece exactamente como el anillo concéntrico de la referencia,
  encima del sidebar ya resuelto (blur + el 72 % de opacidad del papel).

---

## 6. "¿Olvidaste tu clave?" y "Solicitar acceso"

**14/09/2026.** Mismo sistema `--auth-*` del login: panel institucional a la izquierda (estático, sin
carrusel — una sola "diapositiva" fija con el mensaje del paso) + formulario con etiquetas flotantes a la
derecha.

- **Olvidaste tu clave:** banner fijo ("Un administrador revisa cada restablecimiento"), estados
  normal/cargando/enviado, mismas dos notas informativas de antes (revisión manual, 60 minutos) pero sin
  las cajas de color saturado que tenían.
- **Solicitar acceso** (formulario de 5 pasos): el banner cambia de mensaje según el paso activo
  (`STEP_BLURB`) y muestra una barra de progreso de 5 segmentos igual en lenguaje visual al carrusel del
  login. El stepper compacto en el formulario sigue siendo círculos numerados (afordancia de paso, no
  insignia — ver nota de §2). Los campos de texto usan el mismo patrón `FField`/`auth-input`/`auth-label`
  del login; el select y el textarea usan `StaticField` (etiqueta fija arriba, variante
  `.auth-input-static` que centra el contenido en vez de dejar el hueco de la etiqueta flotante).
  Los 3 inputs de cada contacto (nombre/teléfono/correo) llevan `aria-label` — no tenían ninguna
  asociación de label ni antes ni ahora, corregido de paso.
- **Trampa de accesibilidad (14/09/2026):** los primeros `<input>` de este formulario no tenían `id` ni el
  `<label>` su `htmlFor` — axe lo marcó (`page.a11y.test.tsx`) porque `FField` solo envolvía visualmente el
  input, sin asociarlo. Fix: `FField`/`StaticField` clonan su hijo (`React.cloneElement`) para inyectarle
  el `id` que reciben por prop, en vez de repetir `id=`/`htmlFor=` iguales en cada punto de uso.

---

## 7. Pendiente (no cubierto en esta pasada)

- **Contenido interno de las ~24 vistas de `/admin/*`** (tablas, tarjetas, formularios de creación/edición)
  sigue con el estilo anterior a la píldora, salvo lo que ya comparte componentes (`Card`, `Button`,
  `Input`, `DataCardGrid`) y por tanto heredó los estados de foco/hover mejorados. Rediseñar cada vista de
  contenido es una tarea aparte, vista por vista.
- El resto del sistema (revisor/evaluador/solicitante) heredó el shell nuevo pero, igual que admin, su
  contenido interno no se tocó.
- `GlobalSearch.tsx`: el placeholder "Buscar folio, usuario, institución…" se cortaba a medio carácter en
  el buscador del topbar (`max-w-xs` = 320 px, insuficiente). Ensanchado a `max-w-sm` (384 px) — no se
  rediseñó el resto del componente (resultados, atajos).

---

## 8. Verificación

```powershell
cd "F:\Desarrollo Tecnologico\apps\web"
npx tsc --noEmit -p .
npx vitest run                              # las 28 suites, incluidas las de axe
npx eslint "src/app/(auth)/**/*.tsx" "src/app/admin/dashboard/page.tsx" "src/components/layout/*.tsx" "src/components/ui/GlobalLoader.tsx"
```

Revisión visual e interactiva del login (14/09/2026) con Playwright usando el Chrome instalado, contra
`npx next dev -p 3100`: capturas a 1440, 1920 (con "reducir movimiento") y 390 px; sin scroll horizontal;
autoplay avanza; foco, error y segunda diapositiva; 0 errores de consola. Chrome headless en Windows no
baja de ~500 px de ancho con `--window-size`: para celular usar Playwright con `viewport`.

Revisión del panel/dashboard/loading (14/09/2026, misma tarde): contra `dev` para las páginas públicas
(forgot-password, solicitar-acceso, 390 px) y **contra producción con una sesión real** (login por
Playwright, no un mock) para el sidebar de los 4 roles, el drawer móvil, el dashboard con datos reales y
la pantalla de carga — ver §5. 0 errores de consola inesperados (los "SSL certificate error" al capturar
con `ignoreHTTPSErrors` son del PWA/service worker contra el certificado autofirmado, no de este cambio).

**Trampa de hidratación:** `useReducedMotion()` devuelve `null` en el servidor. Usarlo directo en el
render cambia `aria-live`, íconos y variantes entre servidor y cliente. Se aplica después de montar
(ver E7 en `CLAUDE.md`).

**Trampa de React (14/09/2026):** un componente declarado *dentro* de otro (`const NavList = () => …`
dentro de `AppShell`) se vuelve a crear en cada render y pierde el estado — eslint lo marca
(`react-hooks/static-components`). Sacarlo a nivel de módulo, con sus datos por prop.

---

## 9. Despliegue

Igual que E20 de `CLAUDE.md`: detener `comecyt-web`, respaldar `.next`, `npm run build`, copiar `static`
y `public` a `standalone`, iniciar el servicio. Los `NEXT_PUBLIC_*` se hornean en el build, así que
cualquier cambio de `.env.local` requiere recompilar (E24). Script listo:
`F:\Desarrollo Tecnologico\deploy-web.ps1 -Motivo <texto>` (hace exactamente esto y deja el log en
`logs\deploy-<texto>-<fecha>.log`).
