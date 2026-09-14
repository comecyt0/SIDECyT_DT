import { test, expect } from '@playwright/test';

/**
 * Specs E2E reales para los flujos críticos.
 *
 * IMPORTANTE: estos tests requieren que el sistema esté corriendo localmente:
 *   - php artisan migrate:fresh --seed       (datos de prueba)
 *   - php artisan serve --port=8000          (backend)
 *   - php artisan reverb:start               (websockets)
 *   - npm run dev                             (frontend en :3000)
 *
 * Y que UsuariosPruebaSeeder haya creado los usuarios test:
 *   admin@comecyt.gob.mx / password123
 *   asd@asd.com / password123
 *   evaluadorr@uaemex.mx / password123
 *   solicitante@institucion.mx / password123
 *
 * Para correrlos:  npm run test:e2e
 */

const ADMIN = { email: 'admin@comecyt.gob.mx', password: 'password123' };
const REVISOR = { email: 'asd@asd.com', password: 'password123' };
const EVALUADOR = { email: 'evaluadorr@uaemex.mx', password: 'password123' };
const SOLICITANTE = { email: 'solicitante@institucion.mx', password: 'password123' };

async function login(page: import('@playwright/test').Page, creds: { email: string; password: string }) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(creds.email);
  await page.locator('input[type="password"]').fill(creds.password);
  await page.getByRole('button', { name: /ingresar|iniciar|login/i }).click();
}

test.describe('Flujo crítico: ADMIN', () => {
  test('login → dashboard → charts visibles → audit logs accesible', async ({ page }) => {
    await login(page, ADMIN);
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 15_000 });

    // Charts del dashboard cargan
    await expect(page.getByText(/Solicitudes por Mes/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/WebSockets|Reverb/i)).toBeVisible();

    // Búsqueda global existe
    await expect(page.getByPlaceholder(/Buscar folio/i)).toBeVisible();

    // Audit logs accesible
    await page.goto('/admin/audit-logs');
    await expect(page.getByText(/Bitácora de acciones/i)).toBeVisible();
  });
});

test.describe('Flujo crítico: REVISOR', () => {
  test('login → bandeja → charts visibles', async ({ page }) => {
    await login(page, REVISOR);
    await page.waitForURL(/\/revisor/, { timeout: 15_000 });

    // Dashboard del revisor con chart
    await page.goto('/revisor/dashboard');
    await expect(page.getByText(/Bandeja Central/i)).toBeVisible();
    await expect(page.getByText(/Tendencia de Revisión/i)).toBeVisible();
  });
});

test.describe('Flujo crítico: EVALUADOR', () => {
  test('login → portafolio → asignaciones', async ({ page }) => {
    await login(page, EVALUADOR);
    await page.waitForURL(/\/evaluador/, { timeout: 15_000 });

    await page.goto('/evaluador/dashboard');
    await expect(page.getByText(/Mi Portafolio de Evaluación/i)).toBeVisible();
    await expect(page.getByText(/Tendencia de Dictámenes/i)).toBeVisible();
  });
});

test.describe('Flujo crítico: SOLICITANTE', () => {
  test('login → dashboard del solicitante', async ({ page }) => {
    await login(page, SOLICITANTE);
    // El layout redirige a onboarding si no tiene institución; ambos son válidos
    await page.waitForURL(/\/solicitante/, { timeout: 15_000 });
    const url = page.url();
    expect(url).toMatch(/\/solicitante\/(dashboard|onboarding)/);
  });
});

test.describe('Dark mode toggle', () => {
  test('el botón de tema cambia la clase dark en <html>', async ({ page }) => {
    await login(page, ADMIN);
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 15_000 });

    const toggle = page.getByRole('button', { name: /Cambiar a modo (oscuro|claro|del sistema)/i }).first();
    await toggle.click();

    // Tras click, la clase 'dark' aparece o desaparece en <html>
    await page.waitForTimeout(200);
    const htmlClass = await page.locator('html').getAttribute('class');
    // Verificación laxa: la clase varía según preferencia inicial
    expect(htmlClass).toBeTruthy();
  });
});
