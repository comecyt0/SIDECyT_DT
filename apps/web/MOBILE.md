# App móvil COMECYT (Capacitor)

El sistema COMECYT puede empaquetarse como app nativa iOS y Android usando Capacitor sin reescribir nada — la app es un WebView que carga el sitio web real.

## Requisitos por plataforma

| Plataforma | Necesitas |
|---|---|
| Android | Android Studio (incluye SDK + emulador) + JDK 17 |
| iOS | macOS + Xcode 15+ + CocoaPods (`brew install cocoapods`) |

## Setup inicial (una vez)

```bash
cd apps/web

# 1. Instalar Capacitor
npm install --save-dev @capacitor/cli @capacitor/core --legacy-peer-deps
npm install --save-dev @capacitor/android @capacitor/ios --legacy-peer-deps

# 2. Inicializar (lee capacitor.config.ts)
npx cap init COMECYT mx.gob.edomex.comecyt

# 3. Agregar plataformas
npx cap add android
npx cap add ios
```

## Compilar y abrir

```bash
# Sincroniza el config + cualquier plugin → proyecto nativo
npx cap sync

# Abre Android Studio
npx cap open android

# Abre Xcode
npx cap open ios
```

Desde Android Studio: **Build → Build Bundle / APK**. El APK queda en `apps/web/android/app/build/outputs/apk/`.

Desde Xcode: seleccionar dispositivo → **Product → Archive** → exportar IPA.

## Iconos y splash

Tras `npx cap add`, los íconos default viven en:
- `apps/web/android/app/src/main/res/mipmap-*/`
- `apps/web/ios/App/App/Assets.xcassets/AppIcon.appiconset/`

Reemplazarlos con el logo COMECYT (tamaños: 48, 72, 96, 144, 192, 512). Para iOS hay un set de 18 sizes — usar [appicon.co](https://appicon.co) o `cordova-res`.

## Apuntar a un server diferente

`capacitor.config.ts` lee `process.env.CAPACITOR_REMOTE_URL`:

```bash
# Build para staging
CAPACITOR_REMOTE_URL=https://stg.dominio.edomex.gob.mx npx cap sync

# Build para producción (default)
npx cap sync
```

## Publicación en stores

- **Google Play**: subir AAB firmado. Costo: $25 USD una vez. Política requiere `targetSdkVersion` actual + privacidad publicada.
- **App Store**: cuenta Apple Developer ($99 USD/año). Revisión humana ~3 días.
- Para gob.mx: ambas tiendas tienen categoría "Government" — verificación adicional con dominio `.gob.mx`.

## Limitaciones del modo WebView remoto

- Push nativo: el Web Push del sistema SÍ funciona en Android (Chrome WebView), pero NO en iOS (Safari WebView). Para push iOS hay que migrar a FCM/APNs vía `@capacitor/push-notifications` — out of scope inicial.
- Archivos: subir archivos desde la galería del dispositivo requiere `@capacitor/filesystem` o el `<input type="file">` web (suficiente para uploads simples).
- Cámara/escáner QR: agregar `@capacitor/camera` cuando se necesite.

## Cuando puede no convenir Capacitor

- Si la app es 100% intranet (sólo IP privada), la PWA via navegador es suficiente — no hace falta empaquetar.
- Si el área TI no quiere mantener stores y certificados de firma, mantener la PWA es la opción más simple.
