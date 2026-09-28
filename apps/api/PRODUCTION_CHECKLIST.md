# Production Checklist — COMECYT Sistema

Lista accionable para llevar el sistema de dev a prod. Marcar cada ítem antes de cortar tráfico real.

## Política: 100% local, cero terceros

Este sistema **no depende de ningún SaaS ni CDN externo** en runtime. Todo lo
visible al usuario se sirve desde el propio servidor:

- Fuentes: descargadas en build time por `next/font` (no `fonts.googleapis.com` ni `fonts.bunny.net`)
- Imágenes del carrusel: en `apps/web/public/carrusel/` (no Unsplash ni Picsum)
- Logos: en `apps/web/public/` (no CDN externo)
- Notificaciones push: Reverb WebSocket local (no Pusher SaaS, no Firebase)
- Errores: log en disco (`storage/logs/`). Sentry está soportado pero **DSN vacío por default**; si la institución monta Sentry self-hosted, basta con setear `SENTRY_LARAVEL_DSN`.

Lo único externo en el código son enlaces visibles al sitio público de la
institución (ej. `https://comecyt.gob.mx`) dentro de plantillas de email, que
son URLs hacia el dominio del cliente, no servicios de terceros.

## 1. Variables de entorno críticas

| Variable | Valor producción | Notas |
|---|---|---|
| `APP_ENV` | `production` | **Bloquea** `UsuariosPruebaSeeder` |
| `APP_DEBUG` | `false` | No exponer stacktrace |
| `APP_URL` | `https://dominio.edomex.gob.mx` | Mismo dominio que la UI cuando IIS/Nginx sirve ambos (servidor COMECYT: `https://sidecyt-comecyt.edomex.gob.mx`). Define las URLs de `/storage` |
| `NEXT_PUBLIC_APP_URL` | `https://dominio.edomex.gob.mx` | Frontend público |
| `JWT_SECRET` | (regenerar con `php artisan jwt:secret`) | Nunca reusar el dev |
| `DB_PASSWORD` | (rotar) | Secret store, no en git |
| `COOKIE_DOMAIN` | `.dominio.edomex.gob.mx` | Para que JWT cookie cruce subdominios |
| `COOKIE_SECURE` | `true` | HTTPS only |
| `COOKIE_SAME_SITE` | `Strict` | Hardening |
| `MAIL_MAILER` | `smtp` | Quitar `log` |
| `MAIL_HOST` / `MAIL_USERNAME` / `MAIL_PASSWORD` | (proveedor real) | SMTP institucional |
| `SENTRY_LARAVEL_DSN` | (DSN real) | O dejar vacío |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | (regenerar para prod) | `php artisan tinker --execute='echo json_encode(Minishlink\WebPush\VAPID::createVapidKeys());'` |
| `TSA_URL` / `TSA_USERNAME` / `TSA_PASSWORD` | (cuando los entregue TIC) | Sello NOM-151 |
| `CORS_ALLOWED_ORIGINS` | `https://dominio.edomex.gob.mx` | Lista explícita, nunca `*` con credentials |
| `RATE_LIMIT_MAX` | `300` (default) o `600+` si hay NAT corporativo | |
| `TRUSTED_PROXIES` | IPs o CIDR del reverse proxy / balanceador | Sin esto, detrás de un balanceador todos los usuarios comparten IP y el rate limit de login los bloquea juntos. Servidor COMECYT: `127.0.0.1,100.64.0.0/10`, que debe coincidir con `web.config` (ver `docs/DOMINIO_BALANCEADOR.md`) |
| `NEXT_PUBLIC_API_URL` (front) | `/api` | Relativa si UI y API comparten dominio: el mismo build sirve por cualquier host autorizado. Con URL relativa, definir `API_INTERNAL_URL` (absoluta) en el entorno del servicio Node para `serverFetch` |

Personalización institucional (Next.js — se hornea en build):
- `NEXT_PUBLIC_INSTITUTION_NAME`
- `NEXT_PUBLIC_INSTITUTION_FULL_NAME`
- `NEXT_PUBLIC_INSTITUTION_TAGLINE`
- `NEXT_PUBLIC_INSTITUTION_STATE`
- `NEXT_PUBLIC_INSTITUTION_EMAIL`
- `NEXT_PUBLIC_INSTITUTION_EMAIL_HINT`
- `NEXT_PUBLIC_INSTITUTION_SECURITY_BADGE`

## 2. Assets institucionales requeridos

Estos archivos NO son código — los provee el área institucional:

- [x] `apps/web/public/identidad/*` — logos oficiales COMECYT 2026 y convivencia; favicons generados con `apps/web/scripts/favicons.php` (E50, `docs/IDENTIDAD.md`)
- [ ] `apps/web/public/logo-edomex.svg` — Escudo oficial Gobierno Estado de México (o `NEXT_PUBLIC_EDOMEX_LOGO_URL` apuntando a CDN gubernamental)
- [ ] Imágenes del carrusel del login (admin las sube vía `/admin/carrusel`, mientras tanto usa `picsum.photos`)
- [ ] Favicon SVG e iconos PWA en `apps/web/public/`

## 3. Bases de datos

```bash
cd apps/api
php artisan migrate --force      # migra estructuras
php artisan db:seed --force      # poblar catálogos (NO usuarios de prueba — bloqueados por APP_ENV)
php artisan db:seed --class=CarouselSlideSeeder
```

Backup automático recomendado:
```bash
0 2 * * * pg_dump -Fc comecyt_prod > /backups/comecyt_$(date +\%F).dump
```

## 4. Servicios runtime (Supervisor)

```bash
sudo cp resources/deploy/comecyt-queue.conf      /etc/supervisor/conf.d/
sudo cp resources/deploy/comecyt-scheduler.conf  /etc/supervisor/conf.d/
sudo cp resources/deploy/comecyt-reverb.conf     /etc/supervisor/conf.d/
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start comecyt-queue:* comecyt-scheduler comecyt-reverb
```

Verificar status:
```bash
sudo supervisorctl status
# Esperado:
#   comecyt-queue:comecyt-queue_00   RUNNING
#   comecyt-queue:comecyt-queue_01   RUNNING
#   comecyt-scheduler                RUNNING
#   comecyt-reverb                   RUNNING
```

## 5. Nginx — reverse proxy

- Frontend Next.js (build estático + nodes) en `/`
- Backend Laravel en `/api/*` → `localhost:8000`
- Reverb WebSocket en `/ws` → `localhost:8080` con `Upgrade: websocket`
- HSTS, redirect HTTP→HTTPS
- CSP headers (revisar `SecurityHeadersMiddleware`)

```nginx
location /api {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /ws {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400;
}
```

## 6. SSL

```bash
sudo certbot --nginx -d dominio.edomex.gob.mx -d ws.dominio.edomex.gob.mx
sudo systemctl status certbot.timer  # renovación automática
```

## 7. Validación de despliegue

```bash
php artisan app:deploy-check         # check interno
php artisan route:list | grep admin  # verifica rutas
curl -I https://dominio.edomex.gob.mx/api/up   # health endpoint
```

Smoke test mínimo:
1. Login admin → ver dashboard con stats > 0
2. Cambiar idioma (ES↔EN) — strings se traducen
3. Toggle dark mode — persiste
4. Notificaciones bell carga sin error
5. WebSocket: abrir DevTools, ver conexión `wss://ws.dominio…` activa

## 8. Monitoreo

- [ ] Sentry DSN configurado (errores PHP + JS)
- [ ] Logs Laravel rotando: `LOG_DAILY_DAYS=30`, `LOG_SECURITY_DAYS=90`
- [ ] Uptime monitor externo (UptimeRobot, Statuscake, etc.) en `/api/up`
- [ ] Alertas SMTP a admins en errores 500 (configurable vía Sentry)

## 9. Auditoría de seguridad (presalida)

- [ ] Cambiar `JWT_SECRET`, `APP_KEY`, `REVERB_APP_SECRET`
- [ ] Revisar usuarios admin de prueba — eliminados (`APP_ENV=production` los bloquea, pero confirmar)
- [ ] `php artisan storage:link` para `/storage/` accesible
- [ ] Permisos: `storage/`, `bootstrap/cache/` writable por usuario `www-data`
- [ ] Headers de seguridad — verificar con securityheaders.com
- [ ] HSTS preload (opcional)
