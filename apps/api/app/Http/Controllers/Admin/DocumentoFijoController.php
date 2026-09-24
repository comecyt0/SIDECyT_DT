<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DocumentoFijoConfig;
use App\Support\Audit;
use App\Support\TiposArchivo;
use Illuminate\Http\Request;

/**
 * E45 (punto 6) — Tipos y tamaño máximo de los documentos fijos (carta compromiso, carátula bancaria, constancia
 * fiscal, factura, informe final). Edita solo el admin; `publico` lo leen los formularios de subida.
 */
class DocumentoFijoController extends Controller
{
    public function index()
    {
        return response()->json([
            'documentos' => DocumentoFijoConfig::orderBy('id')->get(),
            'tipos' => TiposArchivo::ETIQUETAS,
            'tamano_max_mb' => TiposArchivo::TAMANO_MAX_MB,
        ]);
    }

    public function update(Request $request, DocumentoFijoConfig $documentoFijo)
    {
        $data = $request->validate([
            'formatos' => ['required'],
            'tamano_maximo_mb' => ['required', 'integer', 'min:1', 'max:'.TiposArchivo::TAMANO_MAX_MB],
        ]);
        $antes = $documentoFijo->only(['formatos', 'tamano_maximo_mb']);
        $documentoFijo->update([
            'formatos' => implode(',', TiposArchivo::normalizar($data['formatos'])),
            'tamano_maximo_mb' => (int) $data['tamano_maximo_mb'],
        ]);
        Audit::log('documento_fijo.limites', $documentoFijo, ['antes' => $antes, 'despues' => $documentoFijo->only(['formatos', 'tamano_maximo_mb'])]);

        return response()->json(['message' => 'Límites actualizados.', 'documento' => $documentoFijo]);
    }

    /** Para cualquier usuario con sesión: qué tipos y tamaño acepta cada documento fijo. */
    public function publico()
    {
        return response()->json(
            DocumentoFijoConfig::orderBy('id')->get(['clave', 'etiqueta', 'formatos', 'tamano_maximo_mb'])
        );
    }
}
