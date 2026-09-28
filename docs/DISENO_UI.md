# Diseño UI — COMECYT

> **23/09/2026:** nueva landing pública `/sigae` con sistema visual propio (referencia portrait.so) — ver §11
> y [`LANDING_SIGAE.md`](LANDING_SIGAE.md). **Ese mismo sistema se llevó a todos los paneles** (el login
> queda igual) — ver §12. **24/09/2026: rediseño estructural v3** (barra flotante, héroes, marcos pastel,
> referencia aboardhr.com) — ver **§13, dirección vigente**. §10 queda como historia de la capa de clases.

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

## 5. Panel — contenido de las vistas (el menú NO se toca)

**14/09/2026.** Mismo sistema de colores del login, extendido con tokens `--app-*` / `--tile-*` en
`globals.css`. Las referencias del usuario (Mindnest / Ziferblat / Skillex) se aplican al **contenido**:
héroe con saludo, tiles de color accionables, anillo de avance, lista de actividad.

> **Corrección del usuario (E26 en `CLAUDE.md`):** en una primera pasada se cambió el menú superior por un
> sidebar. No lo quería: "el menú debía permanecer igual, solo rediseñar los paneles". `AdminTopLayout.tsx`
> y `RoleTopLayout.tsx` volvieron **byte a byte** al original y `AppShell.tsx` se borró. **El menú, la barra
> superior y el pie del panel están fuera del rediseño.** Todo lo de abajo vive dentro de `<main>`.

### Primitivas compartidas (cambian muchas vistas a la vez)

- **`Badge`** (`components/ui/badge.tsx`): `rounded-4xl` → `rounded-md`. Lo usan **27 vistas** de los 4
  roles: quita la píldora de todas las insignias de estado sin tocar cada archivo.
- **`DataCardGrid`** (6 vistas de admin: usuarios, empresas, convenios, ministraciones, solicitudes, lista
  negra): base `.app-card` (papel/regla por tokens) + la barra lateral de acento y el resplandor por color
  que ya tenía. `data-interactive` solo cuando hay `onCardClick` (si no, `cursor: pointer` mentiría).
- Patrón de campo de formulario en modales: `.auth-input.auth-input-static.pl-10` con ícono a la izquierda y
  label fijo arriba, envuelto en un `FField` local que clona el hijo para inyectar `id`/`aria-invalid`/
  `aria-describedby` (ver `UsuariosClient.tsx`). Mismo lenguaje que el login, sin duplicar tokens.

### Dashboard de administrador (`/admin/dashboard`) — segunda versión

Estructura (escritorio, 3 columnas):

1. **Héroe** (2/3) — saludo por hora + primer nombre de la cookie, fecha larga, convocatoria activa y su
   cierre (`/admin/convocatorias`), dos CTA. Fondo: dos manchas del sistema `.auth-blob` al 45-50 % sobre
   papel — el guiño a Mindnest, sin saturar. **Anillo de avance** (1/3): SVG con `strokeDashoffset`
   animado una vez (1.1 s, `--auth-ease-out`; 0 s con reducir-movimiento). Dato real: solicitudes en
   `aprobada/convenio/ministracion/seguimiento/cerrada` ÷ total, de `/admin/charts`. Con 0 solicitudes
   dice "Aún no hay solicitudes registradas", no un 0 % decorativo.
2. **Pendientes ahora** — 4 tiles del "Due now" de Mindnest, **cada uno es un `Link`**: solicitudes de
   acceso pendientes (`/admin/solicitudes-acceso`, `estado === 'pendiente'`), restablecimientos
   (`/admin/reset-requests`, `status === 'pending'`), solicitudes en revisión y ministraciones pendientes
   (de `/admin/stats`). Tono por tile, flecha que avanza al hover, "Al día" cuando vale 0.
3. **Indicadores generales** — los 7 de `/admin/stats` en tiles compactos (7 columnas en `xl`).
4. **Gráficas** (2/3, recharts intactas, re-vestidas) + columna derecha: **Actividad reciente**
   (`/admin/audit-logs?per_page=6`, inicial del usuario, acción humanizada, fecha), **Alertas**
   (`/admin/alerts`; el texto llega con `<strong>` y un título capturado por un admin → se quitan las
   etiquetas y se pinta como texto, no como HTML) y **Estado del sistema** con el widget de Reverb.

Reglas que se respetaron: cada número sale de un endpoint (nada inventado); una sola coreografía de
entrada (stagger 50 ms); hover solo con puntero fino; `IconMap` ahora incluye `Clock`.

### Usuarios (`/admin/usuarios`)

Encabezado con los tokens del sistema; tarjetas de `DataCardGrid` (heredan lo de arriba); **modal
reescrito**: `app-card` con cabecera (chip vino + título + correo del usuario que se edita), scrim
translúcido (`--auth-ink` al 40 % + blur, no negro), campos con `FField` (nombre, correo, contraseña, rol,
institución, **cargo y teléfono — estaban en el estado del formulario pero nunca se mostraban**) y un
**interruptor "Cuenta activa"** (checkbox real `role="switch"` debajo, `sr-only`). Botón principal
`.auth-submit` con estado cargando; cierre con Esc/clic fuera/botón ×.

### Carrusel (`/admin/carrusel`) — imágenes locales

A pedido del usuario: **zona de arrastrar/soltar** (o clic) en el modal del slide, con vista previa
inmediata, botón "Quitar imagen" y errores en línea. Sube por `POST /admin/carousel/upload` (detalle del
backend en `CLAUDE.md` § Carrusel) y rellena `imagen_url` con la ruta relativa `/storage/carousel/…`. La
URL externa sigue como alternativa. La previsualización del slide usa la misma composición que el banner
del login (`.auth-banner` + `.auth-glass` + `.auth-tag`), así el admin ve exactamente lo que verá el
visitante.

### Pantalla de carga (`RouteLoadingScreen`, `.route-loading-*`) — versión 2

Referencia del usuario: logo centrado, anillos concéntricos tenues, fondo transparente. Tras probarla pidió
**logo más grande, que dure ~1 s más y que también aparezca en el login.** Tres mecanismos, mismo dibujo:

- **`RouteChangeOverlay`** (`components/ui/RouteChangeOverlay.tsx`, montado una vez en `app/layout.tsx`):
  un listener global de `click` en `document`. Si el clic cae en un `<a href>` interno (no `_blank`, no
  `download`, sin modificadores, distinto de la URL actual), muestra la pantalla **1.4 s**. Cubre el menú,
  la paginación, los enlaces del pie, "Volver al login"… **sin tocar ningún archivo del menú.** Es lo que
  garantiza la duración: `loading.tsx` desaparece en cuanto Next termina, y en este sistema (rutas
  'use client' sin fetch en servidor, chunks pre-cargados) eso es casi instantáneo — por eso "casi no
  duraba".
- **`loading.tsx`** por raíz (`app/`, `(auth)/`, `admin/`, `revisor/`, `evaluador/`, `solicitante/`):
  se conserva para la **primera carga / recarga** de cualquier página, donde no hay clic que interceptar.
- **`useGlobalLoader()`** con **mínimo visible de 1 s** en el provider (`MIN_VISIBLE_MS`): si algo la enciende
  y apaga en 80 ms, igual se ve 1 s. El **login** la enciende 500 ms después de "Acceso concedido" y antes
  de `window.location.href`, así la recarga completa hacia el panel no deja la pantalla en blanco.
- Tamaño: logo `h-28` (112 px, antes 56) y contenedor de anillos de 200 px (antes 120).
- **Decisión que se mantiene — no en cada botón.** Los botones tienen spinner local; una pantalla completa
  por clic en búsquedas o filtros iría contra "interactivo y rápido" (`emil-design-eng`). Para una acción
  larga concreta, `useGlobalLoader()`.

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

## 6b. Reglas globales de la tarde del 14/09/2026 (se aplican a TODO el sistema)

Cada una vive en un solo lugar y por eso alcanza a todas las vistas sin tocarlas una por una:

| Regla del usuario | Dónde vive | Alcance |
|---|---|---|
| **Íconos sin fondo sólido, vidrio líquido sin blur** | `globals.css` → `.app-tile-icon`, `.app-nav-icon`, `.auth-icon-btn`, `.icon-glass` (gradiente + borde de luz + sombras internas; **nunca** `backdrop-filter`). El ícono toma el color con `color:`, no con `background:` | Dashboard, usuarios, carrusel, solicitar-acceso, Reverb, botones `soft`/`destructive` |
| **Cero emojis** | Reemplazados por íconos de lucide en 12 archivos (banderas del idioma → código `ES`/`EN`; `✓`/`✗`/`📄`/`💾`/`✅`/`❌`/`←`/`→` en UI). Los `→` de comentarios de código y de `i18n` no visibles quedan | Sistema completo (grep de rangos emoji en `src/` sin resultados en UI) |
| **`<select>` con el mismo dibujo** (referencia: disparador redondeado + chevron) | `globals.css` `@layer base` → `select:not([multiple])` (relleno suave, radio 14 px, chevron SVG propio, anillo de foco vino). `select.auth-input` conserva el chevron. La lista propia (`components/ui/select.tsx`) tiene disparador igual y lista redondeada con banda de hover | Los 13 `<select>` nativos y los 6 usos de `Select` de base-ui |
| **Botones de crear / ver / editar / eliminar unificados, hover "líquido"** | `components/ui/button.tsx` (radio 14 px, `.btn-liquid` = gota de luz que se expande al pasar el mouse — `globals.css`) con variantes: `default` crear, `soft` ver/editar (vidrio vino), `destructive` eliminar (vidrio rojo, nunca rojo sólido), `outline` borde de 1.5 px, `ghost` discreto | Todo `<Button>`; usuarios y carrusel ya usan `soft`/`destructive` para editar/eliminar |
| **Listas de registros** (referencia: contenedor redondeado, filas con banda de hover) | `components/ui/table.tsx` (contenedor 22 px con filo de luz y sombra, encabezado discreto en mayúsculas pequeñas, filas con separador tenue y hover) y `DataCardGrid` (tarjetas `app-card`) | Todas las tablas y las 6 vistas con tarjetas |
| **Bento suave, no saturado** (referencia "Marketer") | `.app-card`: radio 28 px, sin borde duro (filo de luz), sombra suave, veladura superior de vidrio; `data-tone="solid"` = tarjeta ciruela protagonista | Dashboard, modales, Reverb, carrusel, usuarios |
| **Sin jerga técnica a la vista** | Dashboard ("Quién hizo qué, y cuándo", "Buenas prácticas"), usuarios (sin "Soft delete"), carrusel (sin rutas `/storage/…`), Reverb ("Notificaciones al instante · Funcionando con normalidad"; host/latencia plegados en "Información para soporte") | Lo rediseñado. **Pendiente** en el resto de vistas (§7) |
| **Responsive, móvil primero** | Regla permanente. El menú (sin cambiar su diseño) en `< md` pasa a `position: fixed` con márgenes de 12 px y scroll propio; el panel de notificaciones se limita a `100vw - 1.5rem`; el pie apila. Verificado a 390 px sin scroll horizontal | Menú de los 4 roles, dashboard, auth |
| **Crear / editar por pasos** (referencia: lista de pasos a la izquierda, "PASO n DE N", pregunta guía, aviso de contexto, Cancelar / Siguiente) | `components/ui/step-frame.tsx` (`StepFrame`). Ver la sección siguiente | **Los 16 formularios de crear/editar del sistema**, sin excepción (lista abajo) |

### Formularios por pasos — `StepFrame` (noche del 14/09/2026)

Un solo componente para todo lo que crea o edita un registro. Props: `title`, `icon`, `intro` (aviso en
lenguaje llano, tarjeta dorada), `steps: { key, label, question, content, validate? }[]`, `onClose`,
`onSubmit`, `submitting`, `submitLabel`, `error` (ReactNode), `success` (reemplaza el formulario por una
palomita). Modos: **modal** (`open`; hoja inferior en móvil, ventana centrada en escritorio; se desmonta al
cerrar para arrancar siempre en el paso 1) e **`inline`** (tarjeta en el flujo de una página completa; sin
botón "×"). `hideCancel` quita "Cancelar" del primer paso en flujos que no se abandonan (bienvenida).

Reglas que sigue cada conversión:
- Cada paso responde **una pregunta** ("¿Quién es?", "¿Cuánto se aprueba?"), no lista campos. Lo
  obligatorio va primero; lo opcional, en el paso "Detalles" o al final.
- `validate` del paso devuelve el **primer** mensaje o `null`; sin pasar no se avanza. La lista de la
  izquierda solo permite volver a pasos ya vistos.
- Campos: `input`/`select`/`textarea` nativos con `auth-input auth-input-static pl-4` (el `<select>` toma
  el chevron global); etiquetas `text-xs font-bold uppercase tracking-widest` en `--app-ink-2`; casillas
  como tarjeta clicable (`rounded-[14px]`, fondo `--tile-sky-bg` / `--tile-emerald-bg` al activarse).
- Los identificadores internos (`nombre_campo`, `clave`) **ya no se piden**: se derivan del texto visible
  (`slugify`) y se muestran como dato informativo. Nada de "select", "tranche", "soft delete", "JSON".

| Formulario | Archivo | Pasos |
|---|---|---|
| Usuario (crear/editar) | `admin/usuarios/UsuariosClient.tsx` | La cuenta → Su papel |
| Empresa | `admin/empresas/EmpresasClient.tsx` | Quién es → Disponibilidad |
| Sanción (lista negra) | `admin/lista-negra/ListaNegraClient.tsx` | A quién → Desde cuándo |
| Diapositiva del carrusel | `admin/carrusel/CarruselClient.tsx` | La foto → Los textos → Cuándo se ve |
| Programa | `admin/programas/ProgramasClient.tsx` | Lo básico → El apoyo → Reglas |
| Campos / documentos / rubros / etapas / modalidades / criterios de un programa | `components/admin/NestedCRUDModal.tsx` | Lo básico → Detalles (automático: requeridos / opcionales) |
| Asignar evaluador | `admin/evaluadores/EvaluadoresClient.tsx` | La solicitud → Quién evalúa → Para cuándo |
| Editar convocatoria (página) | `admin/convocatorias/[id]/editar/page.tsx` | Nombre → Fechas → Montos y estado (`inline`) |
| Pregunta / documento / concepto de gasto / criterio del asistente de nueva convocatoria | `admin/convocatorias/nueva/page.tsx` | 2 pasos cada uno (qué es → reglas / límite / peso). El asistente exterior de 7 pasos conserva su propio marco |
| Generar convenio | `admin/solicitudes/SolicitudesClient.tsx` | El monto → Las entregas → Notas |
| Revisar informe final (revisor) | `revisor/informes/InformesClient.tsx` | Lo entregado (solo lectura) → Tu decisión |
| Bienvenida del solicitante | `solicitante/onboarding/page.tsx` | Tu institución → Cómo contactarte (`inline`, `hideCancel`) |
| Cambiar contraseña | `solicitante/settings/page.tsx` | Tu clave de hoy → La nueva (`inline`; se reinicia con `key` tras el éxito) |
| **Nueva solicitud** (página) | `solicitante/solicitudes/nueva/page.tsx` | La convocatoria → Tu proyecto → [Modalidad] → [Datos del programa] → [Presupuesto] → [Equipo] → [Documentos] → Revisar y guardar. Los pasos entre corchetes aparecen solo si el programa los pide (`useProgramaCatalog`). `Select` de base-ui sustituido por `<select>` nativo (probable en jsdom y con el mismo dibujo) |
| Datos bancarios del beneficiario | `solicitante/solicitudes/[id]/page.tsx` | La cuenta (CLABE de 18 dígitos validada) → El titular |

Fuera del patrón, a propósito: acciones de una sola decisión con `ConfirmDialog` (rechazar, cancelar,
cerrar, levantar veto) y la rúbrica del evaluador (`evaluador/asignaciones/[id]/rubrica`), que es una
calificación criterio por criterio, no un alta de registro.

### Pantalla de carga v3 — "en cualquier recarga y al pulsar botones"

- **Recarga de cualquier página:** `app/layout.tsx` imprime `#boot-splash` (mismo dibujo, con `<img>` plano)
  **en el HTML del servidor**, así se ve antes de que cargue el JS. `RouteChangeOverlay` lo **oculta** cuando
  la app montó y pasaron ≥ 1.1 s desde el inicio de la navegación (`performance.now()`), con un fundido de
  200 ms. **Nunca `remove()`**: es un nodo hidratado por React y quitarlo rompía Safari (E29, 15/09/2026).
- **Botones:** `lib/api.ts` avisa por `lib/loading-bus.ts` en toda petición que **escribe** (POST/PUT/PATCH/
  DELETE) o **descarga** (`responseType: 'blob'`); `RouteChangeOverlay` la muestra mientras dura, con mínimo
  de 1 s. Los GET normales no (búsquedas y filtros seguirían "lentos" a propósito). Excepciones: refresh
  silencioso del JWT, logout, marcar notificaciones como leídas.
- **Enlaces:** listener global de clic, 1.4 s. **No** filtrar por `e.defaultPrevented`: el `<Link>` de
  Next.js siempre lo hace y por eso la primera versión nunca aparecía.
- **Login:** "Acceso concedido" → 450 ms → pantalla → 350 ms → recarga hacia el panel.
- Logo `h-36` (144 px), anillos de 260 px.

---

## 7. Pendiente (no cubierto en esta pasada)

- **Vistas: cubiertas todas** (15/09/2026). Las 4 áreas (admin, revisor, evaluador, solicitante) y las
  páginas legales usan las mismas primitivas: `components/ui/page-header.tsx` (`PageHeader`: título,
  descripción llana, ícono, `eyebrow`, `actions`, `backHref`), `components/ui/stat-tile.tsx` (`StatTile`,
  tonos `vino/gold/sky/emerald`, `solid`, `href`, `loading`) y `components/ui/card.tsx`, cuya base ahora es
  `.app-card` (radio 22 px, cabecera con regla) — por eso **ninguna vista debe añadir `border-0 shadow-*
  bg-neutral-50` a una `Card`**. Estados siempre con `estadoLabel()`/`estadoBadgeClass()`; informes,
  ministraciones y asignaciones con sus mapas de etiquetas locales. Fuera del alcance, a propósito: el
  scorecard de la rúbrica del evaluador (lógica de calificación).
- **15/09/2026, tarde:** también el paso 1-2 del asistente de nueva convocatoria (campos nativos del
  sistema, casillas como tarjeta, `Clave corta` propuesta desde el nombre con `claveDesdeNombre` hasta que
  la persona la edita) y el `NestedCRUDModal` de la ficha de programa (ya no pide `nombre_campo`/`clave`:
  `programas/[id]/page.tsx` los deriva con `slugify` al guardar si el registro no los tiene; la lista de
  "Tipo de respuesta" es un `<select>` nativo para que muestre la etiqueta y no el valor interno).
- **Notificaciones en tiempo real (15/09/2026):** ya existían el evento `NotificacionCreada` (canal privado
  `user.{id}`, Reverb) y la escucha en `hooks/useNotifications.ts`; lo que faltaba era que se *viera*. Ahora
  el hook pinta la notificación al instante (`incoming`), sube el contador y los 4 `app/*/layout.tsx`
  muestran `components/notifications/NotificationToast.tsx` (tarjeta bento abajo a la derecha, 8 s, "Ver
  ahora" lleva a la solicitud o al historial). Medido en producción: **0.8 s** entre `create()` en Laravel
  y el aviso en pantalla (cola `database` + Reverb detrás de IIS, `SERVER-STATUS=101`).
- **Jerga restante**: `obs.campo`/`obs.tipo` (observaciones del revisor) y `etapa_actual` vienen de la API sin
  catálogo en el front; se muestran con un mapa local y un fallback (guion bajo → espacio).
- El menú, la barra superior y el pie del panel **no entran** en el rediseño (E26).
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

---

## 10. Rediseño vivo y multicolor de los paneles (21/09/2026)

**Cambio de dirección del usuario** (deroga dos reglas previas, solo para el **contenido interno** de
los 4 paneles — el login/auth NO se toca, ya estaba hecho):

1. **Vivo y multicolor** (referencia Duolingo). El vino sigue como color principal y de detalle, pero el
   resto se vuelve colorido y saturado: cada módulo/estado con su color vivo. Se **deroga** "fondos poco
   saturados" para los paneles.
2. **Se adoptan las píldoras** (`rounded-full`) tipo sticker con borde grueso en badges/chips de estado.
   Se **deroga** "nada de píldoras".

Se mantiene: menú/topbar/pie fuera del rediseño (E26); `prefers-reduced-motion`; solo se anima
`transform`/`opacity`; responsive móvil primero; sin emojis.

### Unificación por capa compartida (cambiar una vez → alcanza a los 4 roles)

Todo vive como **clases y tokens reutilizables**, no repartido por archivo:

| Pieza | Archivo | Qué hace |
|---|---|---|
| Sistema de tono | `globals.css` (bloque "panel-content-system") | Tokens `--h-*`/`--c-*` por tono y L por rol (claro/oscuro). Cualquier elemento con `data-tone="X"` expone `--th`/`--tc`; los átomos derivan color |
| `.pill` | `globals.css` | Píldora sticker: `rounded-full`, borde vivo, fondo suave, texto en tinta del tono (≥ 4.5:1). Punto guía opt-in con `data-dot="on"`; `data-solid="true"` la hace de fondo pleno |
| `.tone-chip` / `.tone-dot` | `globals.css` | Chip de ícono (vidrio líquido sin blur, color del tono) y punto de leyenda |
| `.tone-card` | `globals.css` | Tarjeta de módulo con fondo suave del tono + filo de luz; hover eleva y hace "pop" del ícono |
| `.stat-tile` | `globals.css` + `stat-tile.tsx` | Tile de indicador; el color lo pone `data-tone` (12 tonos), `data-solid` para el protagonista |
| `.btn-sticker` | `globals.css` + `button.tsx` | Canto 3D que se hunde al pulsar; en variantes `default` (vino) y `secondary` (dorado) |
| `.empty-state` / `.accent-rule` | `globals.css` | Estado vacío ilustrado y franja de acento coloreada |

Tonos disponibles (`data-tone`): `vino gold amber orange emerald teal sky blue violet rose red neutral`.
Mapean 1:1 a los estados (ver `solicitud-estados.ts`).

### Primitivas actualizadas (propagan a todas las vistas)

- **`Badge`** (`components/ui/badge.tsx`): ahora es píldora sticker (`rounded-full`, borde 1.5px, negrita).
  Variantes con tono. Lo usan 26 vistas → todas pasan a píldora sin tocarlas.
- **`estadoBadgeClass()`** (`lib/solicitud-estados.ts`): devuelve una píldora viva autónoma por estado
  (forma + color). Como es `className` y `cn` usa twMerge, cualquier `<span>`/`<Badge>` que lo reciba se
  vuelve píldora.
- **`StatTile`**: paleta ampliada a 12 tonos; estilos por clase (`.stat-tile.tone-card` + `.tone-chip`),
  ya no estilos inline. **Nota de migración:** dejó de exportar `TILE_TONE_VARS` (se refactorizó su único
  uso, `NotificacionesClient`, a `<span className="pill" data-tone={...}>`).
- **`Button`**: `default` y `secondary` llevan `.btn-sticker`.
- **Dashboards de los 4 roles**: tiles con `data-tone` multicolor (admin: 7 indicadores en 7 colores;
  "Pendientes ahora" con `tone-card`). Badges inline del evaluador → `.pill`.

### Verificación y despliegue (21/09/2026)

`npx tsc --noEmit -p .`, `npx eslint` sobre los archivos tocados y `npx vitest run` (28 suites, 97 tests):
**0 errores**. **Publicado en producción** con `deploy-web.ps1 -Motivo rediseno-paneles` (build 11:59:44,
sin errores) y una segunda vez con `-Motivo fix-uploads` (11:59:44→11:59:54) para incluir el fix de E32.
Verificado tras cada publicación: servicio `comecyt-web` `Running`, `https://sidecyt-comecyt.edomex.gob.mx/login`
y `https://10.250.36.241/login` → 200, `/admin/dashboard` sin sesión → 307 (redirige a login, correcto).

**Justo después de publicar**, al usar el sistema en producción aparecieron tres bugs de backend — **no
causados por este rediseño** (son de lógica PHP/axios, ajenos a la capa visual), pero encontrados en la
misma sesión al probar el resultado: E30, E31 y E32 en `CLAUDE.md`. El más grave (E31): el modelo
`Solicitud` tenía un `$guarded` que bloqueaba en silencio las 14 transiciones de estado del sistema —
corregido antes de que entrara la primera solicitud real. Ninguno requirió tocar el trabajo de diseño de
este documento.

### Barrido vista por vista — COMPLETO (21/09/2026)

Se recorrieron las vistas de los 4 roles y se homogeneizaron:
- **Chips de estado inline** (`inline-flex rounded-md px-2 … ${estadoBadgeClass}` o mapas locales
  `bg-*-50 text-*-700`) → píldora: `<span className={estadoBadgeClass(x)}>` o `<span className="pill"
  data-tone="X">`. Los mapas locales de tono `{bg,fg}` se migraron a nombre de tono
  (`admin/informes`, `admin/convenios`, `admin/ministraciones`, `evaluador/asignaciones`,
  `evaluador/historico`, `revisor/informes`, `solicitante/informes`, `solicitante/ministraciones`,
  `solicitante/solicitudes/[id]`, `admin/reset-requests`, `admin/solicitudes-acceso`).
- **Estados vacíos** `text-center py-14/16` → `.empty-state` con `.tone-chip` coloreado (por color:
  emerald "al día", sky "sin resultados", violet "aún no hay registros", teal pagos, etc.).
- **Chips de rol / sección** con `--tile-*` inline → `.pill` con `data-tone`.

Grep final: **0** ocurrencias de `text-center py-14/16` y **0** chips de estado con el patrón viejo en
`src/app`. Verificado: `tsc --noEmit` 0 errores; `eslint` 0 errores (solo warnings preexistentes de
`no-explicit-any`/`exhaustive-deps`, ajenos a estos cambios).

Fuera del barrido a propósito: el scorecard de la rúbrica del evaluador (lógica de calificación), el
asistente exterior de 7 pasos de nueva convocatoria (solo se homogeneizó su `EmptyList`), y los paneles
informativos con fondo de tono (`--tile-*-bg`) que ya eran coloridos y correctos.

Parte del barrido se hizo con subagentes `fork` en paralelo: 2 completaron sus lotes de admin; 2 se
confundieron por heredar el contexto del orquestador y no editaron — esos archivos se hicieron a mano.
**Aprendizaje:** para barridos mecánicos multi-archivo, los `fork` pueden creerse el orquestador; conviene
subagentes frescos (no-fork) o hacerlo directo.

---

## 11. Landing pública `/sigae` (23/09/2026)

Página de presentación **antes del login** en https://sidecyt-comecyt.edomex.gob.mx/sigae; `/` sin sesión
redirige ahí. Documento completo (rutas, archivos, tokens, movimiento, estados, cómo editar):
**[`LANDING_SIGAE.md`](LANDING_SIGAE.md)**.

- **Sistema visual propio y aislado**, a pedido del usuario: ADN de https://portrait.so (el usuario entregó
  su `design.md`) — lienzo blanco, tinta navy `#08304c`, un arcoíris de firma en tres lugares (CTA, una
  palabra del titular, cuadro de marca), lavados pastel, nav flotante en píldora, collage de polaroids.
  Tokens en `.lp-root` dentro de `apps/web/src/app/sigae/landing.css`, **nunca en `:root`**: no toca
  `--auth-*`, `--app-*` ni `--tile-*`. Login, paneles y menú no cambian.
- **Fuentes:** Switzer (texto) y Satoshi (titulares, sustituto libre de Basier Circle), auto-hospedadas con
  `next/font/local`. El servidor no alcanza Google Fonts; Fontshare sí.
- **Skills aplicadas:** hallmark (ADN estudiado, contenido honesto, sin titulares en cursiva, 320–1440 px
  sin scroll horizontal), frontend-design (un solo momento orquestado, numeración solo donde hay
  secuencia), emil-design-eng (curvas propias, `scale(0.97)`, hover tras `(hover: hover)`, solo
  transform/opacity, `prefers-reduced-motion`), ui-ux-pro-max (contraste AA — por eso el texto de ayuda
  usa `#585858` y no el `#797979` de la referencia —, objetivos táctiles de 44 px, `aria-*` del formulario).
- Se respeta la regla vigente de pantalla de carga: la entrada animada de la landing espera a que se retire
  el `#boot-splash`.
- **Tarde del 23/09:** nombre **SIGAE**; contenido de Apoyo Empresarial; **vino institucional como acento
  de detalle** (barras bajo títulos, números, fechas de cierre, filos de tarjeta; nunca fondos grandes);
  logo ×3 con `public/logo-recortado.png`; convocatorias abiertas en vivo; botón "Ir al sitio" en el login
  (único cambio al login: una píldora con los tokens `--auth-*`).
- **Hecho el mismo día:** este lenguaje visual se llevó a **todos los paneles** (excepto el login) — §12.

---

## 12. Paneles unificados con la landing — sistema SIGAE (23/09/2026)

**Pedido del usuario:** implementar el diseño, la interfaz y los colores de la landing en todos los paneles
(admin, solicitante, revisor, evaluador) para unificar el sistema; **el login queda igual**. Esto **sustituye**
la dirección "vivo y multicolor / Duolingo" del 21/09 (§10) como lenguaje visible: las clases de §10
(`.pill`, `.tone-*`, `.stat-tile`, `data-tone`…) siguen existiendo y funcionando, pero ahora se pintan con
el sistema SIGAE.

### Cómo está hecho (una capa, sin editar las 136 vistas)

| Pieza | Dónde | Qué hace |
|---|---|---|
| `src/styles/panel-sigae.css` | importado en `app/layout.tsx` | Toda la capa. **Sin `@layer`** a propósito: gana sobre `globals.css` y las utilidades de Tailwind, así corrige radios/sombras que las vistas traen como utilidades |
| `.panel-root` | raíz de `AdminTopLayout` y `RoleTopLayout` | Alcance del sistema en el primer render |
| `html.sg-panel` | `hooks/usePanelScope.ts` (en ambos layouts y en el onboarding del solicitante) | Alcance para **portales** (diálogos, selects, menús), que se renderizan fuera de `.panel-root`. Se quita al salir del panel |
| Tokens redefinidos | dentro del alcance | shadcn (`--primary`…), `--app-*`, `--tile-*`, los `--auth-*` que consumen los paneles, `--tone-*-L` y la **escala `neutral` de Tailwind v4** (`--color-neutral-*`, tintada hacia navy) |
| `lib/fonts.ts` | `<html>` del layout raíz | Switzer + Satoshi para landing y paneles (solo variables: el login sigue en Geist) |
| `button.tsx` | `data-variant` + variante `rainbow` | El CSS distingue variantes sin afectar las pantallas de acceso |
| `page-header.tsx` | clase `page-title` | Barra vino corta bajo el título de cada página |

**Por qué así:** las pantallas de acceso (login, solicitar acceso, recuperar clave) usan los mismos `<Button>`
y `<Card>`; cambiar los componentes las habría alterado. Con la capa acotada, el login sale idéntico
(verificado: sin `sg-panel` y con Geist).

### Lenguaje visual resultante

- **Color:** lienzo blanco; **tinta navy `#08304c`** como color principal y de acción (`--primary`);
  lavados pastel para tonos (cielo/menta/durazno); **vino solo como detalle** (`--auth-vino` intacto: ícono
  del encabezado, etiquetas, barra bajo títulos, filo bajo la barra superior, botón secundario en lavado).
- **Tipografía:** Switzer en texto, Satoshi 600 con tracking negativo en `h1`, `h2` y cifras de indicadores.
- **Botones:** píldora. Principal = navy sólido (sin el canto 3D "sticker"); secundario = lavado vino;
  contorno = blanco con filo; ver/editar (`soft`) = lavado cielo (antes vidrio vino: demasiado vino repetido
  en tablas); eliminar = lavado rojo; **`variant="rainbow"`** = contorno arcoíris para el CTA principal de
  una vista (aplicado en "Nueva solicitud" ×2 y "Nueva convocatoria").
- **Tarjetas:** 24 px, sin borde, sombra de capas de la landing; al pasar el cursor suben 4 px. Tarjeta
  protagonista (`data-tone="solid"`) en navy.
- **Íconos:** planos en pastel, sin vidrio; sobre tarjetas de color, chip blanco translúcido.
- **Píldoras de estado:** sin borde grueso.
- **Campos:** 16 px, relleno gris frío `#f3f6fa` con filo, foco navy + halo cielo.
- **Tablas:** contenedor de 24 px con sombra, encabezado `#f6f8fb`, fila con hover cielo.
- **Barra superior:** **misma estructura y comportamiento (E26)**; cambia la piel (blanco, sombra de capas,
  filo vino), el logo recortado (40 px; 30/24 px en teléfono) y la marca "SIGAE · Gestión de Apoyos
  Científicos" con el cuadro arcoíris.
- **Modo oscuro:** conservado, en navy profundo con las mismas relaciones.

### Verificación (producción, 23/09/2026)

Capturas antes/después con sesión de los 4 roles (tokens temporales emitidos en el servidor e invalidados al
terminar): admin (dashboard, convocatorias, usuarios, solicitudes), solicitante (panel, solicitudes), revisor
(panel, bandeja), evaluador (panel); menú desplegable; modo oscuro. **Sin errores de consola, sin scroll
horizontal a 1440 y 375 px.** 102/102 pruebas del front. Defectos encontrados y corregidos antes de cerrar:
contorno arcoíris anulado por el `::before` de `.btn-liquid`; ícono blanco sobre blanco en tarjetas sólidas;
chip que se fundía con la tarjeta pastel; campos invisibles (relleno blanco sobre lienzo blanco); desborde de
14 px en móvil por el logo; escala `neutral` invertida en oscuro (texto oscuro sobre oscuro).

### 24/09/2026 — sin arcoíris

A pedido del usuario, el arcoíris de firma se sustituyó por **vino no saturado** en landing y paneles:
`--gradient-vino` (landing) y `--sg-rainbow` (paneles; se conservó el nombre de la variable) =
`linear-gradient(120deg, oklch(40% .085 358), oklch(52% .08 4) 55%, oklch(64% .065 12))`. El CTA
(`variant="rainbow"` / `.lp-btn-rainbow`) tiene contorno vino de 1.5 px y al pasar el cursor se rellena de lavado
vino con `clip-path` (sin tocar el layout) y sube 1 px. Nuevos componentes de admin con este lenguaje:
`BannerManager` (vista previa 3:1, pestañas archivo/enlace, quitar con confirmación) y `ProrrogaDialog`.

---

## 13. Paneles v3 — rediseño estructural con la landing + referencia Aboard (24/09/2026)

**Pedido del usuario:** rediseñar todos los paneles (menos el login) tomando el dashboard de admin como base,
con estructura, interfaz, efectos, colores y elementos lo más parecidos a la landing, más la referencia
**aboardhr.com** (su `design.md`: "cuaderno pastel sobre escritorio blanco"). Color sin saturar, salpicaduras
de color tenues y vino solo de detalle. Esta vez **sí se cambió la estructura**, no solo la piel.

| Cambio | Dónde |
|---|---|
| **Barra flotante en píldora** (como la de la landing): despegada 12 px del borde, radio completo, sombra flotante única; menú, búsqueda, avisos y sesión con la misma lógica. Las **migas salieron de la barra** al inicio del contenido | `AdminTopLayout.tsx`, `RoleTopLayout.tsx` (+ `.panel-topbar`, `.panel-crumbs`) |
| **Lienzo papel `#fafafa`** con tres **salpicaduras** difuminadas de croma baja (vino, cielo, menta) al fondo | `.panel-splash` |
| Contenido a **1280 px** y pie tipo landing (filo vino centrado) | `.panel-main`, `.panel-footer` |
| **`PageHeader` = héroe**: píldora de aviso (lavado cielo, punto vino), título Satoshi grande con tracking cerrado y barra vino, descripción gris, acciones en píldora. Las 4 vistas con encabezado propio se pasaron a `PageHeader` (usuarios, carrusel, editar convocatoria, nueva solicitud) | `page-header.tsx` (API igual, 37 vistas) |
| **`PastelFrame`** (nuevo): marco pastel de radio 32 que enmarca paneles blancos, en lugar de sombras (la "tarjeta de producto" de Aboard). Tonos `blush`, `lavender`, `mint`, `powder`, `butter`, `vino` rebajados ~50 % hacia blanco | `pastel-frame.tsx`, `--pastel-*` |
| **`StatTile` v3**: tarjeta blanca de producto, chip pastel, cifra Satoshi de 40 px, flecha que avanza y filo del tono que se extiende al pasar el cursor; protagonista en navy | `stat-tile.tsx` (API igual) |
| **Dashboard de admin reestructurado**: héroe sobre el lienzo (saludo, contexto, acciones) + anillo a la derecha → "Pendientes ahora" en marco lavanda → indicadores como **columnas de valor sin marco** → gráficas en marco celeste con paneles blancos → actividad y alertas en tarjetas blancas | `admin/dashboard/page.tsx` |
| **Dashboards de solicitante, revisor y evaluador**: indicadores dentro de un marco pastel por rol (rosa, menta, mantequilla) y más aire entre secciones | sus `dashboard/page.tsx` |
| Gráficas con colores de luminosidad alta y croma baja (antes verdes/naranjas saturados); barras en vino, líneas vino + navy | dashboards |

**Interacción:** todo lo clicable responde (tarjetas suben 3–4 px con sombra flotante, flechas avanzan,
filos del tono se extienden, filas con fondo al pasar el cursor, píldoras con `scale(0.97)` al presionar,
foco navy visible). Todo respeta `prefers-reduced-motion`.

**Trampas encontradas al hacerlo (no repetir):**
1. `backdrop-filter` en la barra crea un bloque contenedor: el menú móvil (`position: fixed`) y la capa que lo
   cierra al tocar fuera quedaban atrapados dentro de la barra → se quitó; la barra usa blanco al 97 %.
2. `align-self: start` en un marco dentro de una **columna flexible** lo encoge al ancho de su contenido → la
   regla aplica solo a `.grid > .pastel-frame`.
3. La barra flotante es 24 px más angosta: en teléfono se reducen márgenes y botones de ícono para caber a 375 px.
4. Un `npm run build` falló por una importación quitada de más; **`deploy-web.ps1` restauró solo la versión
   anterior** (producción no cayó). Correr `npx tsc --noEmit` antes de desplegar.

**Verificación:** 4 roles con sesión (tokens temporales invalidados al terminar), escritorio 1440 y teléfono
375 px **sin desborde**, menú desplegable, modo oscuro y login intacto (sin `sg-panel`, fuente Geist). Front
103/103 pruebas, ESLint sin errores, sin errores de consola.

### Reglas para lo que venga

- Encabezado de toda vista nueva: `PageHeader`. Agrupaciones de indicadores o paneles: `PastelFrame` con
  paneles blancos dentro (`.pf-panel`), rotando tonos entre secciones; nunca dos marcos del mismo tono seguidos.
- Nuevo color o componente del panel → token o regla en `panel-sigae.css`, acotado con
  `:is(.panel-root, html.sg-panel)`. **Nunca** en `:root` ni en `globals.css` (alcanzaría al login).
- Un solo `variant="rainbow"` por vista (hoy es vino; el nombre de la variante se mantiene).
- Vino solo en detalles; si una vista pide un bloque grande de color, usar navy o un lavado pastel.

## 14. Contenido interno de las vistas, menú y pie (E43, 24/09/2026)

Pedido del usuario: "rediseña el contenido interno de las demás vistas igual y el menú, todo menos el login y la
landing", más "mejora el diseño del footer de todos los paneles y haz 5 veces más grande el logo del footer" y
quitar del dashboard del admin el bloque "Notificaciones al instante / Información para soporte / Buenas
prácticas". Todo en `panel-sigae.css`, bloque "E43", acotado a `:is(.panel-root, html.sg-panel)`.

### Qué cambió

| Pieza | Antes | Ahora |
|---|---|---|
| **Menú desplegable** (`.panel-menu*`) | Mega-dropdown con cabecera vino | Tarjeta blanca flotante (radio 28): cabecera con píldora del rol, título en Satoshi; **cada grupo es un bloque pastel** (lavanda, cielo, menta, mantequilla); opciones con chip de ícono, nombre y descripción; al pasar el cursor se vuelven panel blanco, se desplazan 2 px y aparece la flecha; **la página actual** va en blanco con filo vino e ícono vino; "Cerrar sesión" en píldora vino suave. Máx. alto de pantalla con scroll en escritorio. La lógica (grupos, móvil, cierre) no cambió |
| **Botón "Menú"** | Sin nombre accesible en móvil (texto oculto) y vino sólido abierto | `aria-label`, `aria-expanded`, `aria-haspopup`; abierto en tinta navy |
| **Tono de sección** | — | `<main data-section-tone>`: en admin, el pastel del grupo del menú al que pertenece la página; en los otros roles, el de su dashboard (solicitante blush, revisor menta, evaluador mantequilla). Menú y vista "casan" |
| **Tarjeta principal de las listas** | Tarjeta blanca | **Marco pastel** del tono de sección (radio 32, sin sombra), título grande en Satoshi con el ícono en chip blanco; su contenido (rejilla, tabla, estado vacío) queda en paneles blancos. Se aplica con `:has()` a la `Card` de primer nivel que contiene `.data-grid`, una tabla o `.empty-state`: **~30 vistas sin tocar su JSX**; tarjetas anidadas y de detalle no cambian |
| **Tarjetas de datos** (`DataCardGrid` → `.data-card`) | Brillo de color al hover | Panel blanco radio 20; al pasar el cursor, sombra flotante y el filo de color crece a lo alto |
| **Tarjetas de detalle** | Título en Switzer | Título en Satoshi, filo de cabecera suave |
| **Buscador de listas** | Campo gris, placeholder invisible | Píldora blanca de 48 px con sombra suave; placeholder visible |
| **Filtros guardados** (`.saved-filters`) | Mayúsculas espaciadas | Texto normal, chips blancos |
| **Tablas** | Cabecera gris | Cabecera transparente, texto 12 px sin mayúsculas |
| **Paginación** (`.pager`) | Cuadros con borde, página actual vino | Botones redondos blancos, página actual en tinta navy (`aria-current="page"`) |
| **Pestañas del programa** (`.seg-tabs`) | Subrayado | Control segmentado en píldora; activa en lavado vino |
| **StepFrame** | Pasos sobre blanco, "Siguiente" vino sólido | Lista de pasos sobre papel, paso actual en panel blanco con número vino, pregunta en Satoshi 22 px, aviso en mantequilla, botones en píldora y "Siguiente" en tinta navy |
| **Pie** (`PanelFooter.tsx`, nuevo, común a los 4 paneles) | Logo 28 px + dos líneas de texto | Tarjeta blanca (radio 32) con salpicadura vino tenue: **logo recortado a 76 px** (≈5× el visible anterior: `logo.png` a 28 px tiene ~46 % de margen), "SIGAE" + barra vino, nombre completo del sistema e institución; enlaces en píldora (Sitio público, Aviso de privacidad, Términos, correo de proyectos). Línea legal debajo. En oscuro el logo lleva placa clara |
| **Dashboard admin** | Estado de Reverb + "Buenas prácticas" | Quitados (el widget `ReverbStatusWidget` sigue en el código, solo no se monta) |

### Ganchos de clase agregados (sin tocar lógica)
`step-frame`, `step-frame-head/foot/title`, `step-intro`, `step-list`, `step-item`, `step-num`, `step-count`,
`step-question`, `step-back` (StepFrame) · `pager`, `pager-btn` (paginación) · `data-grid`, `data-card`
(DataCardGrid) · `saved-filters` · `seg-tabs` (pestañas de programa).

### Verificación (producción)
tsc 0 errores, vitest 103/103. Capturas con sesión (tokens temporales, invalidados) en 11 vistas de los 4 roles,
menú abierto por rol, programa con pestañas, StepFrame, 375 px (lista y menú), modo oscuro y login: **sin scroll
horizontal, sin errores de consola, login sin `sg-panel`**.

### Reglas
- Una lista nueva hereda el marco pastel si su `Card` principal contiene `DataCardGrid`, `Table` o `.empty-state`
  como hijo directo de `CardContent`. No hace falta envolverla en `PastelFrame`.
- Una página nueva de admin toma el tono del grupo del menú donde se registre en `NAV_GROUPS`.

## 15. Perfil, ficha, buzón, folios y confeti (E45, 24/09/2026)

Referencia del usuario: dos capturas de un perfil con portada ancha y foto circular superpuesta. Todo en
`panel-sigae.css`, bloque "E45" (`perfil-*`, `seguimiento*`, `buzon-*`), y `landing.css` para la sección pública.

| Pieza | Diseño |
|---|---|
| **`PerfilHero`** (Mi cuenta y fichas) | Portada 1600×480 con degradado hacia blanco abajo; foto circular 128 px con aro blanco que monta sobre la portada; nombre en Satoshi grande; píldoras de rol, institución y "Cuenta activa"; contadores (solicitudes, aprobadas, en proceso) separados por filetes. En Mi cuenta: "Cambiar portada" y papelera en píldoras sobre la portada, botón de cámara vino sobre la foto. Sin foto → iniciales en pastel; sin portada → lavado tenue |
| **`UserAvatar` / `UserChip`** | La foto es el identificador en todo el sistema: barra superior (con etiqueta del rol), tarjetas de solicitudes, folios, listas de revisor/evaluador, actividad del dashboard, chat y seguimiento. Iniciales solo de palabras que empiezan con letra |
| **Seguimiento** | Línea de tiempo vertical: foto de quien hizo el cambio + "X registró el folio como **Estado**", fecha; el paso actual en panel cielo; el motivo (si hay) debajo |
| **Buzón** | Dos columnas (lista de hilos 360 px + chat); mensajes propios en burbuja tinta navy a la derecha, ajenos en blanco a la izquierda, foto junto a cada burbuja, "Leído"; categoría en píldora (duda cielo, problema rojo, sugerencia violeta). En teléfono se apilan y la barra de pestañas se parte en dos líneas |
| **Folios (admin)** | Control segmentado con conteos (Aprobados / No aprobados / En proceso / Todos), filtros por convocatoria y periodo, tarjetas con foto del solicitante y píldora "En la página pública"; panel de publicación con lista revisable y casilla de confirmación antes del botón |
| **Límites de archivos** | Una tarjeta por documento: tipos como casillas en píldora, deslizador de tamaño (1–20 MB) con el valor en vivo |
| **Asistente de convocatorias — borrador (E47)** | Bajo "Paso n de 7" una línea viva (`aria-live`): "Guardando borrador…" con spinner, "Borrador guardado a las hh:mm" con nube, o en rojo "No se pudo guardar el borrador; se reintentará". Pie del asistente: "Anterior" + "Guardar borrador y salir" (variante `soft`) a la izquierda, "Siguiente"/"Crear convocatoria" a la derecha. Errores del servidor en paso 7: caja roja con lista de líneas "Elemento n «nombre» — campo: mensaje" y la nota "No se guardó nada a medias". Contador `n / 255` bajo el nombre del criterio |
| **Borradores sin terminar (E47)** | Tarjeta blanca (radio 28) arriba de la lista de convocatorias, solo si hay borradores: nombre (o "Convocatoria sin nombre"), "Ibas en el paso n de 7 (Paso) · guardado fecha", botón "Continuar →" y papelera con confirmación. Solo el admin general |
| **Landing — Folios aprobados (E45)** | Sección centrada con título + ícono de fiesta, tarjeta blanca por convocatoria con los folios en píldoras vino tenue (mono). **Confeti en `<canvas>`** (vino, navy, pastel) desde dos focos cada vez que la sección entra en pantalla, también al regresar; no se dispara con `prefers-reduced-motion`; `pointer-events: none` |

## 16. Portal de sistemas (`/`) y SICEI (`/sicei`) — E48, 25/09/2026

Pedido del usuario: al abrir `https://sidecyt-comecyt.edomex.gob.mx` una página con el logo y los datos del COMECYT, dos
botones (SIGAE → `/sigae`, SICEI → `/sicei`), "lo más interactiva posible" y con **vino en detalles, no saturado**.
Código: `components/portal/Portal.tsx`, estilos `components/portal/portal.css` (prefijo `.pt-*`, tokens dentro de `.pt-root`).

| Pieza | Diseño |
|---|---|
| **Paleta** | Papel `#fafafa`, tinta navy `#08304c`; pastel por sistema (cielo SIGAE, menta SICEI). Vino `oklch(36% 0.1 358)` solo en subrayado del titular, viñetas, punto "Próximamente", foco, íconos de accesos y filete de títulos del pie |
| **Tipografía** | Satoshi (display) + Switzer (texto), las mismas auto-hospedadas de la landing |
| **Estructura** | Barra flotante en píldora (logo + "Portal de sistemas" + enlace a comecyt.edomex.gob.mx) → titular pregunta "¿A qué sistema quieres entrar?" con subrayado vino dibujado → dos tarjetas "puerta" (sigla enorme, nombre, para quién, 3 puntos, estado, botón) → "¿Cuál es para mí?" → accesos rápidos (convocatorias abiertas, iniciar sesión, solicitar acceso) → pie en 4 columnas (marca y descripción, sistemas, contacto, enlaces) |
| **Interacción** | Fondo con retícula de puntos y dos halos que derivan + halo que sigue al puntero (transform); en cada tarjeta, luz radial que sigue al cursor y leve inclinación 3D con resorte (solo puntero fino); botón con relleno vino suave que barre al pasar el cursor y flecha que avanza; `:active` a 0.97; el selector destaca la tarjeta recomendada (contorno vino) y atenúa la otra, con explicación en `aria-live` |
| **Movimiento** | Una sola entrada escalonada al retirarse la pantalla de carga (1.1 s). `prefers-reduced-motion`: sin animaciones ni halo del puntero, todo visible |
| **Honestidad** | Sin cifras inventadas; SICEI marcado "Próximamente" y `/sicei` explica que está en preparación (con salida a SIGAE para empresas) |
| **Responsive** | Tarjetas apiladas bajo 880 px, botones a ancho completo bajo 480 px, pie 1→2→4 columnas; verificado sin scroll horizontal en 320/375/768/1440 |

**Regla:** en `.pt-root` el reinicio de enlaces va con `:where(a)`; un selector `.pt-root a` le gana a cualquier clase de
botón y deja el texto del color heredado (pasó: botón navy sin texto visible).

## 17. Barra superior y menú en móvil/tablet — E48

- **Menú:** se desplaza en todas las anchuras (antes solo ≥ 768 px), página de atrás fija mientras está abierto
  (`useBloqueoScroll`, clase `html.sg-scroll-bloqueado`).
- **Avisos y búsqueda en teléfono:** panel a ancho completo bajo la barra (`left/right: 12px`, `top: 5.5rem`).
- **Barra 640–1023 px:** solo logo (sin "SIGAE / Gestión de…"), "Menú" sin la etiqueta de sección y avatar sin nombre:
  todo cabe en 768 px (antes se salía hasta 170 px por la derecha en todos los roles).
- **`.seg-tabs` bajo 640 px:** dos líneas en vez de salirse de la pantalla.

## 18. SIDECyT y contenido administrable — E49, 25/09/2026

- **Portal:** barra con logo + palabra **SIDECyT** (y "Portal de sistemas" debajo; en teléfono solo SIDECyT), etiqueta
  del héroe "SIDECyT · Sistema Digital de Emprendimiento, Ciencia y Talento Mexiquense", pie con la misma línea en vino.
  La tarjeta de SIGAE suma un bloque papel "N programas vigentes" con los primeros 4 en píldoras blancas y "y N más"
  (vino) que lleva a `/sigae#programas`. SICEI: becas COMECYT e impulso a la investigación.
- **`/sicei`:** dos accesos (Becas a estudiantes · Impulso a la investigación) al sitio oficial, en tarjetas papel; la
  lista de programas aparece solo con programas activos.
- **Landing SIGAE:** tarjetas de programa iguales a las anteriores, alimentadas por la API; esqueleto con brillo mientras
  cargan (sin animación con movimiento reducido); correo/teléfono/enlace solo si existen.
- **Panel `/admin/sitio`:** mismo patrón que Periodos (formulario a la izquierda, lista en marco pastel a la derecha);
  cada programa con chip de ícono de su color, píldora "oculto", flechas para ordenar, ojo para mostrar/ocultar, editar y
  eliminar. Sectores y notas en área de texto "uno por línea" con contador; documentos como filas título + detalle.

## 19. Identidad institucional 2026, encuadre del carrusel, login sin scroll y portal interactivo — E50, 28/09/2026

Referencia completa de logos, colores, tipografía y favicons: **`docs/IDENTIDAD.md`**. Decisiones de diseño:

- **Colores:** el vino de todo el sistema pasó a `#56212F` (oficial); el dorado `#BC955B` es el acento secundario
  (filete de la banda institucional, línea de pasos, anillo de la pantalla de carga). Sin nuevos colores saturados.
- **Títulos en Montserrat** (sustituto de Gotham) — solo títulos; el texto sigue en Switzer. Montserrat es más ancha que
  Satoshi: la barra de `/sigae` se reacomodó (marca con `flex: none`; píldora "Nuevo" solo desde 1240 px y con puntos
  suspensivos) porque la píldora se encimaba sobre "SIGAE" entre 900 y 1240 px.
- **Banda institucional** (convivencia de logos) blanca con filete dorado, **arriba** de las páginas públicas y de acceso;
  nunca en pies ni en paneles. En `/sigae` la barra flotante arranca debajo de la banda y sube a su sitio al desplazarse
  (se anima `translate`, no `top`).
- **Logo en fondos oscuros:** versión negativa oficial (se eliminaron los `brightness-0 invert`).
- **Login, recuperar contraseña y solicitar acceso sin scroll de página:** `h-dvh` en columna (banda + fila); el banner
  ocupa el alto restante y, si algo no cabe, solo se desplaza la columna del formulario. Los espacios verticales del
  login se escalan con el **alto** de la pantalla (`clamp(…vh…)`, clases `.auth-pantalla`/`.auth-columna`, sin
  `@layer`). Medido en 13 tamaños (1920×1080 a 320×568): 0 px de scroll de página; login y recuperación caben completos.
- **Carrusel del login — encuadre no destructivo** (`BannerImagen` + `EncuadreEditor` en `/admin/carrusel`, paso "El
  encuadre"): *Imagen completa* (contain sobre fondo desenfocado de la misma imagen, claro o vino, con margen) o
  *Recortar y enfocar* (punto focal arrastrable, flechas del teclado, zoom). Vista previa en los tres anchos reales del
  panel del login (monitor 1.05, laptop 0.8, tablet 0.66) con el logo y la tarjeta de texto simulados. Al subir una
  imagen muy ancha (≥ 2:1) sugiere "completa + desenfoque + sin textos". Se quitó "Acceso Institucional Cifrado 256-bit".
- **Portal SIDECyT (`/`) más interactivo** (pedido del usuario; skills emil-design-eng / hallmark):
  - señal en vivo "N convocatorias abiertas/próximas" con contador animado — solo si hay datos reales;
  - "¿Cuál es para mí?": una sola píldora que se desliza entre opciones (`layoutId`), flechas/Inicio/Fin con foco
    itinerante (radiogroup WAI-ARIA), insignia "Recomendado para ti" en la tarjeta (en la fila del ícono: no mueve el
    contenido bajo el cursor) y, en teléfono, desplazamiento suave hasta la tarjeta recomendada;
  - sección nueva **"Cómo funciona"** (3 pasos reales, numerados porque es secuencia) con línea vino→dorado que se dibuja
    al entrar en pantalla (horizontal en escritorio, vertical en teléfono);
  - las secciones bajo el pliegue se revelan al llegar a ellas (antes se animaban fuera de la vista al cargar);
  - chips de programas escalonados al llegar de la API. Todo respeta `prefers-reduced-motion` y anima solo
    `transform`/`opacity`.
- **Sin botón de tema** en la barra de los paneles: todos siguen el tema del sistema operativo.

## 20. Portal rediseñado y barras en teléfono — E51, 28/09/2026

- **Motivo propio:** la órbita del héroe toma los arcos concéntricos del logo COMECYT (vino, dorado, vino suave) con
  SIDECyT al centro y un nodo por sistema. Interacción con propósito: nodo ↔ tarjeta se resaltan mutuamente
  (conector punteado + pulso), el nodo lleva a su tarjeta. Movimiento: trazo único al cargar (1.4 s, ease-out fuerte),
  puntos en giro lento (26–46 s), pulso solo en el nodo activo; todo apagado con `prefers-reduced-motion`.
- **Barra:** marca "SIDECyT / Portal de sistemas del COMECYT", secciones con subrayado que crece (≥ 1040 px), botón vino
  "Sitio COMECYT" con globo, brillo dorado que cruza al pasar el cursor y `scale(0.97)` al presionar; ícono redondo en
  teléfono. Se compacta (58 px, más sombra) tras 90 px de desplazamiento.
- **Sello:** bloque vino "SIDECyT" + nombre completo; bajo 560 px se apila en dos filas (antes una píldora partida).
- **Pie:** degradado vino oficial con filete dorado→arena y logo negativo; textos en blanco 78 %.
- **Regla de barras (aprendida de las capturas del usuario):** en toda barra, marca y grupo de acciones llevan
  `flex: none`; lo que no quepa se reduce por pasos (texto corto, solo ícono) con `aria-label` completo — nunca se deja
  que el navegador encoja y encime. Verificar con la auditoría de encimados, no solo con scroll horizontal.
