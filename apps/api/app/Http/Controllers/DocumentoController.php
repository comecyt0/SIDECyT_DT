<?php

namespace App\Http\Controllers;

use App\Exports\SolicitudesExport;
use App\Models\Dictamen;
use App\Models\Solicitud;
use App\Support\Alcance;
use App\Support\DocumentSignature;
use App\Support\RubricaSigae;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Facades\Excel;

class DocumentoController extends Controller
{
    /**
     * Generate PDF for a specific Technical Dictamen.
     * Access: admin (any dictamen) | evaluador (only their own dictamenes)
     */
    public function downloadDictamen(Dictamen $dictamen)
    {
        $user = Auth::guard('api')->user();
        $adminRol = config('comecyt.roles.admin');
        $evaluadorRol = config('comecyt.roles.evaluador');

        if ($user->rol_id === $evaluadorRol) {
            // Evaluador can only access dictamenes they authored
            $dictamen->loadMissing('asignacion');
            if ($dictamen->asignacion?->evaluador_id !== $user->id) {
                return response()->json(['error' => 'No autorizado'], 403);
            }
        } elseif ($user->tieneRol('admin_convocatoria', 'consulta')) {
            // E45: dentro de su alcance.
            $dictamen->loadMissing('asignacion.solicitud');
            if (! $dictamen->asignacion?->solicitud || ! Alcance::puedeVerSolicitud($user, $dictamen->asignacion->solicitud)) {
                return response()->json(['error' => 'No autorizado'], 403);
            }
        } elseif ($user->rol_id !== $adminRol) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $dictamen->load(['asignacion.solicitud.empresa', 'asignacion.solicitud.convocatoria.tipoPrograma', 'asignacion.evaluador']);

        // E72 paso 5: los criterios que calificó ESTE dictamen (los de la convocatoria o, si no tiene, los 4 legacy)
        $detalle = RubricaSigae::detalleDictamen($dictamen);
        $solicitud = $dictamen->asignacion->solicitud;
        $minimo = RubricaSigae::minimoPorcentaje($solicitud);
        $porcentaje = $detalle['maximo'] > 0 ? round((float) $dictamen->puntaje_total * 100 / $detalle['maximo'], 1) : null;

        // Generamos el contenido base SIN sello para hashearlo
        $contentForHash = json_encode([
            'dictamen_id' => $dictamen->id,
            'puntaje_total' => $dictamen->puntaje_total,
            'sujeto_apoyo' => (bool) $dictamen->sujeto_apoyo,
            'evaluador_id' => $dictamen->asignacion->evaluador_id,
            'solicitud_folio' => $solicitud->folio,
            'comentarios' => $dictamen->comentarios_justificacion,
            'criterios' => $detalle['renglones'],
        ], JSON_UNESCAPED_UNICODE);

        $firma = DocumentSignature::sign($contentForHash, 'dictamen', $dictamen->id);

        $pdf = Pdf::loadView('pdfs.dictamen', compact('dictamen', 'firma', 'detalle', 'minimo', 'porcentaje'));

        return $pdf->download("Dictamen_{$dictamen->asignacion->solicitud->folio}.pdf")->header('Cache-Control', 'private, no-store');
    }

    /**
     * Generate PDF for a specific Convenio.
     * Access: admin (any) | solicitante (only their own solicitud)
     */
    public function downloadConvenio(Solicitud $solicitud)
    {
        $user = Auth::guard('api')->user();
        $adminRol = config('comecyt.roles.admin');

        // E45: admin de convocatoria y consulta también, dentro de su alcance (lo revisa además el middleware `alcance`).
        $interno = $user->tieneRol('admin_convocatoria', 'consulta') && Alcance::puedeVerSolicitud($user, $solicitud);
        if ($user->rol_id !== $adminRol && ! $interno && $solicitud->user_id !== $user->id) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $solicitud->load(['user', 'empresa', 'convocatoria', 'convenio']);

        // Antes solo 'aprobada' y 'convenio': al firmar, la solicitud pasa a 'ministracion' (E33) y el convenio
        // firmado ya no se podía descargar. Ahora ya no hay copia pública (ConvenioController), así que esta es
        // la única vía y debe servir en toda la vida posterior del proyecto.
        if (! in_array($solicitud->estado, ['aprobada', 'convenio', 'ministracion', 'seguimiento', 'cerrada'], true)) {
            return response()->json(['error' => 'La solicitud debe estar aprobada para generar el convenio.'], 403);
        }

        $contentForHash = json_encode([
            'solicitud_id' => $solicitud->id,
            'folio' => $solicitud->folio,
            'titulo' => $solicitud->titulo_proyecto,
            'empresa' => $solicitud->empresa?->nombre,
            'monto_solicitado' => $solicitud->monto_solicitado,
            'monto_aprobado' => $solicitud->convenio?->monto_aprobado,
            'numero_convenio' => $solicitud->convenio?->numero_convenio,
        ], JSON_UNESCAPED_UNICODE);

        $firma = DocumentSignature::sign($contentForHash, 'convenio', $solicitud->id);

        $pdf = Pdf::loadView('pdfs.convenio', compact('solicitud', 'firma'));

        return $pdf->download("Convenio_{$solicitud->folio}.pdf")->header('Cache-Control', 'private, no-store');
    }

    /**
     * Export all solicitudes to Excel — admin only (enforced by route middleware).
     */
    public function exportExcel()
    {
        // E45: la sábana solo trae lo del alcance de quien la descarga.
        return Excel::download(new SolicitudesExport(request()->user()), 'sabana_solicitudes_comecyt.xlsx');
    }
}
