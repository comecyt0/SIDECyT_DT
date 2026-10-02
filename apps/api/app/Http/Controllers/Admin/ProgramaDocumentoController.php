<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProgramaDocumento;
use App\Models\TipoPrograma;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ProgramaDocumentoController extends Controller
{
    public function __construct()
    {

        // Laravel 11: middleware applied via routes

    }

    /**
     * Get all documents for a program
     */
    public function index(TipoPrograma $tipoPrograma)
    {
        // E56: `en_uso` = alguna solicitud o club ya subió ese documento.
        $documentos = \App\Support\EstructuraPrograma::marcarEnUso('documentos', $tipoPrograma->id, $tipoPrograma->documentos()->orderBy('orden')->get());

        return response()->json([
            'message' => 'OK',
            'data' => $documentos,
            'count' => $documentos->count(),
        ]);
    }

    /**
     * Store a new document for a program
     */
    public function store(Request $request, TipoPrograma $tipoPrograma)
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'clave' => 'required|string|max:100|regex:/^[a-z0-9_]+$/|unique:programa_documentos,clave,NULL,id,tipo_programa_id,'.$tipoPrograma->id,
            'descripcion' => 'nullable|string',
            'obligatorio' => 'boolean',
            'orden' => 'integer|min:0',
            'activo' => 'boolean',
            'formato_permitido' => 'nullable', // E45: lista de tipos (pdf|imagen|office|zip); se normaliza abajo
            'tamaño_maximo_mb' => 'nullable|integer|min:1|max:'.\App\Support\TiposArchivo::TAMANO_MAX_MB,
            'etapa_id' => 'nullable|exists:programa_etapas,id',
        ]);

        $validated['formato_permitido'] = implode(',', \App\Support\TiposArchivo::normalizar($request->input('formato_permitido')));
        $validated['tipo_programa_id'] = $tipoPrograma->id;

        $documento = ProgramaDocumento::create($validated);

        $this->clearProgramCache($tipoPrograma->id);

        return response()->json([
            'message' => 'Documento creado exitosamente',
            'data' => $documento,
        ], 201);
    }

    /**
     * Update a document
     */
    public function update(Request $request, TipoPrograma $tipoPrograma, ProgramaDocumento $documento)
    {
        if ($documento->tipo_programa_id != $tipoPrograma->id) {
            return response()->json(['message' => 'Documento no pertenece a este programa'], 404);
        }

        $validated = $request->validate([
            'nombre' => 'string|max:255',
            'clave' => 'string|max:100|regex:/^[a-z0-9_]+$/|unique:programa_documentos,clave,'.$documento->id.',id,tipo_programa_id,'.$tipoPrograma->id,
            'descripcion' => 'nullable|string',
            'obligatorio' => 'boolean',
            'orden' => 'integer|min:0',
            'activo' => 'boolean',
            'formato_permitido' => 'nullable', // E45: lista de tipos (pdf|imagen|office|zip); se normaliza abajo
            'tamaño_maximo_mb' => 'nullable|integer|min:1|max:'.\App\Support\TiposArchivo::TAMANO_MAX_MB,
            'etapa_id' => 'nullable|exists:programa_etapas,id',
        ]);

        if ($request->has('formato_permitido')) {
            $validated['formato_permitido'] = implode(',', \App\Support\TiposArchivo::normalizar($request->input('formato_permitido')));
        }
        $documento->update($validated);

        $this->clearProgramCache($tipoPrograma->id);

        return response()->json([
            'message' => 'Documento actualizado exitosamente',
            'data' => $documento,
        ]);
    }

    /**
     * Delete a document
     */
    public function destroy(TipoPrograma $tipoPrograma, ProgramaDocumento $documento)
    {
        if ($documento->tipo_programa_id != $tipoPrograma->id) {
            return response()->json(['message' => 'Documento no pertenece a este programa'], 404);
        }

        // E56: si ya hay archivos subidos con ese documento, se oculta (se conservan); si no, se elimina.
        $resultado = \App\Support\EstructuraPrograma::quitar('documentos', $documento);

        $this->clearProgramCache($tipoPrograma->id);

        return response()->json([
            'message' => \App\Support\EstructuraPrograma::mensaje($resultado, 'el documento'),
            'resultado' => $resultado,
        ]);
    }

    protected function clearProgramCache(int $programId)
    {
        Cache::forget("programa:{$programId}:documentos");
        Cache::forget("programa:{$programId}:full");
    }
}
