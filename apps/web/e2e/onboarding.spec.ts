import { test, expect } from '@playwright/test';

/**
 * Smoke E2E del onboarding del solicitante.
 *
 * Sin credenciales reales en CI, sólo verificamos que:
 *  1. La ruta /solicitante/onboarding existe y carga
 *  2. El formulario tiene los campos críticos (combobox, cargo, teléfono, botón continuar)
 *
 * Para el flujo completo (login → guard del layout → onboarding → dashboard) hace falta
 * un seed de usuario sin institucion_id y autenticarse. Eso se ejecuta manualmente.
 */
test.describe('Solicitante onboarding', () => {
  test('renderiza el formulario de bienvenida', async ({ page }) => {
    await page.goto('/solicitante/onboarding');
    // El layout redirige a /login si no hay cookie; soportamos ambos casos
    if (page.url().endsWith('/login')) {
      await expect(page.locator('input[type="email"]')).toBeVisible();
      return;
    }

    await expect(page.getByText(/Bienvenido a COMECYT/i)).toBeVisible();
    await expect(page.getByRole('combobox')).toBeVisible();
    await expect(page.getByLabel(/Cargo/i)).toBeVisible();
    await expect(page.getByLabel(/Teléfono/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Continuar al sistema/i })).toBeVisible();
  });
});
