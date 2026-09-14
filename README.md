# 🚀 COMECYT — Gestión de Proyectos de Desarrollo Tecnológico y Vinculación

![Status](https://img.shields.io/badge/status-producci%C3%B3n-green)
![Version](https://img.shields.io/badge/version-8.1.0-blue)
![PHP](https://img.shields.io/badge/PHP-8.4-777BB4)
![Laravel](https://img.shields.io/badge/Laravel-13.x-FF2D20)
![Next.js](https://img.shields.io/badge/Next.js-16.x-000000)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-336791)
![Audited](https://img.shields.io/badge/security-auditado-success)

Sistema institucional del **Consejo Mexiquense de Ciencia y Tecnología (COMECYT)** para administrar el ciclo completo de convocatorias de financiamiento a empresas y proyectos de desarrollo tecnológico:

```
publicación → postulación → revisión → evaluación → convenio → ministración → seguimiento → cierre
```

---

## 📚 Documentación

| Tu objetivo | Lee |
|---|---|
| 🚀 **Instalar en Windows Server** | [`docs/WINDOWS_DEPLOYMENT.md`](docs/WINDOWS_DEPLOYMENT.md) — guía completa del despliegue en IIS |
| 🛠️ **Operar el sistema día a día** | [`docs/OPERATIONS.md`](docs/OPERATIONS.md) — comandos, monitoreo, backups, troubleshooting |
| ✅ **Checklist de producción** | [`apps/api/PRODUCTION_CHECKLIST.md`](apps/api/PRODUCTION_CHECKLIST.md) — variables de entorno, servicios, SSL |
| 🤖 **Guía para IA (Claude Code)** | [`CLAUDE.md`](CLAUDE.md) — arquitectura, reglas críticas, errores documentados |

---

## ⚡ Quick Start (DEV LOCAL)

> Para deploy en producción, ver [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

### Prerequisitos

- PHP 8.2+ con extensiones `pgsql`, `mbstring`, `sodium`
- Composer 2.x
- Node.js 20 LTS
- PostgreSQL 18

### Setup

```bash
# 1. Clone
git clone https://github.com/comecyt0/Desarrollo-Tecnol-gico.git comecyt
cd comecyt

# 2. Base de datos local
sudo -u postgres psql <<'SQL'
CREATE USER comecyt WITH PASSWORD 'comecyt_dev_password';
CREATE DATABASE comecyt_dev OWNER comecyt ENCODING 'UTF8';
GRANT ALL PRIVILEGES ON DATABASE comecyt_dev TO comecyt;
SQL

# 3. Backend
cd apps/api
cp .env.example .env
# Edita DB_PASSWORD, APP_ENV=local, APP_DEBUG=true
composer install
php artisan key:generate
php artisan jwt:secret
php artisan storage:link
php artisan migrate --seed

# 4. Frontend
cd ../web
cp .env.example .env.local
# Edita NEXT_PUBLIC_API_URL=http://localhost:8000/api
npm install --legacy-peer-deps
```

### Arrancar (2 terminales)

```bash
# Terminal 1
cd apps/api && php artisan serve         # → http://localhost:8000

# Terminal 2
cd apps/web && npm run dev               # → http://localhost:3000
```

### Login de prueba (solo dev local)

`php artisan migrate --seed` crea un usuario por rol (admin, revisor, evaluador, solicitante) con
`UsuariosPruebaSeeder`. Los correos y la contraseña están en ese seeder; no se publican aquí.

> ⚠️ El seeder se omite cuando `APP_ENV=production`. Nunca reutilices esas cuentas ni su contraseña
> fuera de un entorno local.

---

## 🏗️ Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript |
| Backend | Laravel 11 (API-only) |
| BD | PostgreSQL 18 |
| Estilos | Tailwind v4 + Shadcn UI v3 |
| Auth | JWT HS256 en HttpOnly cookie + 2FA TOTP |
| Real-time | Laravel Reverb (WebSocket) |
| Hashing | Argon2id |
| Hosting | IIS 10 + PHP 8.4 FastCGI + NSSM (Windows Server 2022) |
| CI/CD | GitHub Actions (Semgrep, Gitleaks, Dependabot, SBOM) |

Detalles en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## 🛡️ Seguridad

Sistema auditado con la skill `ciberseguridad-auditor-integral v2.0`:

- ✅ 17 modelos endurecidos contra mass-assignment
- ✅ Rate limiting de 5 capas (IP, email, global, endpoint, gateway DDoS)
- ✅ CSP estricto + HSTS + headers seguros
- ✅ CORS estricto en producción (fail-fast en deploy)
- ✅ PII scrubbing en Sentry (LFPDPPP-compliant)
- ✅ File upload con validación MIME real (finfo)
- ✅ Allowlist de hostnames para imágenes (anti-SSRF)
- ✅ Dependabot + Semgrep + Gitleaks en CI
- ✅ SBOM (CycloneDX + SPDX) por release
- ✅ Runbook IR + plan de rotación de secretos

Para reportar vulnerabilidades: [`docs/security/SECURITY.md`](docs/security/SECURITY.md).

---

## 📊 Métricas del repo

| Métrica | Valor |
|---|---|
| Modelos Eloquent | 36 |
| Controllers | 20 |
| Migraciones | 59 |
| Endpoints | 126 |
| Workflows CI | 4 (tests, security-sast, sbom-release, release) |
| Documentación | ~4,500 líneas en 14 archivos |

---

## 📋 Licencia

Software propiedad institucional del **Consejo Mexiquense de Ciencia y Tecnología (COMECYT)**, organismo público descentralizado del Gobierno del Estado de México. Ver [`LICENSE`](LICENSE).

Usos permitidos limitados a operación institucional, auditoría autorizada y estudios académicos sin fines de lucro previa autorización.

---

## 🤝 Contribuir

Lee [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) antes de enviar tu primer PR.

Resumen:
1. Conventional Commits (`feat:`, `fix:`, `sec:`, `chore:`, `docs:`)
2. PRs pequeños (< 500 líneas idealmente)
3. Tests para el código nuevo
4. CI debe pasar antes del merge
5. Code review obligatorio

---

## 📞 Contacto

- **Bugs / features:** [GitHub Issues](https://github.com/comecyt0/Desarrollo-Tecnol-gico/issues)
- **Soporte general:** soporte@comecyt.gob.mx
- **Vulnerabilidades de seguridad:** ver [`SECURITY.md`](docs/security/SECURITY.md) (NO Issues públicos)
- **Datos personales / LFPDPPP:** Unidad de Transparencia COMECYT

---

<sub>
**Versión:** 8.1.0 — 2026-06-30 (migración a F:\Desarrollo Tecnologico) · 2026-09-11: producción en https://sidecyt-comecyt.edomex.gob.mx/ detrás del balanceador ([docs/DOMINIO_BALANCEADOR.md](docs/DOMINIO_BALANCEADOR.md))<br>
**Estado:** Producción ready, auditado, documentado, CI/CD completo, aspectos legales preparados<br>
**Próxima revisión obligatoria:** 2026-12-14 (semestral)
</sub>

# SIDECyT_DT
