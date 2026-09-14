# CLAUDE.md — COMECYT Sistema
**Versión:** 8.1 (30 Junio 2026) | **Build:** 47 rutas, 0 errores | **PHP lint:** 0 errores | **Ruta:** `F:\Desarrollo Tecnologico\`

---

## Visión General del Proyecto

**COMECYT** (Consejo Mexiquense de Ciencia y Tecnología) es un sistema integral de gestión de apoyo científico que administra el ciclo completo de convocatorias de financiamiento:

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
| Email (dev) | `MAIL_MAILER=log` — escribe en log, no envía |

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

### Convocatoria → TipoPrograma (1:1 único)

Cada convocatoria tiene su propio `TipoPrograma` exclusivo. Los campos dinámicos, documentos, rubros y criterios de evaluación se configuran por convocatoria vía el Wizard de 7 pasos en `/admin/convocatorias/nueva`. Las convocatorias **deben** tener `tipo_programa_id` para que aparezcan al solicitante.

---

## Reglas Críticas (errores que ya costaron tiempo)

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

### 4. Rutas públicas en middleware.ts (Next.js)
Páginas sin auth deben estar en `PUBLIC_PATHS` en `apps/web/src/middleware.ts`. Si no, el middleware las bloquea silenciosamente → el usuario ve que el botón "no hace nada".
```typescript
const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password', '/solicitar-acceso'];
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

MAIL_MAILER=log         # Dev: escribe en log. Prod: SMTP real
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
| CSP sin comodines | ✅ | `next.config.ts` — orígenes explícitos en `img-src`/`connect-src`. **Nunca usar `*.dominio`**: lo levanta el pentest (hallazgo 7, ago-2026) |
| API sin sesiones ni cookies JS | ✅ | Grupo `web` sin `StartSession`/`PreventRequestForgery` en `bootstrap/app.php`. No se emite `XSRF-TOKEN` ni `comecyt-session` (hallazgo 4, ago-2026) |
| Lista blanca de Host | ✅ | Regla `HostAllowList` en `public/web.config` — cualquier `Host` no autorizado recibe 404 vacío (hallazgo 5, ago-2026) |
| Certificado RDP | ✅ | Listener 3389 con cert `CN=10.250.36.241` (SAN con la IP) + NLA + cifrado alto (hallazgo 3, ago-2026) |
| Sin divulgación de tecnología | ✅ | No se emiten `Server` ni `X-Powered-By`: `expose_php=Off` (php.ini), `removeServerHeader` + `<remove name="X-Powered-By">` (web.config), `poweredByHeader:false` (next.config.ts) |
| `X-XSS-Protection` retirada | ✅ | Retirada a propósito el 13/08/2026 (`SecurityHeadersMiddleware.php`). Cabecera obsoleta: Chrome eliminó el XSS Auditor, Firefox nunca la implementó, y OWASP recomienda no enviarla —`1; mode=block` habilitó fugas entre orígenes (XS-Leaks). La protección real la da la CSP. **No volver a agregarla**, aunque un escáner la pida: ver `Desktop\ADEM\_v3_agosto20\LEEME.md` §25/08/2026 |
| Encuadre de `/storage/*` | ✅ | Excepción `CspStorage` + `XfoStorage` en `public/web.config`: los adjuntos salen con `X-Frame-Options: SAMEORIGIN` y `frame-ancestors 'self'` para que funcione la vista previa en iframe; el resto del sitio sigue con `DENY` / `'none'`. **Las `outboundRules` alcanzan también a los archivos estáticos** — tenerlo presente al agregar cualquier cabecera nueva |
| `Cross-Origin-Resource-Policy` | ✅ | `same-origin` en tres capas: `SecurityHeadersMiddleware` (API), `next.config.ts` (front) y regla `CorpSiFalta` en `public/web.config` (respuestas que genera IIS). **`/storage/*` queda excluido a propósito** en la regla de IIS: son los archivos que suben los solicitantes y se muestran en un iframe. Observación de ADEM del 25/08/2026, fuera de la matriz |
| Rate limiting endpoints públicos | ✅ | `throttle:3,1` en `forgot-password`, `throttle:3,5` en `solicitar-acceso` |
| Notificaciones — acceso propio | ✅ | `show()` en `NotificacionLogController` verifica `user_id === auth user id` |
| Eliminación de usuarios | ✅ | `UserController::destroy()` bloquea auto-eliminación y eliminación del último admin |
| JWT en HttpOnly cookie | ⚠️ | `AuthController::respondWithToken()` emite cookie `comecyt_auth` (HttpOnly; `Secure` y `SameSite` salen de `COOKIE_SECURE` y `COOKIE_SAME_SITE`). **En el servidor (11/09/2026) el `.env` tiene `COOKIE_SECURE=false` y `COOKIE_SAME_SITE=Lax`: la cookie sale sin `Secure`.** Pendiente poner `true`/`Strict`. `ReadJwtFromCookieMiddleware` lo inyecta como Bearer. `api.ts` usa `withCredentials: true`. Frontend ya no usa `localStorage`. |
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
| SMTP real de producción | **Crítico** | Verificado el 11/09/2026: `MAIL_MAILER=smtp` → `127.0.0.1:2525`, sin credenciales, y **nada escucha en el 2525**. No sale ningún correo: restablecimiento de contraseña, aprobación de accesos y notificaciones. Faltan los datos del SMTP institucional |
| `Cross-Origin-Resource-Policy` en `/storage/*` | Bajo | Excluido de `CorpSiFalta` hasta poder probar la vista previa con un archivo real subido por la aplicación. Confirmado eso, incluirlo es cambiar el `negate="true"` por su preCondition en pareja |
| CSP con `script-src 'unsafe-inline'` | Medio | El front permite scripts embebidos, que es justo lo que aprovecha un XSS. **No es hallazgo de ADEM hoy, pero es el candidato más probable del próximo escaneo.** Solución de fondo: nonces o hashes, toca código de la app |
| **Licencia de Windows Server (Evaluation)** | **Crítico** | Al 11/09/2026 quedan **7 días** de gracia (vence ~18/09/2026). Al vencer, el servidor se apaga solo cada hora. Activar Standard con la clave institucional (`DISM /online /Set-Edition:ServerStandard /ProductKey:<clave> /AcceptEula`, reinicia) o, como puente, `slmgr /rearm` + reinicio (quedan 4 rearmes al 11/09/2026). Ver `docs/ESTADO_ACTUAL.md` |
| **Cuentas de prueba en producción** | **Crítico** | Las 4 cuentas de "Usuarios de Prueba" existen en `comecyt_prod` y son las únicas; 3 con la contraseña del seeder. Crear cuentas reales y cambiar la contraseña o desactivar estas **antes** de que infraestructura pruebe el dominio |
| `comecyt:backup-db` falla cada noche | Alto | `BackupDatabase.php` arma `pg_dump ... \| gzip -9 > archivo` y en Windows ninguno está en el PATH (`'pg_dump' is not recognized`). El respaldo real lo hace la tarea `COMECYT-Backup-Diario` (`backup.ps1`, con `C:\pgsql\bin\pg_dump.exe -Fc`), que sí funciona. Corregir el comando o quitarlo de `routes/console.php` |
| Respaldos sin copia fuera del servidor | Alto | Todos los dumps están en `F:\Desarrollo Tecnologico\backups\`. Si se pierde el servidor, se pierden los respaldos |
| Windows Update detenido | Alto | Servicio `wuauserv` detenido; último parche el 27/03/2026; 3 pendientes (incluida la acumulativa 2026-09). Aplicar en ventana junto con la licencia |
| Permisos del `.env` | Medio | `BUILTIN\Users` lo lee e `IIS_IUSRS` lo escribe (ACL heredada). Restringir |
| Endurecimiento de red (agosto) | Medio | Firma SMB, puertos 2179/135, RDP solo desde la VPN. Análisis listo **sin aplicar**: `Desktop\ADEM\_v2_agosto\ANALISIS_SMB_Y_PUERTOS.md` |
| Confirmaciones de infraestructura sobre el balanceador | Alto | Rango de IPs de origen, HTTP→HTTPS en el balanceador, health check, límite de 50 MB, timeouts. Correo listo en `Desktop\ADEM\_v4_dominio_sep11\`. Ver `docs/DOMINIO_BALANCEADOR.md` §8 |
| `serverFetch` falla con certificado autofirmado | Medio | **Previo al dominio, detectado el 11/09/2026.** Los Server Components llaman a `https://10.250.36.241/api` y Node rechaza el certificado (`DEPTH_ZERO_SELF_SIGNED_CERT`); el `catch` lo oculta y las páginas renderizadas en servidor salen con listas vacías. Opciones: `NODE_EXTRA_CA_CERTS` con el certificado `BBC4F9F9…` en el entorno NSSM. **Ojo:** al funcionar, todas esas llamadas llegan a Laravel desde la IP del servidor, y el rate limit por IP las contaría juntas |
| C:\comecyt limpieza | Bajo | La tarea `COMECYT-LimpiarDirectorioViejo` **nunca se ha ejecutado** (verificado el 11/09/2026); el directorio sigue ahí, vacío. Borrarlo a mano |
| Notificaciones bell en tiempo real | Bajo | Hoy carga al montar layout. Requiere polling o WebSockets |
| Página dedicada `/solicitante/informes` | Bajo | El upload está inline en detalle de solicitud |
| Imágenes del carrusel en producción | Medio | Verificado el 11/09/2026: los 4 slides tienen `imagen_url` nula (no dependen de picsum). Subir imágenes reales vía `/admin/carrusel` |
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
