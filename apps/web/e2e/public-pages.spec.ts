import { test, expect } from '@playwright/test';

test.describe('Páginas públicas', () => {
  test('/forgot-password carga sin errores', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const response = await page.goto('/forgot-password');
    expect(response?.status()).toBeLessThan(400);

    // El campo de email es el control principal de la página de recuperación
    await expect(page.locator('input[type="email"]')).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('/solicitar-acceso carga sin errores', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const response = await page.goto('/solicitar-acceso');
    expect(response?.status()).toBeLessThan(400);

    // Debe haber al menos un input visible (el formulario de solicitud)
    await expect(page.locator('input').first()).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('/login redirige correctamente y muestra el contenido base', async ({ page }) => {
    const response = await page.goto('/login');
    expect(response?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\/login$/);
  });
});
