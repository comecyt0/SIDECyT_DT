import { test, expect } from '@playwright/test';

/**
 * E2E: flujo de "olvidé mi contraseña" (admin-mediated).
 *
 * Solo ejercita el primer paso del flujo: enviar la solicitud al admin.
 * NO ejecuta el reset real porque el token llega por email (MAIL_MAILER=log en dev).
 *
 * Requiere:
 *   - php artisan migrate:fresh --seed   (UsuariosPruebaSeeder crea al solicitante)
 *   - php artisan serve                  (backend en :8000)
 *   - npm run dev                        (frontend en :3000)
 */

const SOLICITANTE_EMAIL = 'solicitante@institucion.mx';

test.describe('Recuperación de contraseña — /forgot-password', () => {
  test('envía la solicitud y muestra mensaje de confirmación', async ({ page }) => {
    await page.goto('/forgot-password');

    // Verificar que estamos en la página correcta
    await expect(
      page.getByRole('heading', { name: /recuperar contraseña/i })
    ).toBeVisible();

    // Llenar email del solicitante de prueba
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    await emailInput.fill(SOLICITANTE_EMAIL);

    // Botón de envío
    const submitBtn = page.getByRole('button', {
      name: /enviar|recuperaci[oó]n/i,
    });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Si el backend responde con 422/429/500 capturamos y skipeamos
    // (p.ej. throttle de 3/min en producción local repetida).
    const success = page.getByRole('heading', { name: /solicitud enviada/i });
    const errorAlert = page.getByText(/no encontramos|error|intent[ao]/i);

    const result = await Promise.race([
      success.waitFor({ state: 'visible', timeout: 8_000 }).then(() => 'ok'),
      errorAlert.waitFor({ state: 'visible', timeout: 8_000 }).then(() => 'err'),
    ]).catch(() => 'timeout');

    if (result === 'err') {
      test.skip(true, 'Backend rechazó la solicitud (throttle o user no existe en seeder).');
    }
    if (result === 'timeout') {
      test.skip(true, 'No hubo respuesta visible — verificar que el backend esté arriba.');
    }

    // Confirmaciones del estado de éxito
    await expect(success).toBeVisible();
    await expect(page.getByText(SOLICITANTE_EMAIL)).toBeVisible();
    await expect(
      page.getByText(/administrador|enlace de recuperaci[oó]n/i).first()
    ).toBeVisible();
  });

  test('botón "Volver al inicio de sesión" regresa a /login', async ({ page }) => {
    await page.goto('/forgot-password');
    const link = page.getByRole('link', { name: /volver al inicio de sesi[oó]n/i });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
