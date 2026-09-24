<?php

namespace App\Http\Middleware;

use App\Models\AsignacionEvaluador;
use App\Models\Convenio;
use App\Models\Convocatoria;
use App\Models\Informe;
use App\Models\Ministracion;
use App\Models\Solicitud;
use App\Support\Alcance;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * E45 — Alcance por registro. Revisa CADA modelo resuelto en la ruta (route model binding) y responde 404 si queda
 * fuera del alcance del usuario (App\Support\Alcance). Así ningún `show`/`update`/transición de otra convocatoria
 * se escapa aunque un controlador olvide revisarlo. Los listados se filtran en cada controlador con Alcance::aplicar.
 * Corre después de SubstituteBindings (va en el grupo de rutas, no global).
 */
class AlcanceMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user) {
            return $next($request);
        }
        // Admin general: sin restricción (evita consultas).
        if ($user->tieneRol('admin')) {
            return $next($request);
        }

        foreach ((array) $request->route()?->parameters() as $valor) {
            $solicitud = match (true) {
                $valor instanceof Solicitud => $valor,
                $valor instanceof Convenio, $valor instanceof Ministracion, $valor instanceof Informe,
                $valor instanceof AsignacionEvaluador => $valor->solicitud,
                default => null,
            };

            if ($solicitud instanceof Solicitud) {
                Alcance::exigirSolicitud($user, $solicitud);
            } elseif ($valor instanceof Convocatoria) {
                Alcance::exigirConvocatoria($user, $valor->id);
            } elseif (($valor instanceof Convenio || $valor instanceof Ministracion || $valor instanceof Informe
                || $valor instanceof AsignacionEvaluador) && $solicitud === null) {
                // Registro huérfano: solo el admin general.
                abort(404, 'Registro no encontrado');
            }
        }

        return $next($request);
    }
}
