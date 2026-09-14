# Diseño UI — COMECYT

Sistema visual y de interacción del front. Empezó con el rediseño del login del **14/09/2026** y es la
referencia para cualquier vista nueva o rediseño.

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
  etiquetas son texto con una línea dorada delante (`.auth-tag`); los botones son cuadrados redondeados.
  Quedan fuera del login 15 usos en 12 archivos del resto del sistema (admin, layouts, filtros): cambiarlos
  es una tarea aparte.
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

## 5. Verificación

```powershell
cd "F:\Desarrollo Tecnologico\apps\web"
npx tsc --noEmit -p .
npx vitest run DualBranding login          # incluye la prueba axe del login
npx eslint "src/app/(auth)/login/page.tsx" src/components/ui/login-carousel.tsx
```

Revisión visual e interactiva (14/09/2026) con Playwright usando el Chrome instalado, contra
`npx next dev -p 3100`: capturas a 1440, 1920 (con "reducir movimiento") y 390 px; sin scroll horizontal;
autoplay avanza; foco, error y segunda diapositiva; 0 errores de consola. Chrome headless en Windows no
baja de ~500 px de ancho con `--window-size`: para celular usar Playwright con `viewport`.

**Trampa de hidratación:** `useReducedMotion()` devuelve `null` en el servidor. Usarlo directo en el
render cambia `aria-live`, íconos y variantes entre servidor y cliente. Se aplica después de montar
(ver E7 en `CLAUDE.md`).

---

## 6. Despliegue

Igual que E20 de `CLAUDE.md`: detener `comecyt-web`, respaldar `.next`, `npm run build`, copiar `static`
y `public` a `standalone`, iniciar el servicio. Los `NEXT_PUBLIC_*` se hornean en el build, así que
cualquier cambio de `.env.local` requiere recompilar (E24).
