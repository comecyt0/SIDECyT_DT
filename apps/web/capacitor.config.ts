// NOTA: `@capacitor/cli` se instala bajo demanda al momento de empaquetar
// la app móvil (ver MOBILE.md). Hasta entonces el tipo se evita con un
// stub local para que `next build` no falle al hacer type-check.
type CapacitorConfig = {
  appId: string;
  appName: string;
  webDir: string;
  server?: { url?: string; cleartext?: boolean; androidScheme?: string; iosScheme?: string };
  android?: { allowMixedContent?: boolean; backgroundColor?: string };
  ios?: { contentInset?: string; backgroundColor?: string };
};

/**
 * Configuración de Capacitor para empaquetar COMECYT como app nativa
 * iOS y Android.
 *
 * MODOS:
 *
 * (A) WebView remoto (recomendado para empezar):
 *     server.url apunta al sitio público https://dominio.edomex.gob.mx.
 *     La app es una "shell" liviana que carga el frontend Next.js real.
 *     Cada deploy del frontend se refleja al instante en la app.
 *
 * (B) Build local empaquetado:
 *     Quitar `server.url`. La app carga el HTML generado en `out/`.
 *     Para esto Next.js debe exportarse estático con `output: 'export'`,
 *     lo cual NO es compatible con nuestras 24 rutas RSC. Si esto se
 *     requiere, habría que crear un build paralelo `next build --static`
 *     con server actions deshabilitadas — fuera del scope inicial.
 *
 * Cómo correr (en una máquina con Android Studio / Xcode):
 *   1. cd apps/web
 *   2. npm install --save-dev @capacitor/cli @capacitor/core @capacitor/android @capacitor/ios
 *   3. npx cap add android   (o ios)
 *   4. npx cap sync
 *   5. npx cap open android  (abre Android Studio)
 *   6. Compilar APK/AAB desde Android Studio
 *
 * Recordatorios:
 *   - Cambiar `appId` si publicas en stores: convención reverse-DNS
 *   - El icono del app va en android/app/src/main/res/ (después de `cap add`)
 *   - Para push nativo en Android necesitas FCM (no Web Push) — out of scope
 */
const config: CapacitorConfig = {
  appId: 'mx.gob.edomex.comecyt',
  appName: 'COMECYT',
  webDir: 'out', // ignorado cuando server.url está presente
  server: {
    url: process.env.CAPACITOR_REMOTE_URL || 'https://dominio.edomex.gob.mx',
    cleartext: false,
    androidScheme: 'https',
    iosScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#FFFFFF',
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#FFFFFF',
  },
};

export default config;
