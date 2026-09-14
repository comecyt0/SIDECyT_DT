import { test, expect } from '@playwright/test';

/**
 * E2E: persistencia del toggle de tema (dark mode).
 *
 * Verifica:
 *   1. Tras login del admin, click en el toggle aplica clase `dark` en <html>.
 *   2. localStorage['theme-mode'] se actualiza.
 *   3. Tras reload, la clase `dark` (o `light`) persiste según el valor guardado.
 *
 * Requiere los 3 servicios corriendo (npm run dev + php artisan serve + Reverb).
 */

const ADMIN = { email: 'admin@comecyt.gob.mx', password: 'password123' };

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(ADMIN.email);
  await page.locator('input[type="password"]').fill(ADMIN.password);
  await page.getByRole('button', { name: /ingresar|iniciar|login/i }).click();
  await page.waitForURL(/\/admin\/dashboard/, { timeout: 15_000 });
}

test.describe('Dark mode — persistencia tras reload', () => {
  test('el modo seleccionado sobrevive a un reload completo', async ({ page }) => {
    await login(page);

    // Esperar a que el ThemeToggle se haya hidratado (no es el placeholder w-9 h-9)
    const toggle = page
      .getByRole('button', { name: /Cambiar a modo (oscuro|claro|del sistema)/i })
      .first();
    await expect(toggle).toBeVisible({ timeout: 5_000 });

    // Estado inicial — leer clase y storage
    const initialClass = (await page.locator('html').getAttribute('class')) ?? '';
    const initiallyDark = initialClass.includes('dark');

    // Click → cambiar modo
    await toggle.click();
    await page.waitForTimeout(250); // micro-espera para que useEffect aplique la clase

    const afterClass = (await page.locator('html').getAttribute('class')) ?? '';
    const afterDark = afterClass.includes('dark');

    // El estado de la clase `dark` debió cambiar (light↔dark) o transicionar a system.
    // No asumimos hacia qué dirección — sólo que cambió o que el storage se grabó.
    const storedMode = await page.evaluate(() => localStorage.getItem('theme-mode'));
    expect(storedMode).toBeTruthy();
    expect(['light', 'dark', 'system']).toContain(storedMode);

    // Si el toggle es light↔dark, los estados deben diferir.
    if (storedMode !== 'system') {
      expect(afterDark).toBe(storedMode === 'dark');
      expect(afterDark).not.toBe(initiallyDark);
    }

    // Reload — el setting persiste
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(400); // hidratación del ThemeProvider

    const reloadedClass = (await page.locator('html').getAttribute('class')) ?? '';
    const reloadedDark = reloadedClass.includes('dark');
    const reloadedStored = await page.evaluate(() => localStorage.getItem('theme-mode'));

    expect(reloadedStored).toBe(storedMode);
    if (storedMode === 'dark') expect(reloadedDark).toBe(true);
    if (storedMode === 'light') expect(reloadedDark).toBe(false);
    // Para 'system' la clase depende del prefers-color-scheme del runner, no se fuerza.
  });
});
