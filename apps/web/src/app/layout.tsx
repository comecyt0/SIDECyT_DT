import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { I18nProvider } from "@/i18n/I18nProvider";
import { GlobalLoaderProvider } from "@/components/ui/GlobalLoader";
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
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.png",
  },
};

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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}
    >
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="var(--brand-vino)" />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <PWAInit />
        <InstallPrompt />
        <ThemeProvider>
          <I18nProvider defaultLocale="es">
            <GlobalLoaderProvider>
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </GlobalLoaderProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
