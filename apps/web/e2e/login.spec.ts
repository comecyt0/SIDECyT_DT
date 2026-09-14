import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
  test('renderiza el formulario con email, password y botón de ingreso', async ({ page }) => {
    await page.goto('/login');

    // Campos del formulario
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Botón de submit — el texto real en la página es "Ingresar al Sistema"
    await expect(
      page.getByRole('button', { name: /ingresar|iniciar|entrar|login/i })
    ).toBeVisible();
  });

  test('muestra el carrusel y los enlaces públicos (forgot-password, solicitar-acceso)', async ({ page }) => {
    await page.goto('/login');

    // Links públicos
    await expect(page.getByRole('link', { name: /olvidaste/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /solicitar acceso/i })).toBeVisible();

    // El heading principal del formulario
    await expect(page.getByRole('heading', { name: /bienvenido/i })).toBeVisible();
  });
});
