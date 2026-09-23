# Landing pública SIDECyT — `/sigac`

**Publicada:** 23/09/2026 · **URL:** https://sidecyt-comecyt.edomex.gob.mx/sigac
(también por VPN: `https://10.250.36.241/sigac`)

Página de presentación del sistema **antes del login**. Explica qué es SIDECyT, el recorrido de una
solicitud y cómo obtener acceso, y lleva al usuario a `/login` o a `/solicitar-acceso`.

---

## 1. Rutas y enrutamiento

| Petición | Resultado |
|---|---|
| `/` sin sesión | `302` → `/sigac` (lo resuelve `proxy.ts`) |
| `/` con sesión | `302` → el panel de su rol (sin pasar por `/login`) |
| `/sigac` | Pública para todos (en `PUBLIC_PATHS`) |
| `/privacidad`, `/terminos` | **Públicas desde este cambio.** Antes mandaban al login a quien no tenía sesión, y la landing las enlaza desde el pie |
| `/login?email=…` | El login prellena el correo (y enfoca la contraseña) si el valor parece un correo válido |

`src/app/page.tsx` redirige a `/sigac` solo como respaldo: en la práctica `proxy.ts` resuelve `/` antes.
En IIS no hubo que tocar nada: `/sigac` cae en la regla `NextJsProxy` de `public/web.config`.

## 2. Archivos

| Archivo | Qué hace |
|---|---|
| `apps/web/src/app/sigac/page.tsx` | Página de servidor: metadatos (título, descripción, OpenGraph, canonical) y fuentes locales |
| `apps/web/src/app/sigac/Landing.tsx` | Componente cliente: nav, hero con collage, etapas, roles, acceso y pie |
| `apps/web/src/app/sigac/landing.css` | Todos los estilos, con prefijo `.lp-*`. Los tokens viven en `.lp-root`, **no** en `:root` |
| `apps/web/src/app/sigac/fonts/` | `Switzer-Variable.woff2`, `Satoshi-Variable.woff2` y su licencia (FFL) |
| `apps/web/src/app/sigac/Landing.a11y.test.tsx` | axe sin violaciones + validación del correo + enlaces a login/acceso |
| `apps/web/src/proxy.ts` | `/sigac`, `/privacidad` y `/terminos` en `PUBLIC_PATHS`; regla de `/` |
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
- **El logo de Edomex no aparece** porque producción tiene `NEXT_PUBLIC_EDOMEX_LOGO_URL=none`; la landing
  respeta la misma regla que `DualBranding`.

## 4. Estructura

1. **Nav flotante** (fija, píldora): logo COMECyT + "SIDECyT" + cuadro arcoíris · anuncio (≥ 900 px) ·
   "Solicitar acceso" (≥ 560 px) · "Iniciar sesión" con contorno arcoíris. Al hacer scroll gana un filo
   de 1 px.
2. **Hero:** nombre de la institución · titular "Tu proyecto, de la idea al **convenio**" · texto ·
   campo de correo con "Continuar" · "¿Todavía no tienes cuenta? Solicita acceso". Polaroids alrededor
   (≥ 1100 px, 6 tarjetas, algunas recortadas por el borde de la pantalla); en móvil, una tira de 3
   tarjetas encimadas bajo el formulario.
3. **Ocho etapas, un mismo expediente:** las 8 etapas reales del ciclo (Convocatoria → Solicitud →
   Revisión documental → Evaluación técnica → Convenio → Ministración → Informe final → Cierre), con
   quién actúa en cada una. La numeración está justificada: es una secuencia.
4. **Un lugar para cada quien:** los 4 perfiles (solicitantes, revisión documental, evaluación técnica,
   administración) con encabezado fijo a la izquierda en escritorio.
5. **¿Cómo obtengo acceso?:** 3 pasos (solicitar, validación por la administración, entrar) y la tarjeta
   final "Entra a SIDECyT" con los dos botones.
6. **Pie:** logo, aviso de privacidad, términos, correo de contacto (`INSTITUTION.contactEmail`) y
   `copyrightLine()`.

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
- `vitest`: 3/3 en `Landing.a11y.test.tsx` (axe sin violaciones) y la prueba del login sigue pasando.
- Capturas con Edge headless a 1440×900 y 375×812: **sin scroll horizontal** en ninguna.
- Flujo real: `/` → `/sigac`; correo inválido muestra el error; correo válido abre
  `/login?email=persona%40institucion.edu.mx` con el campo lleno; `/privacidad` y `/terminos` responden
  200 sin sesión.
- Producción: ver §8.

## 8. Despliegue

`& "F:\Desarrollo Tecnologico\deploy-web.ps1" -Motivo landing` (respaldo `.next.bak-20260923-prelanding`,
log en `logs\deploy-landing-20260923.log`). Solo frontend; el backend no cambió.

## 9. Cómo cambiar cosas

- **Textos de etapas, roles o pasos:** arreglos `STEPS`, `ROLES`, `ACCESS` al inicio de `Landing.tsx`.
- **Titular:** `HEADLINE` + `HEADLINE_ACCENT` (la palabra arcoíris; mantener una sola).
- **Polaroids:** arreglo `PINS` (`slot` a–f fija la posición en escritorio, `r` la inclinación, `depth` la
  intensidad del paralaje).
- **Colores:** tokens al inicio de `landing.css`, dentro de `.lp-root`. No introducir otro color de marca:
  la paleta es tinta navy + arcoíris + tres lavados pastel.
- Después de cualquier cambio: `npx vitest run src/app/sigac` y `deploy-web.ps1`.
