<?php

namespace App\Http\Controllers;

use App\Models\Ministracion;
use App\Models\ProgramaDocumento;
use App\Models\Solicitud;
use App\Models\SolicitudDocumento;
use App\Models\DocumentoFijoConfig;
use App\Support\TiposArchivo;
use Illuminate\Http\Request;

/**
 * Subida y borrado de documentos de una solicitud.
 *
 * SEGURIDAD (24/09/2026), cambios frente a la versión anterior:
 *  - Almacenamiento privado y descarga autenticada (ArchivoSolicitudController). Antes: disco `public`, sin sesión.
 *  - `tipo` en lista blanca (claves del programa de la convocatoria + tipos especiales). Antes era texto libre y
 *    entraba al nombre del archivo: `tipo=../../../7/x` escribía en la carpeta de OTRA solicitud.
 *  - Extensión fija `.pdf` (antes la del cliente: un PDF llamado `.html` se servía como HTML del dominio).
 *  - Reglas por estado: los anexos solo se cambian en borrador/observada; los financieros, de aprobada a
 *    ministración; el informe final, en ministración/seguimiento. Antes se podían cambiar tras enviar.
 *  - MIME real con getPathname() (getRealPath() devuelve false en este IIS, E28) y borrado que sí encuentra el
 *    archivo (antes armaba `documentos/documentos/...` y el archivo "borrado" seguía público).
 */
class DocumentoUploadController extends Controller
{
    private const FINANCIEROS = ['carta_compromiso', 'caratula_banco', 'constancia_fiscal', 'factura_institucion'];

    private const ESTADOS_ANEXOS = ['borrador', 'observada'];

    private const ESTADOS_FINANCIEROS = ['aprobada', 'convenio', 'ministracion'];

    private const ESTADOS_INFORME = ['ministracion', 'seguimiento'];

    public function upload(Request $request, Solicitud $solicitud)
    {
        $request->validate([
            // E45: tipo y tamaño los define el admin por campo (TiposArchivo valida abajo); aquí solo el tope absoluto.
            'file' => 'required|file|max:'.(TiposArchivo::TAMANO_MAX_MB * 1024),
            'tipo' => ['required', 'string', 'max:100', 'regex:/^[a-z0-9_]+$/'],
        ]);

        $user = auth()->user();
        $esAdmin = (int) $user->rol_id === (int) config('comecyt.roles.admin');
        if (! $esAdmin && (int) $solicitud->user_id !== (int) $user->id) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $tipo = (string) $request->input('tipo');
        $esFinanciero = in_array($tipo, self::FINANCIEROS, true);
        $esInforme = $tipo === 'informe_final';

        // E45: límites del campo — documento del programa (programa_documentos) o fijo (documentos_fijos_config).
        if (! $esFinanciero && ! $esInforme) {
            $config = ProgramaDocumento::where('tipo_programa_id', $solicitud->convocatoria?->tipo_programa_id)
                ->where('activo', true)
                ->where('clave', $tipo)
                ->first();
            if (! $config) {
                return response()->json(['error' => 'Tipo de documento no válido para este programa.'], 422);
            }
            $formatos = $config->formato_permitido;
            $maxMb = $config->getAttribute('tamaño_maximo_mb');
        } else {
            $fijo = DocumentoFijoConfig::where('clave', $tipo)->first();
            $formatos = $fijo?->formatos ?? 'pdf';
            $maxMb = $fijo?->tamano_maximo_mb ?? 5;
        }

        if (! $esAdmin) {
            $permitidos = $esInforme ? self::ESTADOS_INFORME : ($esFinanciero ? self::ESTADOS_FINANCIEROS : self::ESTADOS_ANEXOS);
            if (! in_array($solicitud->estado, $permitidos, true)) {
                return response()->json(['error' => 'Este documento ya no se puede cambiar en el estado actual de la solicitud.'], 422);
            }
        }

        $file = $request->file('file');
        // Contenido real (no nombre ni MIME declarado) contra los tipos y el tamaño del campo. Lanza 422 con mensaje.
        $extension = TiposArchivo::validar($file, TiposArchivo::normalizar($formatos), (int) $maxMb);

        $url = ArchivoSolicitudController::guardar($file, $solicitud, $extension);

        if ($esInforme) {
            ArchivoSolicitudController::borrarPorUrl($solicitud->informe_final_url, $solicitud);
            $solicitud->forceFill([
                'informe_final_url' => $url,
                'fecha_entrega_informe' => now(),
                'estado_informe' => 'entregado',
            ])->save();
        } elseif ($esFinanciero) {
            $ministracion = Ministracion::firstOrCreate(
                ['solicitud_id' => $solicitud->id],
                ['estado' => 'pendiente']
            );
            $campo = "{$tipo}_url";
            ArchivoSolicitudController::borrarPorUrl($ministracion->{$campo}, $solicitud);
            $ministracion->{$campo} = $url;
            $ministracion->save();
        } else {
            SolicitudDocumento::create([
                'solicitud_id' => $solicitud->id,
                'tipo' => $tipo,
                // Solo informativo (se muestra como texto): sin rutas y con longitud acotada.
                'nombre_original' => mb_substr(basename(str_replace('\\', '/', (string) $file->getClientOriginalName())), 0, 200),
                'url' => $url,
            ]);
        }

        return response()->json([
            'message' => 'Documento subido con exito',
            'url' => $url,
            'tipo' => $tipo,
        ]);
    }

    public function destroy(Request $request, Solicitud $solicitud, SolicitudDocumento $documento)
    {
        $user = auth()->user();
        $esAdmin = (int) $user->rol_id === (int) config('comecyt.roles.admin');
        if (! $esAdmin && (int) $solicitud->user_id !== (int) $user->id) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        if ((int) $documento->solicitud_id !== (int) $solicitud->id) {
            return response()->json(['error' => 'Documento no encontrado'], 404);
        }

        if (! $esAdmin && ! in_array($solicitud->estado, self::ESTADOS_ANEXOS, true)) {
            return response()->json(['error' => 'Los documentos ya no se pueden quitar en el estado actual de la solicitud.'], 422);
        }

        ArchivoSolicitudController::borrarPorUrl($documento->url, $solicitud);
        $documento->delete();

        return response()->json(['message' => 'Documento eliminado exitosamente']);
    }
}
