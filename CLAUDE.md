# CLAUDE.md — COMECYT Sistema
**Versión:** 8.1 (30 Junio 2026) | **Build:** 47 rutas, 0 errores | **PHP lint:** 0 errores | **Ruta:** `F:\Desarrollo Tecnologico\`

---

## Visión General del Proyecto

**SIGAC — Sistema de Gestión de Apoyos Científicos** (nombre confirmado por el usuario el 23/09/2026) es el
sistema del **COMECYT** (Consejo Mexiquense de Ciencia y Tecnología) que administra el ciclo completo de las
convocatorias de financiamiento de Apoyo Empresarial. Landing pública: `/sigac` (E36). El dominio conserva el
nombre anterior (`sidecyt-comecyt.edomex.gob.mx`).

```
Convocatoria → Solicitud → Revisión documental → Evaluación técnica
    → Convenio → Ministración → Informe final → Cierre
```

**Cuatro roles:**
| Rol | ID | Descripción |
|-----|----|-------------|
| Administrador | 1 | Control total del sistema |
| Revisor Documental | 2 | Valida documentación de solicitudes |
| Evaluador Técnico | 3 | Puntúa proyectos según criterios dinámicos |
| Solicitante | 4 | Institución que solicita financiamiento |
| Admin de convocatoria | 5 | Opera el flujo completo **solo** de sus convocatorias asignadas (∩ sus periodos); no crea ni borra convocatorias, ni toca usuarios/programas/configuración (E45) |
| Consulta | 6 | Solo lectura: dashboard, solicitudes, fichas, folios, reportes — de sus periodos; **sin periodos no ve nada** (E45) |

Alcance (E45): revisor/evaluador sin periodos ven todo; con periodos, solo esos. Regla única en `App\Support\Alcance`.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 (App Router) + React 18 + TypeScript |
| Estilos | Tailwind CSS v4 + Shadcn UI v3 |
| Animaciones | Framer Motion |
| Backend | Laravel 11 (API-only) |
| Auth | JWT — `tymon/jwt-auth`, HS256, 24h TTL |
| Base de datos | PostgreSQL 18 |
| PDF | `barryvdh/laravel-dompdf` |
| Excel | `maatwebsite/laravel-excel` |
| Email | Dev: `MAIL_MAILER=log` (escribe en log). **Producción (desde 23/09/2026): SMTP Microsoft 365** `smtp.office365.com:587` STARTTLS con `proyectos.comecyt@edomex.gob.mx` (E38) |

**Puertos:** Frontend `localhost:3000` | Backend `localhost:8000` | API `localhost:8000/api`

---

## Arquitectura

### Estructura de carpetas

```
comecyt-system/
├── apps/
│   ├── api/                          # Laravel 11 API-only
│   │   ├── app/Http/Controllers/
│   │   │   ├── Admin/                # UserController, ConvenioController, CarouselController...
│   │   │   ├── Auth/                 # AuthController, PasswordResetController, RegistroAccesoController
│   │   │   ├── Catalogos/            # CatalogoController, ProgramaCatalogController
│   │   │   ├── Convocatorias/        # ConvocatoriaController
│   │   │   ├── Evaluaciones/         # EvaluadorController ← ÚNICO controller de evaluador
│   │   │   └── Solicitudes/          # SolicitudController, RevisionController
│   │   ├── app/Enums/Message.php     # 40+ mensajes centralizados
│   │   ├── app/Helpers/ConfigHelper.php
│   │   ├── config/comecyt.php        # Roles, estados, límites, montos
│   │   └── routes/api.php
│   └── web/                          # Next.js 14
│       └── src/
│           ├── app/
│           │   ├── (auth)/           # login, forgot-password, reset-password, solicitar-acceso
│           │   ├── admin/            # Todas las páginas admin
│           │   ├── evaluador/        # Páginas del evaluador
│           │   ├── revisor/          # Páginas del revisor
│           │   └── solicitante/      # Páginas del solicitante
│           ├── components/layout/
│           │   ├── AdminTopLayout.tsx   # Layout admin con mega-dropdown
│           │   └── RoleTopLayout.tsx    # Layout genérico para los 3 roles restantes
│           ├── lib/
│           │   ├── api.ts            # Axios singleton con JWT
│           │   └── roles.ts          # Constantes ROLES.ADMIN/REVISOR/EVALUADOR/SOLICITANTE
│           └── types/api.ts          # Interfaces TypeScript del dominio
```

### Layouts por Rol

```
Admin       → AdminTopLayout   (NAV_GROUPS hardcoded, 4 grupos, mega-dropdown 680px)
Solicitante → RoleTopLayout    (5 nav items, dropdown compacto 420px)
Revisor     → RoleTopLayout    (5 nav items)
Evaluador   → RoleTopLayout    (3 nav items)
```

**Regla:** Páginas nuevas en `/admin/*` deben agregarse **manualmente** al array `NAV_GROUPS` en `AdminTopLayout.tsx`. No aparecen automáticamente.

### Roles — IDs Centralizados

**Backend:** `config('comecyt.roles.X')` — nunca hardcodear números. Definido en `config/comecyt.php`.

**Frontend:** `ROLES.X` de `@/lib/roles` — nunca hardcodear números.
```typescript
import { ROLES } from '@/lib/roles';
// ROLES.ADMIN=1, ROLES.REVISOR=2, ROLES.EVALUADOR=3, ROLES.SOLICITANTE=4
```

### Mensajes y Configuración Centralizados (Backend)

```php
// Mensajes — app/Enums/Message.php
ConfigHelper::msg(Message::AUTH_INVALID_CREDENTIALS)

// Valores de config — config/comecyt.php
ConfigHelper::val('montos.monto_maximo_solicitud')   // → 60000
ConfigHelper::val('validation.titulo_proyecto_max_chars')  // → 255
config('comecyt.roles.admin')  // → 1
```

### Estados de Solicitud

```
borrador → enviada → en_evaluacion → aprobada → convenio → ministracion → seguimiento → cerrada
                ↕
            observada (ciclo revisor)
rechazada (desde: enviada | en_evaluacion | aprobada)
cancelada (desde: borrador | enviada | observada | en_evaluacion)
```

**Estados de AsignacionEvaluador:** `asignado` → `evaluando` → `concluido`
- `asignado`: recién asignado por admin
- `evaluando`: evaluador abrió la rúbrica (cambia via `PUT /evaluador/asignaciones/{id}/iniciar-evaluacion`)
- `concluido`: dictamen emitido

### Estado público de una Convocatoria (E40, desde 24/09/2026)

`estado` (columna) solo tiene `borrador | activa | cerrada`; lo que ve el público se **deriva** con las fechas
en `Convocatoria::getEstadoPublicoAttribute()` (se serializa como `estado_publico`):

```
borrador            → no se publica
activa + hoy < apertura                → proxima   ("Próxima a abrir")
activa + apertura ≤ hoy ≤ límite       → abierta   (o prorroga si tiene fecha_prorroga)
cerrada, o activa + hoy > límite       → cerrada
límite = COALESCE(fecha_prorroga, fecha_cierre)   ← `fecha_cierre_efectiva`
```

- **"Hoy" es la fecha de negocio en America/Mexico_City** (`Convocatoria::hoy()`, config
  `comecyt.timezone_negocio`). La app corre en UTC: no usar `today()`/`now()` para reglas de convocatoria.
- **Quién acepta solicitudes:** `aceptaSolicitudes()` / scope `aceptandoSolicitudes()` — usarlos en todo lo que
  crea, envía o lista convocatorias para solicitantes. Nunca `estado === 'activa'` a secas.
- **Prórroga:** solo por `POST /admin/convocatorias/{id}/prorroga` (amplía, nunca recorta; motivo obligatorio;
  reabre si estaba cerrada; queda en bitácora). `fecha_cierre` conserva la original.
- **Banner:** `banner_url` en convocatorias y en `tipo_programas`, solo por `BannerController` (admin). La
  landing usa el de la convocatoria o, si no tiene, el de su programa.
- Prórroga y banner están en `$guarded` (Convocatoria) / fuera de `$fillable` (TipoPrograma): el PUT genérico no
  puede escribirlos.
- `deleted_at` existe pero el modelo **no** usa `SoftDeletes`: filtrar `whereNull('deleted_at')` explícito.

### Convocatoria → TipoPrograma (1:1 único)

Cada convocatoria tiene su propio `TipoPrograma` exclusivo. Los campos dinámicos, documentos, rubros y criterios de evaluación se configuran por convocatoria vía el Wizard de 7 pasos en `/admin/convocatorias/nueva`. Las convocatorias **deben** tener `tipo_programa_id` para que aparezcan al solicitante.

---

## Reglas Críticas (errores que ya costaron tiempo)

### 0. CIBERSEGURIDAD OBLIGATORIA EN CADA IMPLEMENTACIÓN (regla permanente, 23/09/2026)
**Pedido explícito del usuario: toda implementación —nueva o cambio— debe mantener todos los protocolos de
ciberseguridad necesarios para que el sistema no sea hackeable.** No es opcional ni "para después". El
sistema es público en Internet (`sidecyt-comecyt.edomex.gob.mx`) y lo audita ADEM con pentest. Antes de dar
por terminado cualquier cambio, revisar como mínimo:

| Área | Qué exigir |
|---|---|
| **Autenticación y autorización** | Toda ruta nueva va en el grupo `api.auth` + middleware de rol, salvo que sea pública **a propósito** y documentada. En el front, rutas públicas solo vía `PUBLIC_PATHS` de `proxy.ts`. Verificar propiedad del recurso (IDOR): un usuario solo ve lo suyo |
| **Endpoints públicos** | Solo lectura, `throttle:*` obligatorio, **lista blanca de campos armada a mano** (nunca serializar el modelo completo), límite de resultados, sin parámetros que filtren o paginen sin validar. Ejemplo de referencia: `ConvocatoriaPublicaController` (E37) |
| **Entrada** | Validación en 2 capas (regla 9). Backend con `$request->validate()` y tipos/longitudes. Eloquent o bindings, **nunca SQL concatenado**. Archivos con `ValidatesBinaryMimeTypes` |
| **Salida / XSS** | React escapa: **nunca `dangerouslySetInnerHTML`** con datos de usuario o de API (si es inevitable, sanitizar). Datos de API se validan en el front antes de pintarlos (`Array.isArray`, tipos, longitudes) |
| **Secretos** | Nunca en código, `.md`, commits ni logs (el repo es público). Solo en `.env` (con respaldo previo al editarlo). Scripts que usan contraseñas no las imprimen. Revisar el diff antes de cada commit |
| **Cabeceras y CSP** | No relajar la CSP (`next.config.ts`, `SecurityHeadersMiddleware`, `web.config`): sin comodines `*.dominio`, sin `unsafe-eval`, orígenes explícitos. Recursos externos (fuentes, scripts) **auto-hospedados**. `X-Frame-Options`, `nosniff`, HSTS, CORP deben seguir presentes — verificar con `curl.exe -D -` |
| **Sesión** | Cookie `comecyt_auth` HttpOnly + Secure + SameSite=Strict; nada sensible en `localStorage` ni cookies JS. Peticiones públicas con `credentials: 'omit'` |
| **Errores** | Sin trazas ni datos internos al cliente (`APP_DEBUG=false`). Mensajes genéricos hacia fuera, detalle solo en logs |
| **Enlaces externos** | `target="_blank"` siempre con `rel="noopener noreferrer"` |
| **Dependencias** | No agregar paquetes sin necesidad; preferir lo que ya está. Nada cargado desde CDN en tiempo de ejecución |
| **Verificación** | Probar el caso malicioso, no solo el feliz: método no permitido, parámetros inyectados, exceso de peticiones (429), HTML/script en los datos (debe salir como texto). Dejar prueba automatizada cuando aplique |

Si un requisito de negocio choca con un control de seguridad, **no se relaja el control en silencio**: se
documenta el riesgo aquí y se consulta al usuario.

**Ampliación del 24/09/2026 (pedido del usuario: "que el sistema no sea hackeable desde ningún apartado"):**

| Área | Qué exigir |
|---|---|
| **Alcance / multirol (E45)** | Todo dato ligado a una convocatoria pasa por `App\Support\Alcance`: listados con `Alcance::aplicar*`, registros por el middleware `alcance` (404 fuera de alcance, nunca 403 que confirme existencia). Si el id llega en el **cuerpo** (no en la ruta), revisarlo a mano con `Alcance::exigirSolicitud`. Nunca filtrar solo en el front |
| **Roles** | Rutas con `rol:...` explícito; privilegio mínimo (Consulta solo GET; admin de convocatoria sin usuarios, programas ni configuración). Menú y botones ocultos en el front son comodidad, no control |
| **Datos sensibles** | Bancarios completos solo admin y admin de convocatoria (`Enmascarar`). Respuestas con lista blanca de campos cuando cruzan roles (fichas, evaluadores disponibles, endpoints públicos) |
| **Archivos** | MIME real + extensión fija derivada del MIME (nunca la del cliente), tamaño por campo, nombre aleatorio, disco **privado** y descarga con sesión + permiso. Imágenes re-codificadas (elimina EXIF/cargas); DOCX/XLSX sin macros; ZIP sin rutas `..`, con límite de entradas y de tamaño descomprimido. No imágenes SVG |
| **Tiempo real** | Canales privados autorizados en `routes/channels.php` por participación real; el servidor decide quién recibe, el cliente solo escucha. Mensajes solo texto, longitud máxima, throttle |
| **Publicación pública** | Lo que se muestra en la landing es una instantánea confirmada por un humano, con lista blanca de campos (p. ej. solo folio), caché y throttle |
| **Auditoría** | Toda acción administrativa (publicar, asignar alcances, resolver, cambiar límites) queda en `Audit::log` |
| **Pruebas** | Cada función nueva lleva su prueba del caso malicioso (otro rol, otra convocatoria, id ajeno en el cuerpo, archivo disfrazado, exceso de peticiones) antes de publicar |

### 1. apiResource con plurales españoles en -ones/-es
Laravel pluraliza mal palabras que terminan en `-ones`, `-es`, `-as`. **Siempre** usar `.parameters()`:
```php
// ❌ ROMPE SILENCIOSAMENTE — genera {ministracione} como param
Route::apiResource('ministraciones', MinistracionController::class);

// ✅ CORRECTO
Route::apiResource('ministraciones', MinistracionController::class)
    ->parameters(['ministraciones' => 'ministracion']);
// Aplica a: ministraciones, instituciones, informes, convenios, solicitudes, usuarios
```

### 2. Cache + Eloquent Models — siempre .toArray()
```php
// ❌ Al deserializar del cache → __PHP_Incomplete_Class → TypeError en count()/property access
Cache::remember($key, $ttl, fn() => Model::with('rel')->get());

// ✅ CORRECTO
Cache::remember($key, $ttl, fn() => Model::with('rel')->get()->toArray());
```

### 3. Storage Disk explícito
```php
// ❌ Usa disco 'local' (privado) por defecto → archivo no accesible en /storage/
$file->storeAs("documentos/{$id}", $filename);

// ✅ CORRECTO — disco 'public' → accesible vía symlink public/storage
Storage::disk('public')->putFileAs("documentos/{$id}", $file, $filename);
Storage::disk('public')->url("documentos/{$id}/{$filename}");
```

### 4. Rutas públicas en proxy.ts (Next.js 16, antes middleware.ts)
Páginas sin auth deben estar en `PUBLIC_PATHS` en `apps/web/src/proxy.ts`. Si no, el proxy las bloquea silenciosamente → el usuario ve que el botón "no hace nada".
```typescript
const PUBLIC_PATHS = [
  '/sigac', '/login', '/forgot-password', '/reset-password', '/solicitar-acceso', '/privacidad', '/terminos',
];
// y `/` sin sesión → /sigac (landing pública, E36)
```

### 5. Password Reset desde Admin — limpiar token previo
`Password::sendResetLink()` retorna `passwords.throttled` si se llama >1 vez en 60 segundos. Siempre limpiar antes:
```php
DB::table('password_reset_tokens')->where('email', $email)->delete();
Password::sendResetLink(['email' => $email]);
```

### 6. Array validation en React — obligatorio
```typescript
// SIEMPRE antes de .map() / .filter() / .length
const items = Array.isArray(response.data)
  ? response.data
  : (response.data?.data ?? []);
```

### 7. Promise.all() para múltiples API calls
```typescript
// ❌ Race condition — stats y lista pueden no coincidir
api.get('/stats').then(...);
api.get('/list').then(...).finally(() => setLoading(false));

// ✅ CORRECTO — ambas cargan sincronizadas
const [statsRes, listRes] = await Promise.all([
  api.get('/stats').catch(() => ({ data: {} })),
  api.get('/list').catch(() => ({ data: [] })),
]);
setLoading(false);
```

### 8. Framer Motion Variants — 'as const'
```typescript
// ❌ TypeError: Type '"spring"' is not assignable
transition: { type: 'spring' }

// ✅ CORRECTO
transition: { type: 'spring' as const, damping: 20 }
```

### 9. Validación en 2 capas (Gold Rule)
Siempre validar en **frontend** (UX, bloquea antes de llamar API) **y** en **backend** (seguridad, rechaza con 422 si el frontend se saltea). Redundancia deliberada.

### 10. Flujo de recuperación de contraseña — es admin-mediated
No es un reset directo. El flujo es:
1. Usuario → `/forgot-password` → backend crea `PasswordResetRequest` (pending)
2. Admin aprueba en `/admin/reset-requests` → Laravel envía enlace al usuario

Esto es intencional: COMECYT requiere control institucional sobre quién puede resetear contraseñas.

### 11. UsuariosPruebaSeeder — NUNCA en producción
`DatabaseSeeder` ejecuta `UsuariosPruebaSeeder` solo si `app()->isLocal() || app()->environment('testing')`. Si se pasa a producción con `APP_ENV=production`, el seeder se omite automáticamente. Nunca remover este guard.

### 13. JWT — cookie HttpOnly `comecyt_auth` (desde v8.0)
El backend emite cookie `comecyt_auth` (HttpOnly, SameSite=Strict, Secure en producción). El frontend usa `withCredentials: true` — el navegador la envía automáticamente. `ReadJwtFromCookieMiddleware` la convierte en Bearer header. El frontend ya **no** guarda el token en `localStorage` ni en cookie JS.
```php
// Solo cookies NO sensibles se guardan en JS:
Cookies.set('userRole', roleSlug, ...);
Cookies.set('userName', user.name, ...);
// La cookie 'token' legacy persiste como fallback durante transición de sesiones
```

### 14. Scheduler de convocatorias — activar en producción
El comando `convocatorias:close-expired` corre cada hora vía scheduler. En producción agregar al crontab:
```
* * * * * cd /var/www/api && php artisan schedule:run >> /dev/null 2>&1
```

### 12. EvaluadorController — existe en un único namespace
`App\Http\Controllers\Evaluaciones\EvaluadorController` es el único controller de evaluador. **No existe** ni debe crearse `App\Http\Controllers\EvaluadorController`. El controller de Evaluaciones maneja: `asignaciones`, `show`, `startEvaluation`, `saveDictamen`, `asignar`, `desasignar`.

---

## Guía de Estilo

### PHP / Laravel

```php
// ✅ Estructura correcta de un controller
namespace App\Http\Controllers\Dominio;

use App\Http\Controllers\Controller;
use App\Models\ModeloRelevante;
use App\Helpers\ConfigHelper;
use App\Enums\Message;
use Illuminate\Http\Request;

class MiController extends Controller
{
    public function index()
    {
        $items = ModeloRelevante::with('relacion')->get();
        return response()->json($items);
    }

    public function store(Request $request)
    {
        $maxTitulo = ConfigHelper::val('validation.titulo_proyecto_max_chars');
        $validated = $request->validate([
            'titulo' => "required|string|max:{$maxTitulo}",
        ]);

        $item = ModeloRelevante::create($validated);
        return response()->json($item, 201);
    }
}
```

**Convenciones:**
- PascalCase: Classes, Models, Enums
- camelCase: métodos, variables, propiedades
- snake_case: columnas BD, parámetros de ruta, campos JSON
- Siempre `updateOrCreate` en seeders (idempotente)
- Middleware por grupo de rutas, nunca en `__construct()` (Laravel 11)
- Transacciones con `DB::beginTransaction()` para operaciones multi-modelo

### TypeScript / React

```typescript
'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import type { Solicitud } from '@/types/api';

export default function MiPagina() {
  const [items, setItems] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await api.get('/endpoint');
        setItems(Array.isArray(data) ? data : (data?.data ?? []));
      } catch (error) {
        console.error('Error cargando items:', error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  return <div>...</div>;
}
```

**Convenciones:**
- PascalCase: Components, Types, Interfaces
- camelCase: variables, funciones, props
- snake_case: campos de API (heredado del backend)
- Tipos explícitos: `useState<Solicitud[]>([])` nunca `useState([])`
- `Array.isArray()` obligatorio antes de cualquier `.map()` / `.filter()`
- `useEffect` con función `init` async interna
- Campos de fecha siempre con null-guard: `field ? new Date(field).toLocaleDateString('es-MX') : '—'`
- `dangerouslySetInnerHTML` siempre con fallback: `{ __html: field ?? '' }`

### Diseño UI — skills y sistema visual (desde 14/09/2026, giro multicolor 21/09/2026)
Todo trabajo de diseño usa las skills `hallmark`, `frontend-design`, `ui-ux-pro-max` y `emil-design-eng`
(instaladas en `~/.claude/skills`). Sistema, tokens `--auth-*`/`--app-*`/`--tile-*` y decisiones:
**`docs/DISENO_UI.md`**. Reglas vigentes del usuario: logo grande, toda animación respeta
`prefers-reduced-motion` y anima solo `transform`/`opacity`.
**21/09/2026 — cambio de dirección para el contenido interno de los 4 paneles** (login/auth no se tocó,
ya estaba resuelto): el sistema pasó a ser **vivo y multicolor** (referencia Duolingo) y se **adoptaron
las píldoras** (`rounded-full` con borde grueso) en badges/chips de estado — deroga las dos reglas
previas de "nada de píldoras" y "fondos poco saturados". Wine sigue como color principal y de detalle.
Capa reutilizable en `globals.css` (`data-tone`, `.pill`, `.tone-chip`, `.tone-card`, `.stat-tile`,
`.btn-sticker`, `.empty-state`) que alcanza a los 4 roles sin tocarlos archivo por archivo; detalle
completo y el barrido vista por vista en `docs/DISENO_UI.md` §10.
**El menú/nav del panel NO se toca (E26).** `logo.png` es el favicon del sistema completo.
**23/09/2026 — Landing pública `/sigac`** con sistema visual propio y aislado (ADN de portrait.so, tokens en
`.lp-root`, fuentes locales Switzer + Satoshi): `docs/LANDING_SIGAC.md` y E36.
**24/09/2026 — PANELES v3, DIRECCIÓN VIGENTE (E41):** rediseño estructural con la landing + referencia
aboardhr.com: barra flotante en píldora (misma lógica de menú; migas fuera de la barra), lienzo papel `#fafafa`
con salpicaduras tenues, `PageHeader` como héroe, `PastelFrame` (marcos pastel rebajados con paneles blancos),
`StatTile` v3, dashboards reestructurados. El login no cambió. Detalle: `docs/DISENO_UI.md` §13. **Esto
sustituye la regla E26 de "el menú no se toca"**: el usuario pidió explícitamente cambios de estructura en
todos los paneles; la lógica del menú (grupos, dropdown, móvil) sigue igual.
**24/09/2026 (noche) — E43:** contenido interno de todas las vistas, menú (bloques pastel por grupo) y pie
común `PanelFooter` (logo ×5) con el mismo lenguaje; `DISENO_UI.md` §14.
**24/09/2026 — sin arcoíris:** el acento de firma (CTA principal, palabra destacada, cuadro de marca) es
**vino no saturado** con relleno animado al pasar el cursor, en landing y paneles (E40).
**23/09/2026 — ESE MISMO SISTEMA EN TODOS LOS PANELES (dirección vigente, E39):** tinta navy principal,
lienzo blanco, pastel, vino solo de detalle, píldoras, Switzer/Satoshi. Capa única
`src/styles/panel-sigac.css` acotada a `:is(.panel-root, html.sg-panel)`; **el login no cambia**. Sustituye
la dirección visible "multicolor/Duolingo" del 21/09. Detalle: `docs/DISENO_UI.md` §12.

### Patrón de descarga de archivos (blob)
```typescript
const response = await api.get('/endpoint', { responseType: 'blob' });
const url = URL.createObjectURL(new Blob([response.data]));
const a = document.createElement('a');
a.href = url;
a.download = `nombre_${new Date().toISOString().split('T')[0]}.xlsx`;
a.click();
URL.revokeObjectURL(url);
```

---

## Usuarios de Prueba (solo local)

Un usuario por rol (admin, revisor, evaluador, solicitante). Correos y contraseña: `UsuariosPruebaSeeder`.
**No se escriben aquí** desde el 14/09/2026: el repositorio `comecyt0/SIDECyT_DT` es público.

> Creados por `UsuariosPruebaSeeder`, que solo corre con `APP_ENV=local`.

> ⚠️ **Verificado el 11/09/2026: estas 4 cuentas EXISTEN en producción** (`comecyt_prod`) y son las únicas
> del sistema. **3 seguían con la contraseña del seeder.** Se crearon el 15 y el 25/06/2026, durante el despliegue.
> **14/09/2026: contraseñas de las 4 rotadas** (la del seeder ya no entra en producción). Falta crear las cuentas reales.
> Con el dominio publicado es un riesgo crítico: crear las cuentas reales y cambiar la contraseña o
> desactivar estas antes de abrir pruebas. Ver `docs/ESTADO_ACTUAL.md`, Pendientes.

---

## Comandos Clave

```bash
# ── Backend (Laravel) ──────────────────────────────────────────
cd apps/api

php artisan serve                          # http://localhost:8000
php artisan migrate --seed                 # Migraciones + seed
php artisan migrate:fresh --seed           # Reset completo (¡borra datos!)
php artisan cache:clear
php artisan config:clear
php artisan route:list | grep nombre       # Verificar rutas
php -l app/Http/Controllers/X.php         # Lint sintaxis PHP
php artisan convocatorias:close-expired   # Cierre manual de convocatorias vencidas
php artisan schedule:work                  # Scheduler en producción (ejecutar como daemon)
php artisan app:deploy-check              # Verifica que el entorno de producción esté listo

# ── Deployment a producción ────────────────────────────────────
bash deploy.sh                             # Script completo: migrate, cache, crontab, permisos

# ── Ruta de instalación (Windows Server) ──────────────────────────
# Ruta real:    F:\Desarrollo Tecnologico\
# Junction:     F:\comecyt → F:\Desarrollo Tecnologico  (sin espacios, para NSSM)
# Pruebas:      https://10.250.36.241/  (VPN interna; mismo build que producción)
# Producción:   https://sidecyt-comecyt.edomex.gob.mx/  (detrás del balanceador, ver E22)

# ── Frontend (Next.js) ─────────────────────────────────────────
cd apps/web

npm run dev                                # http://localhost:3000
npm run build                              # Build de producción (debe dar 0 errores)
npm run lint                               # ESLint

# ── Git ────────────────────────────────────────────────────────
git add apps/api/...  apps/web/...         # Staging selectivo
git commit -m "tipo: descripción breve"   # Conventional commits
```

---

## Variables de Entorno

### Backend `apps/api/.env`
```env
APP_ENV=local           # Controla si UsuariosPruebaSeeder corre
APP_KEY=base64:...
JWT_SECRET=...          # php artisan jwt:secret

DB_CONNECTION=pgsql
DB_HOST=localhost
DB_DATABASE=comecyt_dev

MAIL_MAILER=log         # Dev: escribe en log. Prod: smtp (smtp.office365.com:587, STARTTLS, ver E38)
MAIL_FROM_ADDRESS="noreply@comecyt.gob.mx"

AUTH_LOGIN_RATE_LIMIT=5        # intentos/minuto en /auth/login
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Para links en emails de reset
```

### Frontend `apps/web/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api   # Desarrollo. En producción: /api (relativa, ver E22)
```
En producción, desde el 11/09/2026, las `NEXT_PUBLIC_REVERB_HOST/PORT/SCHEME` se omiten (`echo.ts` usa el
origen de la página). `API_INTERNAL_URL=https://10.250.36.241/api` va en el entorno NSSM de `comecyt-web`,
para `serverFetch`. Documento completo: `docs/DOMINIO_BALANCEADOR.md`.

---

## API Endpoints Completos

### Auth (público)
```
POST /auth/login
POST /auth/forgot-password     → crea PasswordResetRequest (requiere aprobación admin)
POST /auth/reset-password
POST /auth/solicitar-acceso    → crea SolicitudAcceso pendiente de aprobación admin
```

### Auth (protegido)
```
POST /auth/logout
POST /auth/refresh
GET  /auth/me
PUT  /auth/change-password
```

### Catálogos (público, sin auth)
```
GET /catalogs/programa/{id}
GET /catalogs/programa/{id}/campos
GET /catalogs/programa/{id}/documentos
GET /catalogs/programa/{id}/criterios
GET /catalogs/programa/{id}/rubros
GET /catalogs/programa/{id}/etapas
GET /catalogs/programa/{id}/modalidades
GET /carousel/slides            → slides activos para login page
GET /convocatorias/publicas     → convocatorias agrupadas {abiertas, proximas, cerradas} para la landing (throttle 30/min, lista blanca, E37/E40)
GET /convocatorias/abiertas     → alias de /publicas (compatibilidad)
```

### Solicitante
```
GET  /solicitudes                          → mis solicitudes
POST /solicitudes                          → crear borrador
GET  /solicitudes/convocatorias-activas
GET  /solicitudes/{id}
POST /solicitudes/{id}/enviar              → borrador → enviada
POST /solicitudes/{id}/reenviar            → observada → enviada
POST /solicitudes/{id}/informe             → subir informe final (FormData: archivo PDF + resultados)
POST /solicitudes/{id}/documentos          → subir documento adjunto
DELETE /solicitudes/{id}/documentos/{doc}
PUT  /solicitudes/{id}/beneficiario        → actualizar datos bancarios (CLABE, cuenta, titular)
GET  /mis-notificaciones
POST /mis-notificaciones/{id}/leer
POST /mis-notificaciones/leer-todas
```

### Revisor (middleware: revisor)
```
GET  /revisor/stats
GET  /revisor/solicitudes/pendientes       → estados: enviada | observada
GET  /revisor/solicitudes/completadas
GET  /revisor/solicitudes/observadas
GET  /revisor/solicitudes/{id}
POST /revisor/solicitudes/{id}/aprobar     → enviada → en_evaluacion
POST /revisor/solicitudes/{id}/observar    → enviada → observada
POST /revisor/solicitudes/{id}/aprobar-informe
GET  /revisor/informes
PUT  /revisor/informes/{id}
```

### Evaluador (middleware: evaluador)
```
GET  /evaluador/stats
GET  /evaluador/asignaciones
GET  /evaluador/asignaciones/{id}
PUT  /evaluador/asignaciones/{id}/iniciar-evaluacion  → asignado → evaluando
POST /evaluador/asignaciones/{id}/dictamen             → evaluando → concluido
```

### Admin (middleware: admin)

**Dashboard:**
```
GET /admin/stats
GET /admin/activity
GET /admin/alerts
```

**Solicitudes:**
```
GET  /admin/solicitudes                    → ?search=&estado=&per_page=N
POST /admin/solicitudes/{id}/seguimiento   → ministracion → seguimiento
POST /admin/solicitudes/{id}/rechazar      → acepta motivo opcional
POST /admin/solicitudes/{id}/cancelar      → acepta motivo opcional
POST /admin/solicitudes/{id}/cerrar        → ministracion|seguimiento → cerrada
POST /admin/solicitudes/{id}/generar-convenio
GET  /admin/reportes/excel
```

**CRUD completo:**
```
/admin/programas              + nested: /campos /documentos /rubros /etapas /modalidades /criterios
/admin/convocatorias
/admin/usuarios                → ?search=&per_page=N
/admin/convenios
/admin/ministraciones
/admin/informes
/admin/instituciones
/admin/lista-negra
/admin/notificaciones          → solo index y show
/admin/carousel                → CRUD slides del carrusel de login
```

**Gestión de accesos:**
```
GET  /admin/solicitudes-acceso
POST /admin/solicitudes-acceso/{id}/aprobar
POST /admin/solicitudes-acceso/{id}/rechazar
GET  /admin/reset-requests
POST /admin/reset-requests/{id}/aprobar
POST /admin/reset-requests/{id}/rechazar
```

**Asignación de evaluadores:**
```
POST   /admin/asignaciones-evaluador       → { solicitud_id, evaluador_id, fecha_limite }
DELETE /admin/asignaciones-evaluador/{id}
```

**Documentos:**
```
GET /documentos/dictamen/{id}
GET /documentos/convenio/{solicitud_id}
```

---

## Seguridad Implementada

| Área | Estado | Mecanismo |
|------|--------|-----------|
| Brute force login | ✅ | `AuthLoginRateLimitMiddleware` — 5 intentos/min |
| File upload seguro | ✅ | `ValidatesBinaryMimeTypes` trait — valida MIME real con `finfo_file()` |
| SQL injection | ✅ | Eloquent ORM, sin raw queries |
| XSS | ✅ | React escapa HTML por defecto |
| CSRF | ✅ | JWT stateless (sin cookies) |
| Code quality | ✅ | Pre-commit hooks: ESLint (frontend) + Laravel Pint (backend) |
| Middleware capas | ✅ | `ApiGatewayMiddleware` + `CircuitBreakerMiddleware` + `RateLimitMiddleware` global |
| Security headers | ✅ | `SecurityHeadersMiddleware` — X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS (HTTPS only), CSP `default-src 'none'`. **No incluye `X-XSS-Protection`** — ver fila más abajo |
| CSP sin comodines | ✅ | `src/lib/csp.ts` (desde el 24/09/2026; antes `next.config.ts`) — orígenes explícitos en `img-src`/`connect-src`. **Nunca usar `*.dominio`**: lo levanta el pentest (hallazgo 7, ago-2026) |
| CSP con nonce (sin `unsafe-inline` en scripts) | ✅ | `src/proxy.ts` genera un nonce por petición; Next etiqueta sus scripts y `layout.tsx` el suyo. `sw.js` tiene su propia CSP en `next.config.ts` (un SW obedece la CSP de su archivo, E44). `style-src` sigue con `'unsafe-inline'` |
| Documentos privados | ✅ | Disco `local` + descarga autenticada `ArchivoSolicitudController` (E44). Nada de usuarios en `/storage/` salvo banners y carrusel (públicos a propósito) |
| Sesión: cierre real e invalidación | ✅ | `cerrarSesion()` llama `/auth/logout`; cambiar contraseña invalida JWT anteriores (`password_changed_at`); cuentas inactivas rechazadas en login, 2FA y cada petición (E44) |
| API sin sesiones ni cookies JS | ✅ | Grupo `web` sin `StartSession`/`PreventRequestForgery` en `bootstrap/app.php`. No se emite `XSRF-TOKEN` ni `comecyt-session` (hallazgo 4, ago-2026) |
| Lista blanca de Host | ✅ | Regla `HostAllowList` en `public/web.config` — cualquier `Host` no autorizado recibe 404 vacío (hallazgo 5, ago-2026) |
| Certificado RDP | ✅ | Listener 3389 con cert `CN=10.250.36.241` (SAN con la IP) + NLA + cifrado alto (hallazgo 3, ago-2026) |
| Sin divulgación de tecnología | ✅ | No se emiten `Server` ni `X-Powered-By`: `expose_php=Off` (php.ini), `removeServerHeader` + `<remove name="X-Powered-By">` (web.config), `poweredByHeader:false` (next.config.ts) |
| `X-XSS-Protection` retirada | ✅ | Retirada a propósito el 13/08/2026 (`SecurityHeadersMiddleware.php`). Cabecera obsoleta: Chrome eliminó el XSS Auditor, Firefox nunca la implementó, y OWASP recomienda no enviarla —`1; mode=block` habilitó fugas entre orígenes (XS-Leaks). La protección real la da la CSP. **No volver a agregarla**, aunque un escáner la pida: ver `Desktop\ADEM\_v3_agosto20\LEEME.md` §25/08/2026 |
| Encuadre de `/storage/*` | ✅ | Excepción `CspStorage` + `XfoStorage` en `public/web.config`: los adjuntos salen con `X-Frame-Options: SAMEORIGIN` y `frame-ancestors 'self'` para que funcione la vista previa en iframe; el resto del sitio sigue con `DENY` / `'none'`. **Las `outboundRules` alcanzan también a los archivos estáticos** — tenerlo presente al agregar cualquier cabecera nueva |
| `Cross-Origin-Resource-Policy` | ✅ | `same-origin` en tres capas: `SecurityHeadersMiddleware` (API), `next.config.ts` (front) y regla `CorpSiFalta` en `public/web.config` (respuestas que genera IIS). **Incluye `/storage/*`** desde el 23/09/2026 (antes excluido hasta poder probar con un archivo real; verificado con las imágenes reales del carrusel). Observación de ADEM del 25/08/2026, fuera de la matriz |
| Rate limiting endpoints públicos | ✅ | `throttle:3,1` en `forgot-password`, `throttle:3,5` en `solicitar-acceso` |
| Notificaciones — acceso propio | ✅ | `show()` en `NotificacionLogController` verifica `user_id === auth user id` |
| Eliminación de usuarios | ✅ | `UserController::destroy()` bloquea auto-eliminación y eliminación del último admin |
| JWT en HttpOnly cookie | ✅ | `AuthController::respondWithToken()` emite cookie `comecyt_auth` (HttpOnly; `Secure` y `SameSite` salen de `COOKIE_SECURE` y `COOKIE_SAME_SITE`). **Desde el 23/09/2026 el `.env` tiene `COOKIE_SECURE=true` y `COOKIE_SAME_SITE=Strict`** (verificado con un JWT real). `ReadJwtFromCookieMiddleware` lo inyecta como Bearer. `api.ts` usa `withCredentials: true`. Frontend ya no usa `localStorage`. |
| Bloqueo de cuenta | ✅ | `AuthLoginRateLimitMiddleware` — 2 capas: IP (5/min) + email (10 intentos → 15 min lockout). Progresivo. |
| Acceso por IP interna y por dominio | ✅ | Un solo build sirve ambos: `NEXT_PUBLIC_API_URL=/api` (relativa) y sin `NEXT_PUBLIC_REVERB_*` (`echo.ts` usa el origen de la página). `serverFetch` usa `API_INTERNAL_URL` del entorno NSSM de `comecyt-web`. HTTP a la IP redirige a `https://10.250.36.241`; el dominio, a sí mismo. Ver E22 (11/09/2026). |
| Balanceador del dominio | ✅ | `web.config` no redirige lo que llega del ELB con `X-Forwarded-Proto=https` desde 100.64.0.0/10; `TRUSTED_PROXIES=127.0.0.1,100.64.0.0/10` para que Laravel vea la IP real del cliente (rate limit). **Una variable por condición** en esas reglas: ver E22 |
| Cierre automático convocatorias | ✅ | Comando `convocatorias:close-expired` + scheduler horario en `routes/console.php` |

---

## Checklist de Producción

```bash
# 1. Ajustar .env en el servidor:
APP_ENV=production
APP_DEBUG=false
DB_CONNECTION=pgsql
MAIL_MAILER=smtp   # + credenciales SMTP reales
NEXT_PUBLIC_APP_URL=https://tudominio.mx

# 2. Script de deploy (migrate, cache, crontab, permisos):
bash apps/api/deploy.sh

# 3. Verificar que todo esté correcto:
php artisan app:deploy-check

# 4. Supervisor para scheduler y queue workers:
sudo cp apps/api/resources/deploy/comecyt-scheduler.conf /etc/supervisor/conf.d/
sudo cp apps/api/resources/deploy/comecyt-queue.conf     /etc/supervisor/conf.d/
sudo supervisorctl reread && sudo supervisorctl update

# 5. SSL:
sudo certbot --nginx -d tudominio.mx
```

---

## Pendiente (Deuda Técnica Aceptada)

> Estado verificado en vivo y ordenado por prioridad al **11/09/2026**: `docs/ESTADO_ACTUAL.md`
> (secciones "Revisión general del 11/09/2026" y "Pendientes"). Esta tabla es el resumen para desarrollo.

| Ítem | Impacto | Solución |
|------|---------|---------|
| ~~**SMTP real de producción**~~ | ✅ **Resuelto 23/09/2026 (tarde)** | Infraestructura quitó el autenticador (MFA) de la cuenta de aplicativo y le asignó licencia Exchange Online. `smtp.office365.com:587` + STARTTLS autentica y envía; `MAIL_MAILER=smtp` activo y probado desde Laravel (ver E38) |
| **2FA del administrador desactivado** | Alto | Quedó apagado el 14/09 por falta de SMTP. Con el correo ya funcionando, reactivarlo **con el usuario presente** (riesgo de dejar al admin fuera si algo falla). Revisar también el flujo de restablecimiento de contraseña por correo de punta a punta |
| ~~`Cross-Origin-Resource-Policy` en `/storage/*`~~ | ✅ Resuelto 23/09/2026 | Activado tras confirmar con las imágenes reales del carrusel que `/storage/*` la servía sin esta cabecera. Verificado con `curl.exe` por IP y por dominio |
| ~~CSP con `script-src 'unsafe-inline'`~~ | ✅ Resuelto 24/09/2026 | Nonce por petición (E44). Queda `style-src 'unsafe-inline'` (React/Framer escriben estilos en línea; riesgo bajo) |
| **Licencia de Windows Server (Evaluation)** | **Crítico, pero con margen** | Verificado el 21/09/2026 (`slmgr /dlv`): alguien hizo `rearm` entre el 15/09 y hoy — quedan **180 días** de gracia y **3 rearmes**. Sigue siendo Evaluation, no Standard: la solución definitiva (`DISM /online /Set-Edition:ServerStandard /ProductKey:<clave> /AcceptEula`) sigue pendiente, solo que ya no es urgente esta semana |
| **Cuentas de prueba en producción** | **Crítico** | Las 4 cuentas de "Usuarios de Prueba" existen en `comecyt_prod` y son las únicas; contraseñas rotadas el 14/09/2026. **21/09/2026:** se cerró la única solicitud de acceso pendiente (ver E30) y quedó vinculada a una cuenta ya creada a mano — sigue sin existir un flujo real de altas más allá de las 4 de prueba. Crear cuentas reales y cambiar la contraseña o desactivar estas **antes** de abrir el sistema a más usuarios |
| `comecyt:backup-db` falla cada noche | Alto | `BackupDatabase.php` arma `pg_dump ... \| gzip -9 > archivo` y en Windows ninguno está en el PATH (`'pg_dump' is not recognized`). El respaldo real lo hace la tarea `COMECYT-Backup-Diario` (`backup.ps1`, con `C:\pgsql\bin\pg_dump.exe -Fc`), que sí funciona. Corregir el comando o quitarlo de `routes/console.php` |
| Respaldos sin copia fuera del servidor | Alto | Todos los dumps están en `F:\Desarrollo Tecnologico\backups\`. Si se pierde el servidor, se pierden los respaldos |
| Windows Update detenido | Alto | Servicio `wuauserv` detenido; último parche el 27/03/2026; 3 pendientes (incluida la acumulativa 2026-09). Aplicar en ventana junto con la licencia |
| ~~Permisos del `.env`~~ | ✅ Resuelto 24/09/2026 | Solo SYSTEM, Administradores y lectura para `IIS APPPOOL\comecyt` (E44) |
| Endurecimiento de red (agosto) | Bajo (parcial) | **24/09/2026:** firma SMB y cierre de 5357/2179/135 aplicados (E44). Falta restringir **RDP (3389) y WinRM (5985) por IP** — requiere el rango de VPN confirmado por infraestructura; con un rango equivocado el servidor queda inaccesible |
| Confirmaciones de infraestructura sobre el balanceador | Alto | Rango de IPs de origen, HTTP→HTTPS en el balanceador, health check, límite de 50 MB, timeouts. Correo listo en `Desktop\ADEM\_v4_dominio_sep11\`. Ver `docs/DOMINIO_BALANCEADOR.md` §8 |
| ~~`serverFetch` falla con certificado autofirmado~~ | ✅ Resuelto (verificado 24/09/2026) | `NODE_EXTRA_CA_CERTS` en NSSM ya lo resolvía; ahora además reenvía la IP real (E44). Texto original: | **Previo al dominio, detectado el 11/09/2026.** Los Server Components llaman a `https://10.250.36.241/api` y Node rechaza el certificado (`DEPTH_ZERO_SELF_SIGNED_CERT`); el `catch` lo oculta y las páginas renderizadas en servidor salen con listas vacías. Opciones: `NODE_EXTRA_CA_CERTS` con el certificado `BBC4F9F9…` en el entorno NSSM. **Ojo:** al funcionar, todas esas llamadas llegan a Laravel desde la IP del servidor, y el rate limit por IP las contaría juntas |
| ~~C:\comecyt limpieza~~ | ✅ Resuelto 23/09/2026 | Tarea rota `COMECYT-LimpiarDirectorioViejo` eliminada; el directorio lo borró el usuario a mano (el sandbox de Claude Code bloqueaba hacerlo desde ahí) |
| Página dedicada `/solicitante/informes` | Bajo | El upload está inline en detalle de solicitud |
| ~~Imágenes del carrusel en producción~~ | ✅ Resuelto 23/09/2026 | Los 4 slides tienen ya imágenes reales subidas vía `/admin/carrusel`, confirmado en la base de datos |
| Avisos de `app:deploy-check` | Bajo | Config y rutas sin caché: cachearlas obliga a correr `config:cache` tras cada cambio de `.env` (E18). El aviso de "crontab" es falso positivo en Windows, porque lo cubre `comecyt-scheduler`. El de permisos del `.env` está en su fila |
| Otros menores | Bajo | Disco C: con 6.8 GB libres. `TSA_URL` vacío (sin sello NOM-151). `SENTRY_LARAVEL_DSN` vacío (opcional) |

---

## Errores Documentados (No Repetir)

### E1 — apiResource con plurales españoles [resuelto]
**Síntoma:** Controller no recibe el modelo (siempre null), update() retorna false, HTTP 200 con body vacío.
**Causa:** Laravel genera `{ministracione}` en lugar de `{ministracion}` para recursos que terminan en `-ones`.
**Fix:** `.parameters(['ministraciones' => 'ministracion'])` en todas las rutas apiResource con nombres irregulares.

### E2 — Cache + Eloquent Models [resuelto]
**Síntoma:** `TypeError: count() argument must be Countable|array, __PHP_Incomplete_Class given`.
**Causa:** Laravel serializa modelos Eloquent en cache; al deserializar el autoloader no tiene el contexto correcto.
**Fix:** Siempre `.toArray()` antes de `Cache::remember()`.

### E3 — Storage disk implícito [resuelto]
**Síntoma:** Archivo guardado correctamente pero URL retorna 403 Forbidden.
**Causa:** `$file->storeAs()` sin disco usa `'local'` (privado), pero `Storage::url()` lee de `'public'`.
**Fix:** Siempre `Storage::disk('public')->putFileAs()` y `Storage::disk('public')->url()`.

### E4 — EvaluadorController duplicado [resuelto 14-04-2026]
**Síntoma:** Estado de asignación inconsistente — `asignar()` ponía `'notificado'` pero `startEvaluation()` verificaba `'asignado'`, rompiendo el flujo.
**Causa:** Existían dos controllers: `App\Http\Controllers\EvaluadorController` (raíz, versión antigua) y `App\Http\Controllers\Evaluaciones\EvaluadorController` (versión completa). Las rutas admin usaban el antiguo para `asignar/desasignar` y el evaluador usaba el nuevo para el resto.
**Fix:** Métodos `asignar()` y `desasignar()` migrados al controller de Evaluaciones. Estado inicial cambiado a `'asignado'` (coherente con `startEvaluation`). Controller raíz eliminado.

### E5 — UsuariosPruebaSeeder en producción [resuelto 14-04-2026]
**Síntoma:** Potencial creación de usuarios con la contraseña pública del seeder en producción.
**Causa:** `DatabaseSeeder` llamaba `UsuariosPruebaSeeder` incondicionalmente.
**Fix:** Guard con `app()->isLocal() || app()->environment('testing')`. En producción el seeder se omite.

### E6 — Middleware en constructores (Laravel 11) [resuelto]
**Síntoma:** `Call to undefined method middleware()` — error 500 en controllers admin.
**Causa:** Laravel 11 eliminó `$this->middleware()` en constructores.
**Fix:** Aplicar middleware en grupos de rutas (`'middleware' => 'admin'`), nunca en el constructor.

### E7 — Hydration mismatch (Next.js SSR + cookies)
**Síntoma:** "Hydration failed because the initial UI does not match what was rendered on the server".
**Causa:** `useState(cookieValue)` en servidor lee vacío; en cliente lee la cookie → valores distintos.
**Fix:** `useState('')` + `useEffect(() => { setValue(Cookies.get('key') || '') }, [])`.
**Mismo caso (14/09/2026):** `useReducedMotion()` de Framer Motion da `null` en el servidor. Usarlo directo
en el render cambió `aria-live`, íconos y variantes del carrusel del login. Aplicarlo solo tras montar
(`mounted && Boolean(prefersReducedMotion)`), como en `login-carousel.tsx`.

### E8 — Alias de ruta evaluador eliminado erróneamente
**Síntoma:** Build roto — `asignaciones/page.tsx` importaba `../evaluaciones/page` que ya no existía.
**Causa:** Se eliminó `evaluaciones/` asumiendo que era el alias, sin leer el contenido real.
**Fix:** Siempre `cat archivo.tsx` antes de borrar. El archivo `evaluaciones/page.tsx` es ahora alias de `asignaciones/page.tsx`.
**Lección:** Nunca borrar archivos basándose en descripciones de terceros sin verificar el contenido real.

### E9 — `route('password.reset')` no existe en Laravel API-only
**Síntoma:** `adminApprove()` siempre fallaba con "No se pudo enviar el enlace".
**Causa:** Laravel API-only no registra rutas web, `route('password.reset')` lanza excepción capturada silenciosamente por el broker.
**Fix:** Construir URL manualmente: `env('NEXT_PUBLIC_APP_URL', 'http://localhost:3000') . '/reset-password?token=' . $token`.

### E10 — `User::evaluador()` apunta a modelo eliminado [resuelto 14-04-2026]
**Síntoma:** `evaluadorStats()` lanzaba `Class "App\Models\Evaluador" not found` en runtime.
**Causa:** `User.php` tenía `hasOne(Evaluador::class)` pero `Evaluador.php` fue eliminado en sesión anterior. `DashboardController::evaluadorStats()` llamaba `$user->evaluador->id`.
**Fix:** Eliminado `evaluador()` de `User.php`. `evaluadorStats()` ahora usa `$user->id` directamente contra `AsignacionEvaluador`.

### E11 — Estado `'en_revision'` inexistente en `adminStats()` [resuelto 14-04-2026]
**Síntoma:** El stat "Solicitudes en Revisión" contaba menos de lo real.
**Causa:** `whereIn('estado', ['enviada', 'en_revision', 'observada'])` — `'en_revision'` no es un estado válido del sistema.
**Fix:** Removido `'en_revision'` del whereIn. Los estados válidos para "en revisión" son `'enviada'` y `'observada'`.

### E12 — `CarouselSlideSeeder` no estaba conectado a `DatabaseSeeder` [resuelto 14-04-2026]
**Síntoma:** `php artisan migrate --seed` no poblaba la tabla `carousel_slides`.
**Causa:** El seeder existía pero nunca fue llamado desde `DatabaseSeeder`.
**Fix:** Agregado `$this->call(CarouselSlideSeeder::class)` al final de `DatabaseSeeder::run()`.

### E13 — Propiedad duplicada `tipo_programa` en `types/api.ts` [resuelto 14-04-2026]
**Síntoma:** Dos propiedades en `Convocatoria`: `tipoPrograma?` y `tipo_programa?` con el mismo tipo.
**Causa:** Artefacto de migración legacy — se agregó `tipo_programa` como alias snake_case sin eliminar el camelCase.
**Fix:** Eliminada `tipo_programa?: TipoPrograma`. Usar siempre `tipoPrograma` en TypeScript (la API retorna snake_case pero el objeto cargado via `with()` se accede como `tipoPrograma` por convenio).

### E14 — CORS + `withCredentials` — error silencioso
**Síntoma:** Cookie `comecyt_auth` no se envía a pesar de `withCredentials: true` en axios.
**Causa:** Si `config/cors.php` tiene `supports_credentials: false` o `allowed_origins: ['*']`, el navegador bloquea las credenciales silenciosamente.
**Fix:** `supports_credentials: true` + `allowed_origins` lista explícita (nunca `'*'` con credentials). Ambos deben estar activos.

### E15 — Scheduler sin cron en producción
**Síntoma:** `convocatorias:close-expired` nunca se ejecuta en producción.
**Causa:** Laravel Scheduler requiere que el cron del servidor llame `php artisan schedule:run` cada minuto, o que `php artisan schedule:work` corra como daemon.
**Fix:** Agregar al crontab del servidor: `* * * * * cd /path/to/api && php artisan schedule:run >> /dev/null 2>&1`

### E16 — Paginación: `data` cambia de array a objeto paginado
**Síntoma:** `items.map is not a function` al agregar `?per_page=N` a un endpoint que antes devolvía array.
**Causa:** Sin paginación la API retorna `[...]`, con paginación retorna `{ data: [...], total, ... }`. El componente espera array.
**Fix:** Siempre: `const items = Array.isArray(res.data) ? res.data : (res.data?.data ?? [])`. Los metadatos de paginación viven en `res.data.current_page`, `res.data.last_page`, etc.

### E17 — Ruta con espacios rompe NSSM + Node.js [resuelto 30-06-2026]
**Síntoma:** Servicio `comecyt-web` se inicia pero muere inmediatamente: `Error: Cannot find module 'F:\Desarrollo'`.
**Causa:** `F:\Desarrollo Tecnologico\` contiene un espacio. NSSM pasa el `AppParameters` sin comillas adicionales a Node.js, que interpreta el espacio como separador de argumentos y recibe `F:\Desarrollo` como nombre de módulo.
**Fix:** Crear junction point sin espacios: `New-Item -ItemType Junction -Path "F:\comecyt" -Target "F:\Desarrollo Tecnologico"`. Apuntar NSSM a `F:\comecyt\...` (sin espacios). IIS puede usar la ruta real con espacios.

### E19 — Quitar sesiones del grupo `web` usando el nombre deprecado del middleware CSRF [resuelto 13-08-2026]
**Síntoma:** HTTP 500 en todas las rutas web (`/`, `/index.php`, `/up`) con
`RuntimeException: Session store not set on request`.
**Causa:** Para dejar de emitir la cookie `XSRF-TOKEN` (hallazgo 4 del pentest) se retiró
`StartSession` del grupo `web` junto con `ValidateCsrfToken::class`. Pero en Laravel 11 la clase que
realmente integra el grupo es **`PreventRequestForgery`**; `ValidateCsrfToken` y `VerifyCsrfToken`
son subclases deprecadas. Removerlas por el nombre viejo **no remueve nada**, así que el middleware
CSRF quedó activo pidiendo una sesión que ya no se iniciaba.
**Fix:** Los tres deben salir juntos y con el nombre correcto:
```php
$middleware->web(remove: [
    StartSession::class,
    ShareErrorsFromSession::class,
    PreventRequestForgery::class,   // NO ValidateCsrfToken ni VerifyCsrfToken
]);
```
**Lección:** Antes de pasar una clase a `remove:`, confirmar que es exactamente la que aparece en el
grupo por defecto (`vendor/laravel/framework/src/Illuminate/Foundation/Configuration/Middleware.php`).
`remove:` con una clase que no está en el grupo falla en silencio.

### E20 — `next build` falla con EBUSY si el servicio está corriendo [resuelto 13-08-2026]
**Síntoma:** `Error: EBUSY: resource busy or locked, rmdir '...\.next\standalone'`, y `.next` queda
vaciado a medias (la app sigue en pie solo porque el proceso Node ya tiene sus archivos abiertos).
**Causa:** El servicio `comecyt-web` ejecuta `node .next\standalone\server.js`, así que mantiene esa
carpeta bloqueada mientras Next intenta borrarla para regenerarla.
**Fix:** Detener el servicio **antes** de compilar, y recordar que `next build` no copia
`static` ni `public` dentro de `standalone` — hay que copiarlos a mano:
```powershell
Stop-Service comecyt-web -Force
npm run build
Copy-Item ".next\static\*" ".next\standalone\.next\static\" -Recurse -Force
Copy-Item "public\*"       ".next\standalone\public\"       -Recurse -Force
Start-Service comecyt-web
```
**Lección:** Respaldar `.next` antes de compilar. Si el build falla a medias, el respaldo es la única
vía rápida de volver a un frontend servible.

### E18 — `config:cache` / `route:cache` guardan rutas absolutas [resuelto 30-06-2026]
**Síntoma:** Tras mover el proyecto de `C:\comecyt` a `F:\Desarrollo Tecnologico`, todos los endpoints `/api/*` retornaban 404 aunque PHP ejecutaba correctamente.
**Causa:** Los archivos `bootstrap/cache/config.php` y `bootstrap/cache/routes-*.php` contienen rutas absolutas compiladas en el build anterior (`C:\comecyt\...`). Laravel intentaba cargar clases desde la ruta vieja que ya no existía.
**Fix:** Limpiar y regenerar en la nueva ruta:
```powershell
Set-Location "F:\Desarrollo Tecnologico\apps\api"
C:\php\php.exe artisan config:clear; C:\php\php.exe artisan cache:clear; C:\php\php.exe artisan route:clear
C:\php\php.exe artisan config:cache; C:\php\php.exe artisan route:cache
```
**Lección:** Siempre limpiar y regenerar el caché de Laravel al cambiar la ruta de instalación.

### E21 — `public/storage` era un directorio real, no un enlace [resuelto 27-08-2026]
**Síntoma:** Ninguno visible. Cualquier URL `/storage/...` devolvía **307 a `/login`** en vez del
archivo — se veía como un problema de autenticación, no de archivos. No se notó durante meses porque
`storage/app/public` estaba vacío: no había ni un solo documento subido.
**Causa:** `apps\api\public\storage` existía como **carpeta real vacía**, no como enlace a
`storage\app\public`. Nunca se corrió `php artisan storage:link` en este servidor, o el enlace se
perdió al mover el proyecto de `C:\comecyt` a `F:\Desarrollo Tecnologico` (mismo origen que el E18:
copiar un árbol de directorios no preserva los reparse points salvo que se pida explícitamente).
Como la regla `StaticFiles` de `web.config` exige `{REQUEST_FILENAME}` `IsFile` y el archivo no
estaba ahí, la petición caía hasta la regla `NextJsProxy` y contestaba el frontend.
**Fix:** Borrar la carpeta vacía y crear el enlace:
```powershell
Remove-Item "F:\Desarrollo Tecnologico\apps\api\public\storage" -Force   # verificar que este vacia
Set-Location "F:\Desarrollo Tecnologico\apps\api"
C:\php\php.exe artisan storage:link
```
En Windows, Laravel crea un **junction**, no un symlink POSIX. Se verifica así:
```powershell
Get-Item "...\apps\api\public\storage" -Force | Select-Object Attributes, LinkType, Target
# Correcto:   Attributes: Directory, ReparsePoint / LinkType: Junction / Target: ...\storage\app\public
# Incorrecto: Attributes: Directory              / LinkType: (vacio)  / Target: (vacio)
```
**Lección:** Un 307 a `/login` en una ruta que debería servir un archivo estático **no es un problema
de sesión**: es que IIS no encontró el archivo y la petición llegó al proxy de Next. Comprobar el
enlace antes de buscar en el código de autenticación. Y al mover o restaurar el proyecto, verificar
que `public/storage` siga siendo un `ReparsePoint`.

### E22 — El dominio redirigía a la IP detrás del balanceador [resuelto 11-09-2026]
Documento completo (arquitectura, reversión, qué debe confirmar infraestructura): `docs/DOMINIO_BALANCEADOR.md`.
Verificación: `C:\Users\Administrator\Desktop\ADEM\_herramientas\VerificarDominio.ps1` (exit 0 = todo bien).
**Síntoma:** Infraestructura publicó `https://sidecyt-comecyt.edomex.gob.mx` y al entrar el navegador
terminaba en `https://10.250.36.241/`.
**Causa:** El DNS apunta a un balanceador (10.200.41.106, `Server: elb`) que termina el TLS con
`*.edomex.gob.mx` y reenvía a IIS **por HTTP al puerto 80** desde `100.127.0.48`, con
`X-Forwarded-Proto: https`. IIS veía `{HTTPS}=OFF` y `HttpsRedirect` mandaba a la IP fija.
**Fix:**
- **`web.config`:** no se redirige lo que llega del ELB con `X-Forwarded-Proto=https`. El dominio por
  HTTP directo redirige al dominio. Hay HSTS también en las respuestas propias de IIS vía ELB y
  `<caching enabled="false">`.
- **`.env` de Laravel:** `APP_URL` y `NEXT_PUBLIC_APP_URL` al dominio, el dominio en CORS y
  `TRUSTED_PROXIES=127.0.0.1,100.64.0.0/10`.
- **Front:** URL de API relativa (ver fila "Acceso por IP interna y por dominio"), recompilado.
- **Log de IIS:** campos `X-Forwarded-*` para ver la IP real del cliente.

**Trampa (bucle infinito):** la primera versión usaba una sola condición
`{HTTP_X_FORWARDED_PROTO}|{REMOTE_ADDR}`. La caché interna de URL Rewrite (7.2.1993) guardaba el
resultado variando por la cabecera pero **no por la IP**: **una** petición por HTTP directo a la IP con
`Host` del dominio y `X-Forwarded-Proto: https` dejaba en caché el 302, y todos los usuarios del ELB
recibían ese 302 hacia la misma URL. Apagar la caché de kernel de HTTP.sys **no** lo resolvía.
Se corrigió con **una variable por condición**, partiendo cada redirección en dos reglas
(`...FueraDelElb` y `...ElbSinTls`).
**Cómo probarlo:**
```powershell
$d='sidecyt-comecyt.edomex.gob.mx'; $p="/api/prueba$(Get-Random)"
curl.exe -sk -o NUL -w "%{http_code}`n" -H "Host: $d" -H 'X-Forwarded-Proto: https' "http://10.250.36.241$p"  # 302
curl.exe -sk -o NUL -w "%{http_code}`n" "https://$d$p"   # debe ser 404, NUNCA 302
```
**Lección:** en reglas que dependen del origen de la petición, nunca concatenar variables en una
condición. Si infraestructura cambia el rango de origen del ELB, cambiar `web.config` y
`TRUSTED_PROXIES` juntos. Respaldos del día: `backups\20260911-dominio-elb\` y
`apps\web\.next.bak-20260911-predominio`.

### E23 — `404 Not Found / ELB` en el dominio: no es del servidor [abierto 14-09-2026]
Documento completo: `docs/DOMINIO_BALANCEADOR.md` §12.
**Síntoma:** al publicar el sitio hacia Internet (IP pública `187.189.139.176` / `201.131.40.176`,
EIP `10.200.41.131`), `https://sidecyt-comecyt.edomex.gob.mx` muestra una página **`404 Not Found`
con la palabra `ELB`** debajo. En **todas** las rutas por igual.
**Causa:** la publicación movió el dominio a **otro balanceador**. El DNS resolvía a `10.200.41.106`
el 11/09 y desde el 14/09 resuelve a **`10.200.41.131`**, un VIP **sin la ruta al servidor
registrada**. El 404 lo genera el balanceador antes de entregar la petición: en el log de IIS de ese
día **no hay una sola petición** del rango `100.64.0.0/10`.
**Fix:** ninguno en el servidor. Lo registra infraestructura. **Correo enviado el 14/09/2026**
(`Desktop\ADEM\_v5_publicacion_sep14\LEEME.md`), en espera de respuesta.
**Verificado en las cuatro capas, no solo en el log del sitio:** lo que HTTP.sys rechaza por `Host`
desconocido **no** entra en `W3SVC2`, va a `C:\Windows\System32\LogFiles\HTTPERR`. Ahí tampoco hay
nada del balanceador, así que no es `HostAllowList`. Revisar **los dos logs** antes de concluir.
**Cómo distinguirlo en 10 segundos** — un 404 de `HostAllowList` viene de IIS y no trae esta cabecera:
```powershell
$d = 'sidecyt-comecyt.edomex.gob.mx'
curl.exe -sk -D - -o NUL "https://$d/" | Select-String 'X-ROUTER-STATUS'
# "MISS : cant find any router from cache or remote" -> falta la ruta en el ELB
foreach ($vip in '10.200.41.131','10.200.41.106') {
    curl.exe -sk -o NUL -w "$vip -> %{http_code}`n" --resolve "${d}:443:$vip" "https://$d/"
}
# 10.200.41.131 -> 404   (sin ruta)      10.200.41.106 -> 307   (misma config del servidor, funciona)
```
`VerificarDominio.ps1` ya lo comprueba primero: la prueba **"El balanceador tiene ruta hacia el
servidor"**. Si esa falla, las 9 siguientes fallan por arrastre y **no hay que tocar el servidor**.
**Ojo al habilitarla:** si el VIP nuevo se conecta desde un rango distinto a `100.64.0.0/10`, hay que
cambiar **juntos** las 5 condiciones de `web.config` y `TRUSTED_PROXIES` (E22), o habrá bucle.
**Lección:** antes de tocar configuración por un 404 en el dominio, confirmar **que la petición llega
al servidor**. Una ruta única por cada VIP y el log de IIS lo resuelven sin ambigüedad.
**Cerrado el 14/09/2026 por la tarde:** infraestructura corrigió el balanceador; el dominio funciona desde
Internet (DNS dividido: interno → `.106`, público → `187.189.139.176`/`201.131.40.176`) y el tráfico
público entra desde `100.127.1.42`, dentro de `100.64.0.0/10`, así que no hubo que tocar `web.config`.

### E24 — El pie del login decía "Estado de MÃ©xico" [resuelto 14-09-2026]
**Síntoma:** en el login, "© 2026 COMECYT · Estado de MÃ©xico". También afectaba
`NEXT_PUBLIC_INSTITUTION_FULL_NAME` y `NEXT_PUBLIC_INSTITUTION_SYSTEM_TAGLINE`.
**Causa:** `apps/web/.env.local` quedó con **doble codificación** al editarlo el 11/09/2026 (UTF-8 leído
como Windows-1252 y vuelto a guardar como UTF-8). Los `NEXT_PUBLIC_*` se hornean en el build, así que el
texto roto quedó en el JavaScript servido.
**Fix:** corregir las líneas en UTF-8 y recompilar. Respaldo: `.env.local.bak-20260914-codificacion`.
**Lección:** no editar `.env*` con `Set-Content`/`Out-File` de PowerShell 5.1 sin `-Encoding utf8`
(ni así: agrega BOM). Usar un editor o la herramienta de edición, y buscar `Ã` después de cualquier cambio.

### E26 — El menú del panel NO se rediseña [14-09-2026, corrección del usuario]
En la primera pasada del rediseño se cambió el menú superior (mega-dropdown) de `AdminTopLayout.tsx` y
`RoleTopLayout.tsx` por un sidebar (`AppShell.tsx`). **El usuario lo rechazó:** "el menú debía permanecer
igual, solo rediseñar los paneles". Se restauraron ambos archivos **byte a byte** desde el commit base
`e993228` (`git restore --source=e993228 -- <archivos>`; no reconstruir a mano con PowerShell:
`Out-File -NoNewline` colapsa las líneas y `Out-File -Encoding utf8` mete BOM) y se borró `AppShell.tsx`.
**Regla:** el rediseño aplica al *contenido* de cada vista (encabezado, tarjetas, tablas, modales) y a las
páginas de auth; **el menú/nav, la barra superior y el pie de `AdminTopLayout`/`RoleTopLayout` no se
tocan.** Detalle en `docs/DISENO_UI.md` §5-7.
Dos trampas que sí quedaron de esa pasada (aplican a cualquier componente):
1. Un componente declarado **dentro** de otro (`const NavList = () => …` dentro de la función de
   `AppShell`) se re-crea en cada render y pierde estado — eslint lo marca
   (`react-hooks/static-components`). Sacarlo a nivel de módulo, con sus datos por prop.
2. Un `<label>` que envuelve visualmente un `<input>` sin `id`/`htmlFor` explícitos no cuenta como
   asociado para axe (regla `label`). En "Solicitar acceso" se resolvió con un wrapper (`FField`) que
   clona el hijo (`React.cloneElement`) para inyectarle el `id` recibido por prop.

### E27 — El widget de Reverb decía "Daemon no responde" con el daemon vivo [resuelto 14-09-2026]
**Síntoma:** en `/admin/dashboard`, "WebSockets (Reverb) · Daemon no responde · The requested address is
not valid in its context", aunque `comecyt-reverb` corría y `127.0.0.1:8080` tenía conexiones.
**Causa:** `ReverbStatusController` hacía `fsockopen(config('reverb.servers.reverb.host'))`, y ese valor
es la dirección de **bind** (`REVERB_SERVER_HOST`, default `0.0.0.0`). En Linux conectar a `0.0.0.0` cae a
localhost; en Windows falla con WSAEADDRNOTAVAIL. Nunca se vio en desarrollo (Linux/Mac).
**Fix:** si el host es `0.0.0.0`/`::`, el chequeo conecta a `127.0.0.1`. PHP puro: aplicó sin build ni
reinicio (`GET /api/admin/reverb/status` → `reachable: true`, 3 ms).
**Lección:** *bind address* ≠ *connect address*. Cualquier health-check que lea la config del servidor
debe traducir `0.0.0.0` a loopback antes de conectar.

### E28 — `getRealPath()` devuelve `false` en este IIS: la subida de archivos fallaba [resuelto 14-09-2026]
**Síntoma:** `POST /admin/carousel/upload` → 500 "Path must not be empty" (dentro de `putFileAs()` de Laravel)
y antes "Call to undefined method Illuminate\Validation\Validator::make()" (trait `ValidatesBinaryMimeTypes`).
**Causa:** con el app pool `ApplicationPoolIdentity` (sin perfil cargado), `realpath()` del archivo temporal
de PHP devuelve `false`; `putFileAs()` hace `fopen($file->getRealPath())` por dentro. El trait, además,
importaba la clase `Illuminate\Validation\Validator` en vez de la fachada, así que **toda** su ruta de error
terminaba en 500 — la subida de documentos de solicitudes lo hereda (nunca se había ejercitado: 0 solicitudes).
**Fix:** el trait usa `Illuminate\Support\Facades\Validator`; el controlador lee con
`file_get_contents($file->getPathname())` y escribe con `Storage::put()`. Probado de punta a punta (201 y la
imagen se sirve por `/storage/carousel/...`).
**Lección:** en Windows/IIS **nunca** `getRealPath()` sobre un `UploadedFile`; usar `getPathname()` y
`Storage::put()`/`writeStream()`. Cualquier otro upload del sistema que use `putFileAs()` o `store()` (que
también usa realpath) debe revisarse antes de que alguien suba su primer documento.

### E29 — "This page couldn't load" / `NotFoundError: The object can not be found here` en Safari [resuelto 15-09-2026]
**Síntoma:** en Safari 26 (macOS), al pulsar un enlace del menú (o cualquier navegación interna) la página
se rompía con la pantalla genérica de Next "This page couldn't load" y en consola
`NotFoundError: The object can not be found here` dos veces (React reintenta el commit una vez). En Chrome no pasaba.
**Causa:** `app/layout.tsx` imprime `#boot-splash` en el HTML del servidor **dentro del árbol de React**
(hijo directo de `<body>`), y `RouteChangeOverlay` lo quitaba con `splash.remove()`. Al navegar, Next.js
inserta un `<div hidden>` propio como hermano anterior del splash: React ejecuta
`body.insertBefore(divHidden, bootSplash)` con un nodo de referencia que ya no está en el DOM → excepción en
fase de commit, fuera de nuestro `ErrorBoundary` (lo atrapa el boundary raíz de Next). Reproducido con
Playwright **WebKit** (`repro-webkit3.mjs`, parcheando `Node.prototype.insertBefore` para registrar el
nodo que falla) — con Chromium no se reproducía.
**Fix:** el splash se **oculta** (`style.display='none'` + `aria-hidden`), nunca se quita. De paso:
`ThemeProvider` envolvía `children` en un `<span>` que desaparecía al montar → React **desmontaba y volvía a
montar toda la app** tras hidratar (peticiones iniciales duplicadas en el log de IIS); eliminado. Y ahora hay
`app/error.tsx` y `app/global-error.tsx` en español (botón "Volver a cargar", `digest` en consola).
**Lección:** un nodo que React hidrató es de React: se oculta, no se toca con `remove()`/`innerHTML`. Y para
errores "solo en Safari", reproducir con `playwright install webkit` + `addInitScript` que parchee las
operaciones del DOM: da el nodo exacto en un minuto; razonar sobre el stack minificado, no.

### Reglas de UI vigentes (14/09/2026, ver `docs/DISENO_UI.md` §6b)
Íconos de vidrio sin blur (`.icon-glass`, color por `color:`), cero emojis (íconos de lucide), `<select>`
global estilizado en `globals.css`, botones unificados con hover líquido (`Button` variantes `soft` /
`destructive` para ver-editar / eliminar), tablas con `components/ui/table.tsx`, tarjetas `.app-card` bento
suave, sin jerga técnica a la vista, **responsive móvil primero en todo**. El menú/nav no se rediseña, pero sí
se corrige (responsive). Pantalla de carga v3: splash en el HTML del servidor + bus de `lib/api.ts` para
peticiones que escriben + clics en enlaces.
**Todo formulario de crear/editar es un `StepFrame`** (`components/ui/step-frame.tsx`: pasos a la izquierda,
"Paso n de N", pregunta guía, aviso de contexto, Cancelar/Siguiente/Guardar; modal o `inline` para páginas
completas). Un formulario nuevo **no** se hace con `Dialog` + `Input` sueltos: se declara como `steps`, cada
uno con su `validate`. Los 16 existentes están listados en `docs/DISENO_UI.md` §6b. Los `Select` de base-ui
dentro de formularios probados en jsdom se cambian por `<select>` nativo (mismo dibujo por el estilo global).

### Carrusel del login — imágenes subidas desde el panel [14-09-2026]
`POST /admin/carousel/upload` (multipart `imagen`, JPG/PNG/WebP ≤ 8 MB, MIME real con finfo, nombre
aleatorio) guarda en `Storage::disk('public')` → `storage/app/public/carousel/` y devuelve la ruta
**relativa** `/storage/carousel/<hash>.<ext>`. Relativa a propósito: sirve igual por el dominio y por la
IP, y la CSP `img-src 'self'` la cubre. `imageUrlRules` acepta esa ruta además de las URLs http(s) del
allowlist. Depende del junction `public/storage` (E21). UI: zona de arrastrar/soltar en
`CarruselClient.tsx`; la URL externa sigue disponible como alternativa.

### E25 — Migración `institucion` → `empresa` (junio) dejó 3 referencias rotas [resuelto parcial 14-09-2026]
**Síntoma real:** una solicitud de acceso enviada no aparecía en `/admin/solicitudes-acceso` (institución en
blanco, buscador roto). Al buscar el mismo patrón aparecieron dos más, sin datos aún para dispararlas:
`GET /admin/ministraciones` habría lanzado `BadMethodCallException` en cuanto existiera una ministración
(`User` no tiene `institucion()`, solo `empresa()`), y los PDF de convenio/dictamen habrían mostrado la
institución vacía o fallado, porque `Solicitud::institucion()` sin FK explícito apuntaba a la columna
`institucion_id`, que la migración `2026_06_02_120000_rename_instituciones_to_empresas.php` renombró a
`empresa_id`.
**Causa:** `2026_06_02_140000_rename_institucion_nombre_in_solicitudes_acceso.php` y la migración anterior
renombraron columnas, pero el código que las usaba (frontend, plantilla de correo, relación Eloquent,
`with()` de otro controller) no se actualizó junto. Como el sistema tenía 0 solicitudes/ministraciones
reales, nadie lo notó hasta hoy.
**Fix:** `SolicitudesAccesoClient.tsx` y `nueva-solicitud-acceso.blade.php` usan `empresa_nombre`;
`MinistracionController::index()` carga `solicitud.user.empresa`; `Solicitud::institucion()` usa
`belongsTo(Empresa::class, 'empresa_id')` explícito (se conserva el nombre del método: lo consumen
`convenio.blade.php` y `dictamen.blade.php`).
**Pendiente:** no se hizo un barrido general de columnas renombradas fuera de este patrón. Si aparece un
campo en blanco o un endpoint que nunca se probó con datos reales, sospechar primero de una migración de
renombrado (`grep renameColumn` en `database/migrations/`) antes de otra causa.
**Lección:** una migración que renombra una columna es una búsqueda de texto completa pendiente, no una
tarea terminada. Los endpoints sin cobertura de datos reales (0 filas) no lanzan error en desarrollo ni en
CI — solo al usarse en producción.

### E30 — Aprobar acceso: 500 por correo duplicado y la solicitud nunca se cerraba [resuelto 21-09-2026]
**Síntoma:** en `/admin/solicitudes-acceso`, "Aprobar" sobre la solicitud de ABRIL FLORES CASTORENA daba
`500 Internal Server Error` en cada intento.
**Causa (dos bugs distintos, mismo endpoint):**
1. El 14/09/2026 alguien había dado de alta la cuenta **a mano** en `/admin/usuarios` con el mismo correo,
   pero la solicitud original quedó "pendiente" sin cerrarse. `RegistroAccesoController::aprobar()`
   siempre hacía `User::create()` sin comprobar si el correo ya existía →
   `SQLSTATE[23505]: duplicate key value violates unique constraint "users_email_unique"`.
2. Aunque el primer bug no hubiera existido, la solicitud **jamás se habría marcado como aprobada**:
   `SolicitudAcceso::$guarded` bloquea a propósito `estado`/`revisado_por`/`revisado_at` para que el
   endpoint público `store()` no los reciba por mass-assignment (SEV-1), pero `aprobar()`/`rechazar()`
   usaban `->update([...])` sobre esos mismos campos — Eloquent los descarta **en silencio** (no lanza
   excepción salvo `Model::preventSilentlyDiscardingAttributes()`, que este proyecto no activa). La
   respuesta decía "Solicitud aprobada" y la fila seguía en `estado='pendiente'` para siempre. Verificado
   contra la tabla real: **0 solicitudes de acceso se habían cerrado nunca**, ni aprobadas ni rechazadas.
**Fix:**
- `aprobar()` busca primero `User::where('email', ...)`; si ya existe, vincula la solicitud a esa cuenta
  sin duplicarla (y no reenvía el correo de "acceso aprobado" a alguien que ya usa el sistema).
- `aprobar()`/`rechazar()` usan `->forceFill([...])->save()` en vez de `->update([...])` para los campos
  guardados — bypassa la protección de mass-assignment solo para esta escritura interna y confiable del
  controlador; el guard sigue bloqueando cualquier intento desde `store()` con datos del público.
- Verificado de punta a punta contra la solicitud real (script que invoca `aprobar()` directamente con
  `Auth::loginUsingId()`, sin necesitar sesión de navegador): pasó de `estado=pendiente` (con 500) a
  `estado=aprobada`, cuenta vinculada, sin duplicar.
**Lección:** un `$guarded` pensado para bloquear al público también bloquea al propio controlador si usa
`update()`/`fill()` en vez de `forceFill()`. Antes de guardar un campo operativo (`estado`, `revisado_por`…)
revisar si el modelo lo protege, y si el propio flujo interno necesita escribirlo, usar `forceFill()` —
nunca quitar el guard, que sigue defendiendo contra mass-assignment desde el exterior.

### E31 — El mismo error de E30 bloqueaba TODO el ciclo de vida de `Solicitud` [resuelto 21-09-2026]
**Síntoma:** ninguno visible todavía — la tabla `solicitudes` tenía **0 filas** en producción (sistema
recién desplegado). Se encontró al auditar el mismo patrón de E30 en el modelo central del sistema.
**Causa:** `Solicitud::$guarded` protege a propósito `estado`, `etapa_estado`, `estado_informe`,
`notas_internas` y `folio` (SEV-1, mismo motivo que `SolicitudAcceso`), pero **14 llamadas** en 4
controllers usaban `->update([...])` directamente sobre esos campos, así que **ninguna transición de
estado del sistema habría persistido jamás**, aunque cada endpoint respondiera 200 con el mensaje de
éxito correcto:

| Controller | Método | Transición que nunca se guardaba |
|---|---|---|
| `SolicitudController` | `enviar()` | borrador → enviada |
| `SolicitudController` | `reenviar()` | observada → enviada |
| `RevisionController` | `approve()` | enviada/observada → en_evaluacion |
| `RevisionController` | `observe()` | enviada → observada |
| `RevisionController` | `approveInforme()` | estado_informe → aprobado, estado → cerrada |
| `EvaluadorController` | `saveDictamen()` (aprobado) | en_evaluacion → aprobada |
| `EvaluadorController` | `saveDictamen()` (rechazado) | en_evaluacion → rechazada |
| `EvaluadorController` | `asignar()` | aprobada → en_evaluacion |
| `SolicitudController` | `iniciarSeguimiento()` | ministracion → seguimiento |
| `SolicitudController` | `rechazar()` | * → rechazada |
| `SolicitudController` | `cancelar()` | * → cancelada |
| `SolicitudController` | `cerrar()` | ministracion/seguimiento → cerrada |

En otras palabras: **una solicitud real jamás habría podido salir de "borrador"** — el primer botón que
pulsa cualquier solicitante (`enviar()`) no habría persistido el cambio. Los demás modelos con el mismo
patrón de `$guarded` (`Empresa`, `Informe`, `ListaNegra`, `Ministracion`, `NotificacionLog`,
`Comprobante`) están bien: dejan expresamente el campo operativo fuera del guard con un comentario
explicando por qué (p. ej. `Informe.php`: "`estado` permanece asignable porque el flujo revisor lo
actualiza"). Solo `Solicitud` y `SolicitudAcceso` guardaron el campo que su propio controller necesita
escribir.
**Fix:** las 14 llamadas pasaron a `->forceFill([...])->save()`, igual que en E30. `php -l` en los 4
archivos y `npx vitest run` (97/97) sin regresiones — no hay suite de PHPUnit en este proyecto para
correr contra el backend, así que la verificación fue lint + revisión manual de cada punto.
**Pendiente relacionado, NO corregido (requiere decisión de producto, no es este bug):**
`ConvenioController::generate()` y `MinistracionController` nunca ponen `Solicitud.estado` en
`'convenio'` ni `'ministracion'` — crean el `Convenio`/`Ministracion` pero la solicitud se queda en
`'aprobada'`. Eso significa que `iniciarSeguimiento()` (exige `estado==='ministracion'`) y `cerrar()`
(exige `ministracion`/`seguimiento`) son **inalcanzables** tal como está hoy, incluso después de este
fix. Falta decidir en qué momento exacto debe avanzar la solicitud (¿al generar el convenio? ¿al firmarlo?
¿al crear la primera ministración? ¿al pagarla?) antes de tocar código. Ver Pendientes.
**Lección:** cuando se encuentra un `$guarded`/`update()` roto en un modelo, buscar el mismo patrón en
los demás controllers que tocan ese modelo (`grep -rn "->update(\[" | grep NombreModelo`), no solo en el
punto reportado — la causa raíz suele repetirse en cada transición del mismo flujo.

### E32 — Subir imagen del carrusel: 422 "el campo imagen es obligatorio" [resuelto 21-09-2026]
**Síntoma:** en `/admin/carrusel`, arrastrar o elegir una imagen daba
`422 (Unprocessable Content)` sin llegar a mostrar la vista previa. No queda registro en
`laravel.log` porque los 422 de validación no se registran (solo los 500).
**Causa:** `lib/api.ts` crea la instancia de axios con `headers: { 'Content-Type': 'application/json' }`
por defecto. El `transformRequest` de axios **lee el `Content-Type` ya puesto antes de decidir qué hacer
con un `FormData`**: si ya dice `application/json`, convierte el `FormData` a JSON en vez de mandarlo
como multipart — el archivo se pierde por completo (`{"imagen":{}}`) y Laravel nunca ve `$_FILES`, así que
`'imagen' => 'required|file|...'` falla. Reproducido con el propio paquete `axios` instalado
(`node_modules/axios`), interceptando antes de la red: sin el fix, `data` llega como el string
`'{"imagen":{}}'`; con el fix, `data` sigue siendo el `FormData` real.
**Fix:** `CarruselClient.tsx` pasa `headers: { 'Content-Type': undefined }` en esa llamada puntual. Axios
excluye los headers `undefined` al armar la petición real (`AxiosHeaders.toJSON()` filtra `value != null`),
así el navegador pone `multipart/form-data; boundary=...` correctamente. **No se tocó** el patrón que ya
usan `DocumentosAdjuntos.tsx`, `solicitudes/nueva/page.tsx` y `solicitudes/[id]/page.tsx`
(`headers: { 'Content-Type': 'multipart/form-data' }`, sin boundary): es el patrón establecido y probado
del sistema (documentos e informes se suben así desde antes), y los navegadores reales completan el
boundary faltante cuando detectan ese caso — a diferencia de dejar el header en `application/json`, que
dispara la conversión a JSON de raíz.
**Lección:** si una instancia de axios fija un `Content-Type` por defecto, **cualquier** subida de
`FormData` que no lo anule explícitamente se rompe en silencio (parece un problema del backend — 422 sin
pista — pero el archivo nunca sale del navegador). Antes de depurar un 422 de subida de archivos, revisar
qué `Content-Type` llega realmente al servidor, no asumir que axios lo omite solo porque el dato es
`FormData`.

### E33 — Decisión de diseño: cuándo avanza `Solicitud.estado` a `convenio`/`ministracion` [23-09-2026]
Cierra el hueco que dejó E31 (`ConvenioController::generate()` y `MinistracionController` creaban sus
registros pero nunca avanzaban el estado de la solicitud).
**Decisión tomada:**
- **`aprobada → convenio`**: en el momento en que se **genera** el convenio
  (`ConvenioController::generate()`), aunque el documento quede en `estado='borrador'`. Es el único
  evento discreto que existe hoy para marcar "el proyecto entró a la etapa de convenio".
- **`convenio → ministracion`**: en el momento en que el convenio pasa a `estado='firmado'`
  (`ConvenioController::update()` con `estado=firmado`), no antes. Es el punto real en que el dinero
  puede empezar a fluir — la ministración (tranche 1) ya existe desde que se aprobó el dictamen
  (`EvaluadorController::saveDictamen()`, ver E31), pero no tenía sentido cobrarla sin convenio firmado.
- Las transiciones ya existentes `iniciarSeguimiento()` (ministracion → seguimiento) y `cerrar()`
  (ministracion/seguimiento → cerrada) **no se tocaron**: siguen siendo acciones manuales del admin, como
  ya estaban diseñadas.
**Implementación:** `forceFill(['estado' => ...])->save()` en ambos puntos (mismo motivo que E30/E31: el
campo está en `Solicitud::$guarded` a propósito). El de `update()` es idempotente — comprueba
`$estadoPrevio !== 'firmado'` antes de disparar, y que la solicitud siga en `'convenio'` (defensivo, no
pisa un estado que avanzó por otro camino) — así que volver a guardar un convenio ya firmado no repite la
transición ni rompe nada.
**Si esta decisión cambia:** por ejemplo, si el negocio prefiere disparar `ministracion` cuando el
convenio llega a `'vigente'` en vez de `'firmado'`, es un cambio de una línea en
`ConvenioController::update()` (comparar contra `'vigente'` en vez de `'firmado'`).

### E34 — Tres bugs más en `ConvenioController`, encontrados al verificar E33 [resuelto 23-09-2026]
Ninguno se había notado porque **nunca se había generado un convenio real** (0 filas en `convenios`
hasta hoy). Aparecieron los tres, uno tras otro, al construir el primer convenio de prueba para verificar
E33.
1. **`generate()` daba 500 siempre, en todo intento:**
   `Convenio::whereYear('created_at', $year)->lockForUpdate()->count()` — PostgreSQL no permite
   `FOR UPDATE` combinado con una función agregada (`SQLSTATE[0A000]: Feature not supported`). El
   `lockForUpdate()` era una capa de protección redundante: el retry-on-unique-violation que ya existía
   alrededor del `Convenio::create()` (catch de `QueryException` 23505/23000) cubre la concurrencia sin
   necesitar el lock. **Fix:** se quitó `->lockForUpdate()`.
2. **`generateConvenioContent()` truena con "Attempt to read property 'nombre' on null":**
   usaba `$sol->empresa`, una relación que **no existe** en `Solicitud` — el nombre correcto es
   `institucion()` (mismo `empresa_id`, ver E25 — exactamente el patrón que E25 avisó que faltaba barrer).
   Eloquent no lanza excepción al acceder a una relación inexistente, devuelve `null` en silencio, y el
   error real aparece una línea después al leer `->nombre`. **Fix:** `$sol->institucion`.
3. **El PDF del convenio (`pdf_url`) siempre apuntaba a un archivo que no existía:**
   `Storage::disk('public')` ya tiene su raíz en `storage/app/public` (`config/filesystems.php`), pero el
   código anteponía `"public/convenios/{id}"` al guardar, escribiendo en
   `storage/app/public/public/convenios/...` mientras que `pdf_url` apuntaba a
   `storage/app/public/convenios/...` (sin la carpeta `public` doble) — el enlace de descarga daba 404
   siempre. **Fix:** quitar el prefijo `"public/"` de la ruta de escritura.
**Verificado de punta a punta:** script que crea una solicitud de prueba en `'aprobada'`, genera el
convenio (`generate()` → HTTP 201, `estado='convenio'`), lo firma (`update()` con `estado=firmado` →
HTTP 200, `estado='ministracion'`), confirma que repetir la firma no vuelve a disparar nada, y comprueba
que el archivo del convenio existe físicamente en la ruta que dice `pdf_url`. Datos y archivo de prueba
eliminados al terminar — no queda nada en producción.
**Lección:** un endpoint con 0 usos reales no es un endpoint probado, aunque tenga buena pinta en el
código (retry loops, manejo de errores, comentarios explicando la concurrencia). Antes de dar por bueno
un flujo de "cero filas", ejecutarlo una vez de punta a punta con datos de prueba desechables.

### Cookie `comecyt_auth` — `Secure` + `SameSite=Strict` activados [23-09-2026]
`apps/api/.env`: `COOKIE_SECURE=true` y `COOKIE_SAME_SITE=Strict` (antes `false`/`Lax`, señalado como
pendiente Medio desde el 11/09/2026). `COOKIE_DOMAIN` se queda en `null` a propósito: el sistema se usa
por el dominio y por la IP interna a la vez (E22), y un `Domain` explícito le impediría al navegador
mandar la cookie contra la IP. Verificado generando un JWT real y llamando
`AuthController::callRespondWithToken()` directamente (sin necesitar sesión de navegador): el
`Set-Cookie` real trae `secure; httponly; samesite=strict` y sin atributo `Domain=` (host-only, correcto
para el acceso dual). Sin cambios de código, solo `.env` + `php artisan config:clear`.

### E35 — SMTP institucional: intentado con datos reales, bloqueado por la institución [23-09-2026]
El usuario entregó las credenciales reales (`proyectos.comecyt@edomex.gob.mx` + contraseña, en
`Desktop\correo.txt`, nunca copiadas a este documento ni a memoria). `edomex.gob.mx` usa Microsoft 365
(MX → `outlook.com`), con un MX secundario propio `mail.edomex.gob.mx` (IP interna `10.10.10.3`, preferencia 50).
**Dos rutas probadas con datos reales, ambas rechazadas por políticas del lado de la institución:**
1. `smtp.office365.com:587` (STARTTLS) con esa cuenta → conecta, pero
   `535 5.7.3 Authentication unsuccessful` al autenticar. Causa más probable: Microsoft 365 deshabilita
   la autenticación básica SMTP AUTH por defecto desde 2022 para todo el tenant salvo que un admin la
   habilite cuenta por cuenta (Exchange admin center → esa cuenta → "Autenticación SMTP" → activar). La
   contraseña puede ser perfectamente correcta y aun así fallar por esto.
2. `mail.edomex.gob.mx:25` (el MX secundario, sin credenciales — típico patrón de relevo interno para
   servidores de aplicación) → la conexión TCP abre pero se cierra **sin ningún banner SMTP**, ni
   siquiera un código de rechazo. Es un firewall o lista blanca de IP a nivel de red: este servidor
   (`10.250.36.241`) no está autorizado para relevar por ahí.
**No se puede resolver desde este servidor.** Se necesita que la institución haga una de dos cosas:
- Habilitar SMTP AUTH para `proyectos.comecyt@edomex.gob.mx` en el tenant de Microsoft 365, **o**
- Agregar `10.250.36.241` a la lista blanca del relevo interno `mail.edomex.gob.mx`.
**Correo enviado el 23/09/2026, en espera de respuesta:** `Desktop\ADEM\_v6_smtp_sep23\CORREO_SMTP_INSTITUCIONAL.md`.
**Estado dejado en el servidor:** `MAIL_MAILER=log` (no rompe nada; escribe en el log en vez de enviar,
igual que el estado de desarrollo documentado). `MAIL_FROM_ADDRESS` se corrigió a
`proyectos.comecyt@edomex.gob.mx` de una vez (antes `noreply@comecyt.gob.mx`, un dominio **sin ni un solo
registro MX** — no es una dirección de correo real; da igual qué SMTP se use al final, ese From nunca
habría funcionado). En cuanto la institución resuelva 1 o 2, poner `MAIL_MAILER=smtp` con el host que
corresponda y correr `php artisan config:clear`; no hace falta tocar código.
**Lección:** una cuenta de correo real no garantiza que SMTP AUTH esté habilitado — es una política de
tenant independiente de la contraseña. Antes de reportar "credenciales incorrectas", probar la
autenticación con un mensaje de error explícito (`535 5.7.3` no es lo mismo que `535 5.7.8` de contraseña
inválida) y verificar el estado de la política de autenticación básica del proveedor.

### Cabeceras técnicas menores — revisadas [23-09-2026]
Los dos puntos que quedaban en "Cabeceras menores" (Pendientes):
1. **Cabecera `Server` oculta.** Ya estaba resuelto de antes (`requestFiltering removeServerHeader="true"`
   en `public/web.config`, aplicado en agosto) — solo faltaba confirmarlo. Verificado con `curl.exe -D -`
   contra una respuesta normal y contra un 404 de `hiddenSegments` (`.env`): **ninguna trae `Server:`**.
2. **`Cross-Origin-Resource-Policy` en `/storage/*`** — pendiente desde el 25/08/2026 hasta poder probar
   con un archivo real. Con las imágenes del carrusel ya subidas (`/admin/carrusel`), se confirmó con
   `curl.exe` que `/storage/*` servía sin esta cabecera y se activó: se quitó la exclusión de
   `/storage/` en la precondición `RespuestaSinCorpFueraDeStorage` (renombrada `RespuestaSinCorp`) de
   `public/web.config`, y `same-origin` se aplica igual en toda ruta — no hacía falta una regla en pareja
   como con CSP/XFO, porque el valor no cambia entre `/storage/*` y el resto (`same-origin` en ambos
   casos, a diferencia de CSP/XFO que sí llevan un valor distinto y más relajado solo en `/storage/*`).
   Verificado con `curl.exe -D -` por IP y por dominio: la imagen real del carrusel ya trae
   `Cross-Origin-Resource-Policy: same-origin`, y las rutas normales (login, API) siguen igual que antes.
   `same-origin` nunca bloquea un uso del **mismo** origen (`<img>` o `<iframe>`), así que esto no
   afecta ni la vista previa de documentos de solicitud (aún sin datos reales) ni las imágenes del
   carrusel — solo cierra el acceso a un origen externo, que es justo el propósito de la cabecera.

### E36 — Landing pública `/sigac` antes del login [publicada 23-09-2026]
El usuario pidió una landing previa al login en `https://sidecyt-comecyt.edomex.gob.mx/sigac`, con las
skills de diseño y el ADN visual de portrait.so (entregó su `design.md`). Documento completo:
**`docs/LANDING_SIGAC.md`**; resumen de diseño en `docs/DISENO_UI.md` §11.
- **Rutas:** `/sigac`, `/privacidad` y `/terminos` en `PUBLIC_PATHS` de `proxy.ts`. **`/` sin sesión →
  `/sigac`**; con sesión → el panel de su rol (antes iba a `/login` y de ahí rebotaba). Las legales eran
  inaccesibles sin sesión hasta hoy (redirigían al login) aunque la landing y los términos las enlazan.
- **`/login?email=…`** prellena el correo y enfoca la contraseña (lo usa el campo del hero). Se lee con
  `window.location.search` tras montar, no con `useSearchParams`, para no exigir un `<Suspense>`.
- **Estilos aislados:** todo en `src/app/sigac/landing.css` con prefijo `.lp-*` y tokens dentro de
  `.lp-root`. **Nunca mover esos tokens a `:root` ni a `globals.css`**: chocarían con `--auth-*`/`--app-*`.
- **Fuentes auto-hospedadas** con `next/font/local` (`src/app/sigac/fonts/`, Switzer + Satoshi, licencia
  FFL). **El servidor no alcanza `fonts.googleapis.com`** — una fuente nueva con `next/font/google`
  probablemente rompería el build (Geist funciona porque ya estaba en caché). Fontshare sí responde, con
  `curl.exe --ssl-no-revoke`.
- **Animación de entrada:** espera `BOOT_MS` (1100 ms, el mismo de `RouteChangeOverlay`) para no
  animarse detrás de la pantalla de carga. El revelado de tarjetas usa la propiedad `translate` con
  `animation-fill-mode: backwards` — con `transform` + transición pisaba la rotación y el hover de cada
  tarjeta (se detectó antes de publicar).
- **Verificado:** tsc 0 errores; `Landing.a11y.test.tsx` 3/3 (axe sin violaciones); Edge headless a 1440 y
  375 px sin scroll horizontal y sin errores de consola en producción; `/` → 307 `/sigac` por IP y por
  dominio; cabeceras de seguridad sin cambios.
- **Segunda y tercera vuelta, mismo día (pedidos del usuario):** el sistema se llama **SIGAC** en la landing
  (no SIDECyT); contenido de los 4 programas de Apoyo Empresarial tomado de
  `comecyt.edomex.gob.mx/apoyo-empresarial` (programas, 30 sectores, formatos, contactos); acentos en
  **vino institucional** (`oklch(36% 0.1 358)`, el de `--auth-vino`) solo en detalles; logo de COMECYT
  **3 veces más grande** en encabezado y pie usando `public/logo-recortado.png` (el `logo.png` original tiene
  ~46 % de margen transparente); correo del pie `proyectos.comecyt@edomex.gob.mx`; **convocatorias abiertas
  en vivo** (E37); botón **"Ir al sitio"** en el login → `/sigac`.
- **Bug encontrado antes de cerrar:** `useInView` de Framer se conecta al `ref` en el montaje; si el elemento
  aparece después (la rejilla de convocatorias se pinta cuando llegan los datos), nunca lo observa y las
  tarjetas se quedaban en opacidad 0. **Regla:** el `ref` de un revelado va en un contenedor que exista
  desde el primer render.

### E37 — Endpoint público de convocatorias abiertas para la landing [23-09-2026]
`GET /api/convocatorias/abiertas` → `ConvocatoriaPublicaController@index`, sin autenticación, dentro del
grupo de `ApiGateway`/`CircuitBreaker`/`RateLimit` y con `throttle:30,1`. Lo consume la landing con `fetch`
relativo y `credentials: 'omit'`.
- **Cuándo una convocatoria es "abierta":** `estado = 'activa'` **y** `fecha_apertura <= hoy <= fecha_cierre`
  **y** `tipo_programa_id` no nulo con programa `activo` **y** `deleted_at` nulo. El doble filtro (estado +
  fechas) evita anunciar una convocatoria vencida si `convocatorias:close-expired` se atrasa. `deleted_at` va
  explícito porque el modelo `Convocatoria` **no usa el trait `SoftDeletes`** aunque la columna existe.
- **Lista blanca de campos armada a mano:** `nombre`, `programa`, `descripcion` (sin HTML, 280 caracteres),
  `ejercicio_fiscal`, `fecha_apertura`, `fecha_cierre`. Quedan fuera IDs, montos, porcentajes, fianzas y
  todo dato de solicitudes. Máximo 12. No lee ningún parámetro de la petición.
- **Caché** de 5 min (`->toArray()`, regla 2) que se invalida en los eventos `saved`/`deleted` del modelo:
  cubre el CRUD del admin, el asistente de 7 pasos y el cierre automático. `Cache-Control: public, max-age=120`.
- **Front:** `parseCalls()` valida tipo, formato de fecha y longitud de cada registro y descarta los que no
  cumplen; todo se pinta como texto (React escapa). Estados de carga (esqueleto), vacío y error.
- **Verificado:** 200 con solo los 6 campos; cabeceras de seguridad presentes; `POST` rechazado; parámetros
  inyectados (`?estado=borrador&limit=9999`) ignorados; **429 tras 30 peticiones/min**; prueba automatizada
  con `<script>` e `<img onerror>` en los datos → salen como texto, nada se inyecta al DOM.
- **Ojo con los datos:** al 23/09/2026 las 5 convocatorias `activa` de producción parecen **datos de carga
  inicial** (fechas 01/04–01/10/2026 idénticas, nombres como "Pago de Fórmulas de Paridad de Información" o
  "Profesionistas Extranjeros"), y el sitio oficial marca las convocatorias 2026 como **cerradas**. La landing
  muestra lo que dice la base de datos: el admin debe cerrarlas o corregirlas en `/admin/convocatorias` si no
  son reales.

### E38 — SMTP institucional funcionando [resuelto 23-09-2026]
Continuación de E35. Infraestructura respondió: la cuenta `proyectos.comecyt@edomex.gob.mx` tenía activado
el **autenticador (MFA)** — que no corresponde a una cuenta de aplicativo — y se le asignó **licencia de
Exchange Online** (solo buzón). Configuración sugerida: `smtp.office365.com`, puerto 587, TLS.
- **Probado en tres niveles:** (1) autenticación con Symfony Mailer directo → `AUTH OK` (antes
  `535 5.7.3`); (2) envío real a la propia cuenta → aceptado; (3) envío con `Mail::raw()` usando la
  configuración de Laravel → aceptado.
- **`.env`** (respaldo previo `apps/api/.env.bak-20260923-presmtp`): `MAIL_MAILER=smtp`,
  `MAIL_HOST=smtp.office365.com`, `MAIL_PORT=587`, `MAIL_USERNAME`/`MAIL_FROM_ADDRESS` = la cuenta,
  `MAIL_PASSWORD` entre comillas simples (literal en phpdotenv). `MAIL_SCHEME` sin definir: con 587 Symfony
  negocia STARTTLS solo. La contraseña se escribió con un script que la lee de `Desktop\correo.txt` sin
  imprimirla; **no está en ningún `.md` ni commit**.
- `php artisan config:clear` y **reinicio de `comecyt-queue` y `comecyt-scheduler`** (procesos largos que
  cargan la configuración al arrancar; sin reiniciarlos seguirían con `log`). La cola es `database`.
- **Pendiente derivado:** reactivar el 2FA del admin (apagado desde el 14/09 por falta de correo) con el
  usuario presente, y probar de punta a punta el restablecimiento de contraseña por correo.

### E39 — Paneles unificados con el diseño de la landing (sistema SIGAC) [publicado 23-09-2026]
Pedido del usuario: llevar diseño, interfaz y colores de la landing a todos los paneles; el login igual.
Detalle completo en `docs/DISENO_UI.md` §12. Lo que un desarrollador debe saber:
- **Una sola capa:** `src/styles/panel-sigac.css`, importada en `app/layout.tsx`, **sin `@layer`** (gana
  sobre `globals.css` y Tailwind). Todo selector va con `:is(.panel-root, html.sg-panel)`.
- **Dos alcances:** `.panel-root` en la raíz de `AdminTopLayout`/`RoleTopLayout` (primer render) y
  `html.sg-panel`, que pone `usePanelScope()` mientras hay un panel montado — necesario porque diálogos,
  selects y menús se renderizan en **portales fuera de `.panel-root`**.
- **Se redefinen tokens, no vistas:** shadcn, `--app-*`, `--tile-*`, los `--auth-*` que usan los paneles,
  `--tone-*-L` y la escala `--color-neutral-*` de Tailwind v4 (sus utilidades leen la variable).
- `button.tsx` expone `data-variant` y la variante **`rainbow`** (un CTA por vista). `page-header.tsx` pone
  `page-title` (barra vino bajo el título). Fuentes en `lib/fonts.ts` (variables en `<html>`).
- **Trampas encontradas (no repetir):** (1) `.btn-liquid` deja su `::before` en `scale(0)`/opacidad 0 — un
  pseudo-elemento propio en un botón debe neutralizar `transform`/`opacity`/`transition`; (2) en modo oscuro
  **no invertir** la escala `neutral`: las vistas ya eligen el extremo con `dark:`; (3) si `--auth-field`
  es blanco sobre lienzo blanco, los campos desaparecen; (4) un logo más ancho en la barra desborda en
  teléfono — hay 6 controles a la derecha.
- **Verificación con sesión sin contraseñas:** tokens JWT emitidos con `auth('api')->login($user)` desde un
  script de servidor (guardados en archivo, nunca impresos) e **invalidados al terminar**
  (`->invalidate(true)`). El archivo `F:\COMECYT_CREDENCIALES.txt` (contraseñas del 30/06, rotadas el 14/09) se
  **borró el 24/09/2026** a pedido del usuario (E44).

### E40 — Estados públicos, prórroga y banners de convocatorias y programas [publicado 24-09-2026]
Pedido del usuario: cerrar las convocatorias de prueba; que al darse de alta tengan estado para la landing
(próxima a abrir, abierta, cerrada, con prórroga); configurar la prórroga; banner o imagen por enlace o archivo
local, para convocatorias **y programas**, **solo admin**. Reglas de negocio: sección "Estado público de una
Convocatoria" arriba. Documentación de la landing: `docs/LANDING_SIGAC.md` §10.
- **Datos:** las 5 convocatorias de carga inicial se **cerraron** y luego se **archivaron** (`deleted_at`) para
  que la landing no las publique en "Cerradas" con nombres erróneos. Reversible (`deleted_at = NULL`). Ambas
  acciones en la bitácora (`convocatoria.cerrada_datos_prueba`, `convocatoria.archivada_datos_prueba`).
- **Migración** `2026_09_24_000001_…`: `convocatorias.fecha_prorroga, motivo_prorroga, prorroga_at,
  prorroga_por (FK users), banner_url`; `tipo_programas.banner_url`. Respaldo previo con `backup.ps1`.
- **Endpoints (grupo admin, throttle 20/min):** `POST /admin/convocatorias/{c}/prorroga`,
  `POST|DELETE /admin/convocatorias/{c}/banner`, `POST|DELETE /admin/programas/{p}/banner`.
- **Banner — seguridad:** archivo JPG/PNG/WebP ≤ 5 MB con **MIME real** (finfo), dimensiones reales 600×200 a
  6000 px por lado (evita bombas de descompresión), nombre aleatorio de 32 caracteres, SVG prohibido; **o**
  enlace solo `https` de `config('comecyt.banners.hosts')` (= CSP img-src, sin comodines, sin usuario/puerto).
  El servidor **no descarga** URLs (sin SSRF). Al reemplazar/quitar borra el archivo anterior solo si es suyo.
  Toda acción queda en la bitácora. La landing vuelve a filtrar el banner en backend (`safeBanner`) y front
  (`bannerSeguro`).
- **Bugs encontrados y corregidos al hacerlo:**
  1. `convocatorias:close-expired` comparaba la fecha con `now()` con hora → cerraba **el mismo día** del
     cierre; ignoraba la prórroga; registraba `titulo` (no existe). Ahora `COALESCE(prorroga, cierre) < hoy`.
  2. La app corre en **UTC**: desde las 18:00 de Toluca todo "vivía" en el día siguiente. Fecha de negocio
     explícita para convocatorias.
  3. `SolicitudController::enviar()` **no revisaba** si la convocatoria seguía abierta (se podía enviar tras el
     cierre). `store()` solo miraba `estado='activa'` (habría aceptado solicitudes en "próxima a abrir").
     `activeConvocatorias()` listaba próximas y vencidas. Los tres usan ahora `aceptaSolicitudes()`.
  4. **Front, todo el sistema:** `new Date('2026-10-01')` se lee como medianoche UTC y en México muestra el día
     anterior ("30 sep" para un cierre del 1 de octubre). `lib/format.ts` tiene `parseDate()`, que lee
     'AAAA-MM-DD' como fecha local; `formatDate()` lo usa y se corrigieron 15 usos en 8 vistas.
  5. `DashboardController` (alertas "por cerrar") y `NotificarCierreProximo` ignoraban la prórroga y usaban UTC;
     el dashboard además usaba `titulo`.
- **Landing:** sección "Convocatorias" con pestañas Abiertas / Próximas a abrir / Cerradas (conteo en cada
  una), banner 3:1 por tarjeta, píldora de estado, "Prórroga hasta" con la fecha original tachada, CTA según
  estado. **El arcoíris se sustituyó por vino no saturado** en landing y paneles (pedido del usuario): contorno
  del CTA con relleno de lavado vino que barre al pasar el cursor, palabra del titular con un destello único.
- **Verificación:** prueba de punta a punta en producción con datos desechables — **50/50** (estados, prórroga,
  banners, 401/403/422, SVG con script, PNG falso, imagen diminuta, dominio no autorizado/parecido, http,
  `usuario@`, archivo+enlace, PUT genérico que intenta escribir prórroga/banner, 429 del throttle). Front
  103/103 pruebas; capturas de landing (3 pestañas, móvil 375 px) y admin (lista, ficha, diálogo, programa) sin
  errores de consola ni scroll horizontal. Todo el dato temporal se borró; tokens invalidados.
- **Nota de throttle:** el contador de `throttle:X,1` de Laravel es por usuario (o IP) y se **comparte entre
  rutas**; 20 acciones de banner/prórroga por minuto por admin sobran para uso humano, pero una prueba
  automatizada debe espaciar las peticiones.

### E41 — Paneles v3: rediseño estructural (landing + aboardhr.com) [publicado 24-09-2026]
Detalle de diseño en `docs/DISENO_UI.md` §13. Para desarrollo:
- **Componentes nuevos/rehechos:** `components/ui/pastel-frame.tsx` (nuevo), `page-header.tsx` v3 y
  `stat-tile.tsx` v3 (mismas props: las 37 vistas y los 4 dashboards los heredan). Clases `.dash*`,
  `.feature-*`, `.card-head*`, `.list-row`, `.alert-row`, `.pf-panel` en `styles/panel-sigac.css` (bloque "v3").
- **Layouts:** barra `.panel-topbar` flotante; migas movidas a `<main>` como `.panel-crumbs`; `.panel-splash`
  al inicio de `.panel-root`. El dropdown móvil quedó en `top-[5.5rem]` por la barra despegada.
- **No poner `backdrop-filter`/`transform`/`filter` en la barra**: rompe los `position: fixed` de su interior
  (menú móvil y capa de cierre).
- **Dashboard de admin:** la convocatoria "activa" del héroe usa `estado_publico` (abierta/prórroga) y la fecha
  límite efectiva; antes buscaba `estado === 'activa'`.
- **Antes de desplegar, `npx tsc --noEmit`:** un build falló por un import quitado de más y `deploy-web.ps1`
  restauró la versión anterior (bien hecho por el script, pero se perdió un ciclo).

### E42 — "El dominio se queda cargando": HTML viejo en caché compartida [resuelto 24-09-2026]
Documento completo: `docs/DOMINIO_BALANCEADOR.md` §13.
**Síntoma:** por el dominio la pantalla de carga no se retiraba nunca; desde el servidor cargaba bien.
**Causa:** Next marca el HTML prerenderizado con `s-maxage=31536000`. Un intermediario (ELB/proxy) puede servir
HTML de un despliegue anterior que pide chunks `/_next/static/...` ya borrados → React no arranca → nadie oculta
`#boot-splash`.
**Fix (3 capas):** (1) `web.config`: regla de salida `HtmlSinCacheCompartida` → `private, no-cache, no-store`
solo en `text/html`/`text/x-component` (estáticos siguen `immutable`); (2) `deploy-web.ps1` copia los `static`
del respaldo antes que los nuevos (chunks anteriores siguen existiendo); (3) `layout.tsx` `RECUPERAR_CARGA`:
recarga **una vez** (sessionStorage, 60 s) si falla un chunk, hay `ChunkLoadError` o el splash sigue a los 15 s.
**Lección:** en un sitio detrás de balanceador, el HTML nunca debe ser cacheable por terceros; y todo despliegue
debe conservar los assets con hash de la generación anterior.

### E43 — Vistas internas, menú y pie de los paneles [publicado 24-09-2026]
Detalle en `docs/DISENO_UI.md` §14. Para desarrollo:
- **Marco pastel automático:** la `Card` de primer nivel cuyo `CardContent` tiene como hijo directo
  `DataCardGrid` (`.data-grid`), una tabla o `.empty-state` se pinta como marco pastel vía `:has()` — no editar
  vistas para eso. El tono sale de `<main data-section-tone>` (admin: grupo del menú; otros roles: fijo).
- **Menú:** clases `.panel-menu*` en ambos layouts; grupo con `data-pastel`. El botón lleva `aria-label`
  (en móvil el texto se oculta y quedaba sin nombre accesible).
- **Pie:** `components/layout/PanelFooter.tsx`, común a los 4 paneles (logo recortado 76 px, enlaces públicos,
  correo de proyectos). `DualBranding` ya no se usa en los layouts.
- **Dashboard admin:** `ReverbStatusWidget` y "Buenas prácticas" ya no se montan (pedido del usuario); el
  componente y su endpoint siguen existiendo.
- Ganchos de clase nuevos en StepFrame, paginación, DataCardGrid, SavedFiltersBar y pestañas del programa.

### E44 — Auditoría de ciberseguridad de todo el código + endurecimiento [publicado 24-09-2026]
Pedido del usuario: "revisa, analiza y corrige ... todo el sistema a nivel código de ciberseguridad", más CSP,
permisos del `.env`, red, `serverFetch` y borrar `F:\COMECYT_CREDENCIALES.txt`. Dos auditorías (backend y front) y
corrección de todo lo confirmado. Verificado: **38/38** pruebas de punta a punta del backend en producción (datos
desechables, borrados), **28/28** en navegador real (landing, login, 4 paneles, logout), vitest 104/104.

**Críticos / altos corregidos**
| Hallazgo | Corrección |
|---|---|
| `DatabaseSeeder` hacía `updateOrCreate` del admin con contraseña publicada, y `deploy.sh` lo corre con `--force`: **cada despliegue devolvía el admin de producción a esa contraseña** | Solo crea el admin si no existe (clave de `ADMIN_INITIAL_PASSWORD` o aleatoria mostrada una vez). `deploy.sh` solo siembra en la primera instalación (`RUN_SEEDERS=1` para forzar). `UsuariosPruebaSeeder` se bloquea solo fuera de local/testing |
| Documentos de solicitantes (carátula bancaria, constancia fiscal, facturas, informe) en el disco `public`: **se descargaban sin sesión** con nombres adivinables; el borrado no borraba | Disco `local` + `ArchivoSolicitudController`: `GET /api/archivos/solicitudes/{id}/{40 alfanum}.pdf`, con sesión y permiso (admin, revisor, dueño, evaluador asignado; a los demás 404). XFO `SAMEORIGIN` solo ahí (vista previa en iframe). Convenios: ya no se escribe copia pública; `pdf_url` → `/api/documentos/convenio/{id}` |
| Cerrar sesión solo borraba cookies JS: el JWT HttpOnly seguía vivo 24 h (equipo compartido = sesión ajena) | `lib/logout.ts` `cerrarSesion()`: `POST /auth/logout` (lista negra + cookie expirada) y limpieza de Cache Storage |
| Service worker guardaba el HTML de cada página del panel (datos personales) en disco | `sw.js` v3: HTML solo red; `/storage/*` nunca se cachea; mensaje `CLEAR_CACHES`; clic en push solo a rutas propias |
| Cuentas desactivadas podían iniciar sesión y seguir usando su token | `attempt(+activo)`, chequeo en `ApiAuthenticate` y en el reto 2FA |
| `/mis-notificaciones` daba a revisores y evaluadores las de **todos**; `per_page` sin tope | Filtro por `user_id` salvo la ruta `/admin/*`; `per_page` 1..100 |
| Evaluador podía reenviar dictamen (reescribir resultados cerrados) y puntuar 9999 con criterios de otro programa | Solo asignación abierta + solicitud `en_evaluacion`; un dictamen por asignación; criterios del programa, sin repetir, ≤ `puntaje_maximo` |

**Medios / bajos corregidos:** CSP con **nonce por petición** (`proxy.ts` + `lib/csp.ts`, `script-src 'self' 'nonce-…'
'strict-dynamic'`, sin `unsafe-inline` en scripts; `style-src` lo conserva); `tipo` de documento en lista blanca y
extensión fija `.pdf` (antes path traversal `../` y `.html` servido como HTML); reglas por estado para subir/borrar
documentos; enumeración de correos cerrada (forgot-password y solicitar-acceso responden igual); `ApiGatewayMiddleware`
ya **no apaga la API** para todos (solo registra); cambiar/restablecer contraseña **invalida los JWT anteriores**
(`users.password_changed_at` vs `iat`) y se entrega token nuevo; `Password::defaults()` = 10+, mayúsculas, minúsculas,
número (antes 8 cualesquiera) con mensajes en español (`lang/es/validation.php`) y el mismo chequeo en el front
(`lib/password-policy.ts`); inyección de fórmulas en el Excel; bloqueo de cuenta por par correo+IP (10) y global (50)
en vez de 10 desde cualquier IP (antes se podía dejar fuera al admin a propósito); notificaciones como texto (antes
`dangerouslySetInnerHTML`); `proxy.ts` ya no confía en las cookies JS `token`/`userRole` (bastaban para ver la UI de
/admin) y trata el JWT vencido como sin sesión; matcher con extensiones ancladas; `safeUrl()` para URLs de la API en
`href`/`src`/`window.open`; `rel="noopener noreferrer"`; cookies JS con `secure`+`SameSite=Strict`; `remotePatterns`
sin hosts internos en producción; push solo a servicios reales (SSRF); `/catalogos` solo `id,nombre,acronimo` de
empresas; limpiar caché de catálogo solo admin; throttle 60/min en catálogos públicos; `empresa_id` se elige una sola
vez y nunca una empresa en lista negra; SSO (apagado) exige `email_verified` y no abre cuentas admin/2FA/inactivas;
errores internos solo al log. Contraseña por defecto quitada de `generate-selfsigned-cert.ps1` (el PFX no existía).
**Bugs funcionales encontrados de paso:** `Solicitud::empresa()` no existía (Excel y PDF habrían dado 500 con la
primera solicitud); `exists:instituciones` (tabla renombrada) daba 500 en 5 validaciones; la subida de documentos usaba
`getRealPath()` (falla en este IIS, E28); el convenio firmado ya no se podía descargar (estado `ministracion`).

**Infraestructura:** ACL de `.env`, `.env.local` y sus respaldos: solo SYSTEM, Administradores y (solo el `.env`
de la API, lectura) `IIS APPPOOL\comecyt` — respaldo en `backups\20260924-seguridad\acl-*.txt`. Red: firma SMB
requerida; reglas 5357 (WSD), 2179 y 135 (Hyper-V) deshabilitadas; RDP/WinRM **sin tocar** (falta rango de VPN);
reversión en `backups\20260924-seguridad\red-cambios.txt`. `serverFetch`: el certificado ya estaba resuelto
(`NODE_EXTRA_CA_CERTS=C:\ProgramData\COMECYT\iis-10.250.36.241.pem` en NSSM); ahora además reenvía
`X-Forwarded-For` y `TRUSTED_PROXIES` incluye `10.250.36.241`, para que el límite por IP no sea uno solo para todos.
`F:\COMECYT_CREDENCIALES.txt` **borrado**.

**Incidente durante el despliegue (no repetir) [E44]:** al mover la CSP de `next.config.ts` a `proxy.ts`, `sw.js` (que no
pasa por el proxy) quedó con la CSP de IIS `default-src 'none'`. **Un service worker obedece la CSP de su propio
archivo**: no pudo hacer `fetch()` y la API respondía 503 "Sin conexión" en navegadores con el SW instalado
(~14:06–14:17). Fix: regla de cabeceras propia para `/sw.js` en `next.config.ts` + versión nueva del SW (bytes
distintos obligan a reinstalarlo). **Regla:** toda CSP nueva se prueba en navegador con el SW activo y navegando
entre páginas del mismo contexto, no solo con `curl` o con la primera visita.

### E45 — Alcance por convocatoria/periodo, perfiles, buzón, folios y límites de archivo [publicado 24-09-2026]
Plan, decisiones del usuario, modelo de datos, rutas y verificación: **`docs/IMPLEMENTACIONES_E45.md`**. Reglas de
seguridad nuevas: ampliación del §0. Para desarrollo:
- **Alcance:** todo dato ligado a convocatoria pasa por `App\Support\Alcance` (`aplicar`, `aplicarPorSolicitud`,
  `exigirSolicitud`/`exigirConvocatoria` → 404). Middleware `alcance` revisa los modelos enlazados en la ruta; ids que
  llegan en el **cuerpo** se revisan a mano. Middleware `rol:slug,...` por grupo. Rutas admin en 3 grupos: lectura
  (admin, admin_convocatoria, consulta), operación (admin, admin_convocatoria) y solo admin.
- **Front:** `useRol()` y `subrutaPermitida()` (`lib/roles.ts`, compartido por `proxy.ts` y el menú) son comodidad de
  UI; el control real es el backend. Páginas nuevas del admin se declaran en `SUBRUTAS_POR_ROL` además de `NAV_GROUPS`.
- **Historial:** el `saved` de `Solicitud` escribe `solicitud_historial` en cada cambio de `estado` (toma
  `motivo`/`observaciones` de la petición). Toda transición sigue usando `forceFill()->save()`.
- **Fotos:** `PerfilController` re-codifica a WebP con GD (avatar 512², portada 1600×480, tope 40 MP antes de
  decodificar), disco privado `perfiles/`, servidas por `/api/media/perfil/{40}.webp` con sesión. `UserAvatar` solo
  acepta esa forma de URL.
- **Archivos:** `App\Support\TiposArchivo` (pdf, imagen, office sin macros, zip seguro); extensión derivada del
  contenido. Límites por documento del programa (`formato_permitido`, `tamaño_maximo_mb` ≤ 20) y de los fijos
  (`documentos_fijos_config`).
- **Buzón:** canal privado `conversacion.{id}` autorizado por `Buzon::participa`; evento `MensajeBuzonEnviado`
  (ShouldBroadcastNow); job `AvisoMensajeNoLeido` a los 30 min (el correo no lleva el texto del mensaje).
  **Avisos de la campana ligados al hilo** (`notificaciones_log.conversacion_id`, FK con borrado en cascada, migración
  `2026_09_24_000004`): al pulsarlos llevan a `…/buzon?hilo=ID` (`lib/notificaciones.ts` `hrefBuzon`), leer el hilo los
  marca leídos, y si el hilo se borra se van con él. Antes quedaban huérfanos ("tengo mensajes nuevos y el buzón está
  vacío", reportado por el usuario tras borrar los datos de prueba). **La campana del admin muestra solo sus
  notificaciones** (antes las de todos, y las ajenas no se podían marcar leídas → 403 y "nuevas" para siempre); el
  historial completo sigue en `/admin/notificaciones`. El chat se suscribe al canal solo cuando el hilo ya cargó.
- **Folios públicos:** instantánea en `folios_publicados` tras confirmación (`confirmar: accepted`);
  `GET /api/folios-aprobados` público con lista blanca, caché 5 min y throttle 30.
- **Bugs de fondo encontrados al probar con datos reales:** (1) `SolicitudController::store` usaba `Solicitud::create`
  con `folio`/`estado` guardados → NOT NULL: **nadie podía crear una solicitud** (ahora `forceFill`, patrón E30/E31);
  (2) `adminShowFull` cargaba `criteriosEvaluacion` e `informe`, inexistentes → 500; (3) **`throttle:*` corría antes
  que la autenticación** (Laravel ejecuta ThrottleRequests antes de cualquier middleware fuera de su lista de
  prioridad): contaba por IP con un contador compartido entre rutas. Fix: `prependToPriorityList` de
  `ReadJwtFromCookie` y `ApiAuthenticate` antes de `ThrottleRequests` + `$request->setUserResolver()` en `ApiAuthenticate`.
- **Verificación:** 72/72 (`e2e_e45.php`), 38/38 regresión E44 (403→404 a propósito), 13/13 en navegador (incluye chat
  entre dos navegadores y confeti al re-entrar), vitest 113/113. Datos de prueba borrados y tokens invalidados.

### E46 — "El correo de recuperar contraseña no llega" [resuelto 24-09-2026]
**Síntoma:** el usuario pidió recuperar contraseña y no recibió nada.
**Causa (varias, ninguna era el SMTP, que funciona):**
1. **Por diseño** (regla 10) el enlace sale solo cuando un admin **aprueba** la solicitud en `/admin/reset-requests`.
2. El aviso al admin era **solo por correo**, y el único admin tiene un correo de **dominio sin MX** (`comecyt.gob.mx`):
   nadie se enteraba y la solicitud quedaba pendiente sin rastro.
3. **El canal `database` de 8 notificaciones escribía en la tabla `notifications`, que nada lee** (la campana lee
   `notificaciones_log`): esos avisos nunca se vieron en el panel.
4. **Enlaces de correo a `http://localhost:3000`:** `config('app.frontend_url')` (default de Laravel con `FRONTEND_URL`, no
   definida) daba localhost — afectaba el aviso de mensaje no leído del buzón — y 13 notificaciones usaban
   `env('NEXT_PUBLIC_APP_URL')`, que con `config:cache` (lo corre `deploy.sh`) devuelve null → localhost.
**Fix:** `config/app.php` define `frontend_url` (FRONTEND_URL → NEXT_PUBLIC_APP_URL → APP_URL) y **todo** el código usa
`config('app.frontend_url')`; nuevo canal `App\Notifications\Channels\CampanaChannel` (escribe en `notificaciones_log` →
campana + tiempo real + push) en lugar de `database`, también en `SolicitudResetPassword`; al pulsar el aviso
(`reset_password`, `nueva_solicitud_acceso`) lleva a su página (`hrefAvisoAdmin`); alerta en el dashboard si una cuenta
de admin tiene un dominio que no recibe correo.
**Verificado de punta a punta en producción (15/15, `e2e_correo.php`):** SMTP autentica, forgot-password crea la
solicitud, la cola avisa al admin (correo + campana) sin fallos, aprobar envía el enlace real (aceptado por Microsoft 365)
al buzón del sistema, el enlace usa el dominio, restablecer con el token funciona y un token falso da 422.
**Reglas:** (1) nunca `env()` fuera de `config/` (con caché devuelve null); (2) toda notificación que deba verse en el
panel usa `CampanaChannel`, no `database`; (3) un aviso que pide una acción no puede depender solo del correo.
**Pendiente del usuario:** poner un correo real a la cuenta admin (Usuarios); quedan otros `env()` fuera de config
(cookies, rate limits, SSO, VAPID, TSA) que fallarían si algún día se corre `config:cache` en este servidor.
