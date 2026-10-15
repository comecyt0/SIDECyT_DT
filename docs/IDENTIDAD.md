# Identidad institucional en SIDECyT (E50, 28/09/2026)

Fuente: carpeta **"IMAGEN COMECYT&CONVIVENCIAS 26"** entregada por el usuario (logos 2026) y el **Manual de Identidad
Gráfica del Gobierno del Estado de México 2023-2029** (MAT DIGITAL 2026). Código: `apps/web/src/lib/identidad.ts`
(única fuente de logos, colores y nombres) y `apps/web/src/components/branding/Logos.tsx`.

## 1. Reglas permanentes (pedidas por el usuario)

| Regla | Detalle |
|---|---|
| **Favicon = logo COMECYT 2026** | Todos los íconos del sistema (favicon, PWA, Apple, push) salen del logo oficial a color, completo, centrado en un lienzo cuadrado, sin recortar ni recolorear. Se generan con `apps/web/scripts/favicons.php`. |
| **Franja institucional en el ENCABEZADO** | La convivencia oficial de logos (Gobierno del Estado de México · ¡El poder de servir! · Educación · COMECYT) va **arriba** en todas las páginas públicas y de acceso (portal, `/sigae`, `/sicei`, login, recuperar/restablecer contraseña, solicitar acceso, privacidad, términos). **No va en pies de página ni en los paneles** (corrección del usuario, 28/09). Componente: `BandaInstitucional`. |
| **Tipografía oficial solo en títulos** | Gotham (manual) solo para títulos y textos importantes; el texto corrido sigue en Switzer. |
| **Logos sin alterar** | Nunca recolorear con filtros CSS (`brightness-0 invert` quedó prohibido) ni deformar: sobre fondo oscuro se usa la **versión negativa oficial**. |

## 2. Logos (`apps/web/public/identidad/`)

| Archivo | Uso |
|---|---|
| `comecyt-color.png` (721×312) | Fondos claros: barra de paneles, menú, pie, landing, portal, login, splash |
| `comecyt-negativo.png` (blanco) | Fondos oscuros: banner del login/recuperación, modo oscuro |
| `comecyt-positivo.png` (negro) | Impresión |
| `convivencia-color.png` (≈5212×388) | Franja institucional del encabezado (siempre sobre blanco) |
| `convivencia-negativo-a.png` / `-b.png` / `-positivo.png` | Reservados (fondos oscuros / impresión) |
| `educacion-*.png` | Reservados |

Todos tienen su `.webp`. `public/logo.png` y `logo-recortado.png` se sobrescribieron con el logo nuevo (compatibilidad:
enlaces viejos o cachés); ningún componente los usa ya.

**Trampa (E50):** las imágenes de una **subcarpeta** de `public/` pasan por `proxy.ts`. `/identidad/*.png` redirigía al
login (307) hasta que se agregó `identidad/[\w-]+\.(png|webp)$` al `matcher`. Toda carpeta nueva de recursos públicos
necesita su exclusión explícita (acotada, no un comodín de extensiones anidadas).

## 3. Colores oficiales (`COLORES` en `identidad.ts`)

| Nombre | HEX | Dónde |
|---|---|---|
| Vino | `#56212F` | Color principal: `--sg-vino`, `--auth-vino`, `--color-vino` (landing), `--pt-vino` (portal), `--brand-vino`, `--primary` (shadcn), manifest |
| Guinda | `#9F2241` | Reservado |
| Dorado | `#BC955B` | Acentos secundarios: filete de la banda, línea de "Cómo funciona", `--auth-gold`, `--secondary` |
| Arena | `#DDC8A4` | Acento claro (tokens `--*-arena`) |
| Beige / café / bronce / gris cálido | `#C3B08F` / `#977E5B` / `#965F36` / `#D6D1CA` | Reservados |

El vino del texto del logotipo se verificó midiendo los píxeles del PNG oficial.

## 4. Tipografía

- **Gotham** es comercial y no está en el servidor. **Sustituto:** Montserrat (SIL OFL 1.1), auto-hospedada en
  `src/fonts/Montserrat-Variable.woff2` (subconjunto latino, cubre español) con su licencia `LICENSE-OFL-Montserrat.txt`.
- Pila: `--font-titulos: 'Gotham', var(--font-montserrat), 'Montserrat', …` (globals.css). Si COMECYT entrega los
  archivos oficiales de Gotham con licencia web, se agregan en `lib/fonts.ts` y todo el sistema los toma.
- **15/10/2026 (E73):** el usuario pidió "Gotham oficial + Inter" para el portal y que se descargara Gotham. **No se
  descargó:** es comercial (Hoefler&Co/Monotype) y no hay fuente oficial gratuita; una copia de terceros sería sin
  licencia y de origen no confiable. Se pide a Comunicación Social (kit MAT DIGITAL 2026). Mientras, Montserrat.
- **Inter 4.1** (SIL OFL 1.1, `src/fonts/Inter-Variable.woff2` + `LICENSE-OFL-Inter.txt`, del release oficial
  `rsms/inter`) es el texto corrido **solo del portal `/`** (variable `--font-inter`). El resto del sistema sigue en Switzer.
- Se aplica a: `h1–h3` (capa base, cualquier clase con fuente propia gana), `--sg-font-display` (paneles),
  `--font-basier-circle` (landing), `--pt-display` (portal) y `.auth-banner-title`.
- **Nunca** desde Google Fonts ni CDN (la CSP solo permite `font-src 'self'` y el servidor no los alcanza).

## 5. Favicons (`apps/web/public/`)

`favicon.ico` (16/32/48, PNG embebido), `favicon-32.png`, `favicon-48.png`, `icon-192.png`, `icon-512.png`,
`apple-touch-icon.png` (180, fondo blanco: iOS pinta negro lo transparente), `icon-maskable-512.png` (zona segura 80 %).
También `apps/api/public/favicon.ico` (IIS lo sirve directo; antes era un archivo de 0 bytes).
Conectados en `app/layout.tsx` (metadata `icons`), `manifest.webmanifest`, `sw.js` (precaché e ícono de notificación)
y `PushSender.php` (ícono por defecto). **Al cambiarlos, subir `CACHE_VERSION` de `sw.js`.**

## 6. Service worker: no guardar redirecciones (E50)

Mientras el proxy redirigía `/identidad/*` al login, `sw.js` (caché primero para imágenes) guardó el **HTML del login**
como si fuera la imagen: esos logos quedaron rotos en los navegadores que visitaron en esos minutos. Ahora `cacheFirst`
solo guarda respuestas `ok`, no redirigidas, del mismo origen y que no sean `text/html`; `comecyt-v5` purgó lo guardado.
