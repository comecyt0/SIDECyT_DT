<?php

namespace App\Http\Controllers;

use App\Exports\SolicitudesExport;
use App\Models\Dictamen;
use App\Models\Solicitud;
use App\Support\DocumentSignature;
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
        } elseif ($user->rol_id !== $adminRol) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $dictamen->load(['asignacion.solicitud.empresa', 'asignacion.solicitud.convocatoria', 'asignacion.evaluador']);

        // Generamos el contenido base SIN sello para hashearlo
        $contentForHash = json_encode([
            'dictamen_id' => $dictamen->id,
            'puntaje_total' => $dictamen->puntaje_total,
            'sujeto_apoyo' => (bool) $dictamen->sujeto_apoyo,
            'evaluador_id' => $dictamen->asignacion->evaluador_id,
            'solicitud_folio' => $dictamen->asignacion->solicitud->folio,
            'comentarios' => $dictamen->comentarios_justificacion,
        ], JSON_UNESCAPED_UNICODE);

        $firma = DocumentSignature::sign($contentForHash, 'dictamen', $dictamen->id);

        $pdf = Pdf::loadView('pdfs.dictamen', compact('dictamen', 'firma'));

        return $pdf->download("Dictamen_{$dictamen->asignacion->solicitud->folio}.pdf");
    }

    /**
     * Generate PDF for a specific Convenio.
     * Access: admin (any) | solicitante (only their own solicitud)
     */
    public function downloadConvenio(Solicitud $solicitud)
    {
        $user = Auth::guard('api')->user();
        $adminRol = config('comecyt.roles.admin');

        if ($user->rol_id !== $adminRol && $solicitud->user_id !== $user->id) {
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

        return $pdf->download("Convenio_{$solicitud->folio}.pdf");
    }

    /**
     * Export all solicitudes to Excel — admin only (enforced by route middleware).
     */
    public function exportExcel()
    {
        return Excel::download(new SolicitudesExport, 'sabana_solititudes_comecyt.xlsx');
    }
}
