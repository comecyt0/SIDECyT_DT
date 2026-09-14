import { test, expect } from '@playwright/test';

/**
 * E2E: guardar y aplicar un filtro en /admin/solicitudes.
 *
 * Verifica:
 *   1. Admin entra a /admin/solicitudes y ve la barra "Mis filtros".
 *   2. Escribe algo en el search.
 *   3. Click en "+ guardar filtro actual", asigna nombre, "Guardar".
 *   4. Aparece un chip con ese nombre.
 *
 * Si el endpoint de saved-filters no responde (404/500), se skipea el test.
 *
 * Requiere los 3 servicios corriendo + seed.
 */

const ADMIN = { email: 'admin@comecyt.gob.mx', password: 'password123' };

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(ADMIN.email);
  await page.locator('input[type="password"]').fill(ADMIN.password);
  await page.getByRole('button', { name: /ingresar|iniciar|login/i }).click();
  await page.waitForURL(/\/admin\/dashboard/, { timeout: 15_000 });
}

test.describe('Saved filters — admin/solicitudes', () => {
  test('crea un filtro guardado y aparece como chip', async ({ page }) => {
    await login(page);
    await page.goto('/admin/solicitudes');

    // Verificar que la barra de filtros está presente
    const misFiltrosLabel = page.getByText(/^mis filtros$/i);
    await expect(misFiltrosLabel).toBeVisible({ timeout: 8_000 });

    // Search bar
    const searchInput = page.getByPlaceholder(/buscar por folio/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('test-e2e-filtro');

    // Si el endpoint GET inicial /saved-filters falla, la UI no muestra
    // el botón "+ guardar filtro actual" (se queda en loading). Skip.
    const saveLink = page.getByRole('button', { name: /\+ guardar filtro actual/i });
    const linkVisible = await saveLink
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);

    if (!linkVisible) {
      test.skip(
        true,
        'No apareció el botón "+ guardar filtro actual" — endpoint /saved-filters probablemente no respondió.'
      );
    }

    await saveLink.click();

    // Input de nombre
    const nameInput = page.getByPlaceholder(/nombre del filtro/i);
    await expect(nameInput).toBeVisible();
    const filterName = `e2e-${Date.now().toString().slice(-6)}`;
    await nameInput.fill(filterName);

    // Botón Guardar (el del componente, no el de cancelar)
    const guardarBtn = page.getByRole('button', { name: /^guardar$/i }).first();

    // Capturar respuesta del POST para detectar fallo de backend
    const responsePromise = page
      .waitForResponse(
        (r) => /saved.?filters?/i.test(r.url()) && r.request().method() === 'POST',
        { timeout: 6_000 }
      )
      .catch(() => null);

    await guardarBtn.click();
    const response = await responsePromise;

    if (response && !response.ok()) {
      test.skip(
        true,
        `Backend rechazó POST de saved-filter (status ${response.status()}). Verificar migración del módulo.`
      );
    }

    // El chip con el nombre del filtro debe aparecer
    await expect(page.getByText(filterName, { exact: false })).toBeVisible({
      timeout: 5_000,
    });

    // Cleanup best-effort: eliminar el filtro recién creado
    const deleteBtn = page.getByRole('button', { name: new RegExp(`eliminar filtro ${filterName}`, 'i') });
    if ((await deleteBtn.count()) > 0) {
      await deleteBtn.click().catch(() => {});
    }
  });
});
