<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeadersMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Única excepción al DENY (24/09/2026): la descarga autenticada de archivos de solicitud
        // (ArchivoSolicitudController) marca SAMEORIGIN para la vista previa en <iframe> del propio sitio.
        $mismoOrigen = $response->headers->get('X-Frame-Options') === 'SAMEORIGIN'
            && $request->is('api/archivos/*');

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', $mismoOrigen ? 'SAMEORIGIN' : 'DENY');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Cross-Origin-Resource-Policy (observación de ADEM del 25/08/2026, fuera de la matriz).
        // Impide que otro origen incruste como recurso lo que sirve esta capa. Es seguro ponerlo
        // en 'same-origin' porque este middleware solo toca respuestas de la aplicación —JSON de
        // la API, descargas generadas y páginas de error de Laravel—, que nadie incrusta.
        //
        // OJO: los archivos subidos (/storage/*) NO pasan por aquí; los sirve IIS como estáticos.
        // Si algún día hay que ponerles CORP, va en public/web.config, no en este middleware, y
        // hay que considerar la vista previa en iframe de DocumentosAdjuntos.tsx.
        $response->headers->set('Cross-Origin-Resource-Policy', 'same-origin');

        // X-XSS-Protection se retiró a propósito (13/08/2026). El filtro XSS de los navegadores
        // está descontinuado —Chrome lo eliminó, Firefox nunca lo implementó— y en su día se
        // demostró que podía introducir vulnerabilidades por sí mismo. OWASP recomienda no
        // enviarla. La protección real la da la CSP. No volver a agregarla: varios escáneres
        // ya la reportan como hallazgo.

        // Se ocultan las cabeceras que revelan el motor y su versión exacta (PHP 8.4.22, IIS).
        // El propio informe de TIC Defense lo recomienda en "Identificación de servicios y
        // tecnologías": esa información le ahorra a un atacante la fase de reconocimiento y le
        // permite buscar exploits específicos de versión.
        $response->headers->remove('X-Powered-By');
        $response->headers->remove('Server');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

        // CSP de la API (hallazgo 6 del pentest de agosto 2026: el backend no emitía
        // Content-Security-Policy). Esta capa solo devuelve JSON, descargas y páginas de
        // error de Laravel: no carga ningún recurso, así que la política más segura es
        // negarlo todo. Sin comodines de dominio ni 'unsafe-inline' (hallazgo 7).
        // La UI la sirve Next.js, que define su propia CSP en next.config.ts.
        $response->headers->set(
            'Content-Security-Policy',
            $mismoOrigen
                ? "default-src 'none'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'"
                : "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
        );

        // Only send HSTS on HTTPS (not on local HTTP dev)
        if ($request->isSecure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }
}
