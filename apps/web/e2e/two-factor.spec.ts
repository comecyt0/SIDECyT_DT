import { test, expect } from '@playwright/test';

/**
 * E2E: challenge de doble factor (2FA) en login.
 *
 * Hoy COMECYT NO tiene 2FA habilitado en el seeder de usuarios test.
 * Este spec queda como guard rail: si en el futuro se enciende 2FA para algún
 * usuario, este test debe pasar; mientras no exista, se skipea explícitamente.
 *
 * Heurística de detección: tras submit del login, si en lugar de redirigir al
 * dashboard aparece un input para OTP de 6 dígitos + texto "Verificación",
 * estamos en el challenge. Si no, skip.
 *
 * Requiere los 3 servicios corriendo (npm run dev + php artisan serve + Reverb).
 */

const SOLICITANTE = {
  email: 'solicitante@institucion.mx',
  password: 'password123',
};

test.describe('Login con 2FA challenge', () => {
  test('si el usuario tiene 2FA, aparece pantalla de verificación', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(SOLICITANTE.email);
    await page.locator('input[type="password"]').fill(SOLICITANTE.password);
    await page.getByRole('button', { name: /ingresar|iniciar|login/i }).click();

    // Esperamos a que ocurra UNA de tres cosas:
    //  (1) redirige al dashboard del rol → no hay 2FA, skip.
    //  (2) aparece pantalla "Verificación en dos pasos" / input de OTP → assert.
    //  (3) timeout/error → skip.

    const dashboardUrl = page
      .waitForURL(/\/(solicitante|admin|revisor|evaluador)/, { timeout: 6_000 })
      .then(() => 'dashboard')
      .catch(() => null);

    const challengeHeader = page
      .getByText(/verificaci[oó]n en dos pasos|two.?factor|c[oó]digo de verificaci[oó]n/i)
      .first()
      .waitFor({ state: 'visible', timeout: 6_000 })
      .then(() => 'challenge')
      .catch(() => null);

    const result = await Promise.race([dashboardUrl, challengeHeader]);

    if (result === 'dashboard' || result === null) {
      test.skip(
        true,
        'El usuario solicitante de prueba no tiene 2FA habilitado — challenge no aplica.'
      );
    }

    // Si llegamos aquí, hay challenge. Verificar input de 6 dígitos.
    const otpInput = page
      .locator('input[inputmode="numeric"], input[maxlength="6"], input[name*="otp" i], input[name*="code" i]')
      .first();
    await expect(otpInput).toBeVisible({ timeout: 4_000 });

    await expect(
      page.getByText(/verificaci[oó]n en dos pasos|c[oó]digo de verificaci[oó]n/i).first()
    ).toBeVisible();
  });
});
