import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config para COMECYT (frontend Next.js).
 *
 * NOTA: No se levanta el servidor automáticamente. Antes de correr los tests
 * debes iniciar manualmente en terminales separadas:
 *   - Frontend: `cd apps/web && npm run dev`     → http://localhost:3000
 *   - Backend:  `cd apps/api && php artisan serve` → http://localhost:8000
 *
 * Luego, en otra terminal:
 *   npm run test:e2e
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list']],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // El usuario debe iniciar `npm run dev` y `php artisan serve` manualmente.
  // Bloque webServer intencionalmente comentado.
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120_000,
  // },
});
