#!/usr/bin/env bash
# =============================================================================
# COMECYT — Script de Deployment a Producción
# Uso: bash deploy.sh
# Requiere: PHP 8.2+, Composer, Node 18+, PostgreSQL 15+
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()    { echo -e "${GREEN}[OK]${NC}  $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERR]${NC}  $1"; exit 1; }
section() { echo -e "\n${YELLOW}=== $1 ===${NC}"; }

# ── Verificar que estamos en el directorio correcto ──────────────────────────
[[ -f "artisan" ]] || error "Ejecuta este script desde apps/api/"

section "1. Verificar entorno de producción"

# ── Hard-fail si APP_ENV/APP_DEBUG no son seguros (SEV-1: APP_DEBUG=true expone stack traces) ─
[[ "${APP_ENV:-}" == "production" ]] || error "APP_ENV debe ser 'production' en deploy. Actualmente: '${APP_ENV:-vacío}'"
[[ "${APP_DEBUG:-}" == "false" ]]   || error "APP_DEBUG debe ser 'false' en producción. Actualmente: '${APP_DEBUG:-vacío}'"
[[ -n "${APP_KEY:-}" ]]             || error "APP_KEY no está definida. Ejecuta: php artisan key:generate --force"
[[ -n "${JWT_SECRET:-}" ]]          || error "JWT_SECRET no está definida. Ejecuta: php artisan jwt:secret --force"
[[ -n "${DB_DATABASE:-}" ]]         || error "DB_DATABASE no está definida en .env"

# ── Detección de credenciales débiles / por defecto (SEV-1) ───────────────────
if grep -qE '^DB_PASSWORD=(12345|password|admin|comecyt|root|secret|1234567)' .env 2>/dev/null; then
    error "DB_PASSWORD débil detectada en .env. Rótala antes de deployar (ALTER USER ... WITH PASSWORD '...')."
fi
if grep -qE '^DB_PASSWORD=$' .env 2>/dev/null; then
    error "DB_PASSWORD está vacía en .env."
fi
if grep -qE '^JWT_SECRET=(secret|change-?me|local|dev)' .env 2>/dev/null; then
    error "JWT_SECRET débil detectada. Ejecuta: php artisan jwt:secret --force"
fi

# ── Validar configuración CORS estricta en producción (SEV-2) ─────────────────
if [[ -z "${CORS_ALLOWED_ORIGINS:-}" ]]; then
    error "CORS_ALLOWED_ORIGINS no está definida. Setéala con la lista CSV de orígenes permitidos."
fi
if [[ "${CORS_ALLOWED_ORIGINS}" == *"*"* ]] || [[ "${CORS_ALLOWED_ORIGINS}" == *"localhost"* ]]; then
    error "CORS_ALLOWED_ORIGINS no debe contener '*' ni 'localhost' en producción. Valor: ${CORS_ALLOWED_ORIGINS}"
fi

# ── Permisos restrictivos del .env (M1) ───────────────────────────────────────
ENV_PERMS=$(stat -c "%a" .env 2>/dev/null || stat -f "%Lp" .env 2>/dev/null || echo "???")
if [[ "$ENV_PERMS" != "600" ]] && [[ "$ENV_PERMS" != "400" ]]; then
    warn ".env tiene permisos $ENV_PERMS. Recomendado: chmod 600 .env"
    chmod 600 .env && info "Permisos de .env corregidos a 600"
fi

info "Variables de entorno básicas presentes y validadas"

section "2. Instalar dependencias PHP (producción)"
composer install --no-dev --optimize-autoloader --no-interaction
info "Composer OK"

section "3. Limpiar y optimizar cachés de Laravel"
php artisan config:clear
php artisan config:cache
php artisan route:clear
php artisan route:cache
php artisan view:clear
php artisan view:cache
php artisan event:cache
info "Cachés de Laravel optimizadas"

section "4. Migraciones de base de datos"
php artisan migrate --force
info "Migraciones ejecutadas"

section "5. Seeders básicos (roles, institución COMECYT, admin)"
php artisan db:seed --class=DatabaseSeeder --force
info "Seeders ejecutados (APP_ENV=production omite UsuariosPruebaSeeder automáticamente)"

section "6. Storage symlink"
php artisan storage:link 2>/dev/null || warn "Storage link ya existe — OK"
info "Storage symlink listo"

section "7. Permisos de directorios (least privilege)"
# Default restrictivo: dueño rwx, grupo y otros r-x (755).
chmod -R 755 storage bootstrap/cache
# Carpetas que Laravel sí escribe → grupo con escritura (775).
chmod -R 775 storage/framework/cache storage/framework/sessions storage/framework/views storage/logs
# Ownership al usuario del servicio web (ajusta si no es www-data).
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || warn "No se pudo cambiar owner (¿no eres root?). Hazlo manualmente: sudo chown -R www-data:www-data storage bootstrap/cache"
info "Permisos endurecidos: 755 base + 775 sólo en carpetas de escritura runtime"

section "8. Scheduler — configurar crontab"

CRON_CMD="* * * * * cd $(pwd) && php artisan schedule:run >> /dev/null 2>&1"
CRON_EXISTS=$(crontab -l 2>/dev/null | grep -F "schedule:run" || true)

if [[ -z "$CRON_EXISTS" ]]; then
    (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
    info "Crontab configurado: schedule:run cada minuto"
else
    warn "Crontab ya tiene schedule:run — no se modificó"
fi

section "9. JWT secret — verificar"
php artisan tinker --execute="echo app('tymon.jwt.provider.jwt') ? 'JWT OK' : 'JWT FAIL';" 2>/dev/null | grep -q "JWT OK" \
    && info "JWT configurado" \
    || warn "No se pudo verificar JWT — revisa JWT_SECRET en .env"

section "10. Health check"
php artisan about --only=Environment 2>/dev/null | grep -E "Environment|Debug|Version" || true

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  COMECYT desplegado exitosamente en producción ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo "Próximos pasos manuales:"
echo "  1. Configurar SMTP en .env (MAIL_MAILER=smtp + credenciales)"
echo "  2. Apuntar el dominio al servidor (DNS)"
echo "  3. Configurar SSL con Certbot: certbot --nginx -d tudominio.mx"
echo "  4. Reiniciar PHP-FPM: sudo systemctl restart php8.2-fpm"
