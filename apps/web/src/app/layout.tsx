import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// Sistema visual SIGAC de los paneles (23/09/2026). Todo acotado a `.panel-root`: el login no cambia.
import "../styles/panel-sigac.css";
import { switzer, satoshi } from "@/lib/fonts";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { I18nProvider } from "@/i18n/I18nProvider";
import { GlobalLoaderProvider } from "@/components/ui/GlobalLoader";
import RouteChangeOverlay from "@/components/ui/RouteChangeOverlay";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import PWAInit from "@/components/pwa/PWAInit";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import { INSTITUTION } from "@/lib/institution";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${INSTITUTION.name} - Sistema de Gestión de Apoyos Científicos`,
  description: "Plataforma integral para la evaluación, seguimiento y ministración de proyectos tecnológicos y científicos.",
  manifest: "/manifest.webmanifest",
  applicationName: `${INSTITUTION.name} Sistema`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: INSTITUTION.name,
  },
  // logo.png es el único ícono del sistema: no hay favicon.ico (el archivo no existía y el
  // navegador caía al ícono por defecto). Metadata en el layout raíz alcanza a todas las
  // páginas sin excepción — ninguna ruta la sobreescribe (14/09/2026).
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

/**
 * E42 (24/09/2026) — Recuperación cuando la pantalla de carga se queda para siempre.
 * Pasaba si una caché intermedia entregaba HTML de un despliegue anterior que pedía scripts que ya no
 * existen: React no arranca y el #boot-splash nunca se retira. Si falla un script de /_next/static, o
 * aparece un ChunkLoadError, o a los 15 s el splash sigue visible, se recarga UNA vez (bandera en
 * sessionStorage, ventana de 60 s: nunca en bucle) con un parámetro nuevo en la URL, para saltarse
 * cualquier copia vieja guardada por un proxy. Tras cargar bien, el parámetro se limpia de la barra.
 * Script en línea permitido por la CSP (`script-src 'self' 'unsafe-inline'`); no usa datos externos.
 */
const RECUPERAR_CARGA = `(function(){try{
var K='sg-reload-at',P='_r';
try{var u0=new URL(location.href);if(u0.searchParams.has(P)){u0.searchParams.delete(P);history.replaceState(history.state,'',u0.pathname+u0.search+u0.hash);}}catch(_){}
function recargar(){try{var t=Number(sessionStorage.getItem(K)||0);if(Date.now()-t<60000)return;sessionStorage.setItem(K,String(Date.now()));}catch(_){return;}
var u=new URL(location.href);u.searchParams.set(P,String(Date.now()));location.replace(u.toString());}
window.addEventListener('error',function(e){var s=e&&e.target;if(s&&s.tagName==='SCRIPT'&&/\\/_next\\/static\\//.test(s.src||''))recargar();},true);
window.addEventListener('unhandledrejection',function(e){var r=e&&e.reason;var m=String((r&&(r.name||r.message))||'');if(/ChunkLoadError|Loading chunk|dynamically imported module/i.test(m))recargar();});
setTimeout(function(){var s=document.getElementById('boot-splash');if(s&&s.style.display!=='none'&&!s.classList.contains('route-loading-out'))recargar();},15000);
}catch(_){}})();`;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "var(--brand-vino)",
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${switzer.variable} ${satoshi.variable} h-full antialiased scroll-smooth`}
    >
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="var(--brand-vino)" />
        <meta name="color-scheme" content="light dark" />
        {/* Recuperación de "se queda cargando" (E42). Constante propia, sin datos de usuario. */}
        <script dangerouslySetInnerHTML={{ __html: RECUPERAR_CARGA }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {/* Splash de arranque: mismo dibujo que RouteLoadingScreen, pero impreso por el servidor
            para que se vea al recargar CUALQUIER página antes de que cargue el JS.
            RouteChangeOverlay lo retira cuando la app montó (mínimo ~1.1 s). */}
        <div id="boot-splash" className="route-loading" role="status" aria-live="polite" aria-label="Cargando">
          <div className="route-loading-rings">
            <span className="route-loading-ring" aria-hidden="true" />
            <span className="route-loading-ring" aria-hidden="true" />
            {/* eslint-disable-next-line @next/next/no-img-element -- splash previo a la hidratación */}
            <img src="/logo.png" alt="" width={185} height={144} className="route-loading-logo h-36 w-auto object-contain" />
          </div>
        </div>
        <PWAInit />
        <InstallPrompt />
        <ThemeProvider>
          <I18nProvider defaultLocale="es">
            <GlobalLoaderProvider>
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
              {/* Un solo listener global de clics — ver RouteChangeOverlay.tsx.
                  No toca el menú ni ninguna otra vista. */}
              <RouteChangeOverlay />
            </GlobalLoaderProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
