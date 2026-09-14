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
        $documentos = $tipoPrograma->documentos()->orderBy('orden')->get();

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
            'clave' => 'required|string|max:100|unique:programa_documentos,clave,NULL,id,tipo_programa_id,'.$tipoPrograma->id,
            'descripcion' => 'nullable|string',
            'obligatorio' => 'boolean',
            'orden' => 'integer|min:0',
            'activo' => 'boolean',
            'formato_permitido' => 'nullable|string|max:100',
            'tamaño_maximo_mb' => 'nullable|integer|min:1',
            'etapa_id' => 'nullable|exists:programa_etapas,id',
        ]);

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
            'clave' => 'string|max:100|unique:programa_documentos,clave,'.$documento->id.',id,tipo_programa_id,'.$tipoPrograma->id,
            'descripcion' => 'nullable|string',
            'obligatorio' => 'boolean',
            'orden' => 'integer|min:0',
            'activo' => 'boolean',
            'formato_permitido' => 'nullable|string|max:100',
            'tamaño_maximo_mb' => 'nullable|integer|min:1',
            'etapa_id' => 'nullable|exists:programa_etapas,id',
        ]);

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

        $documento->delete();

        $this->clearProgramCache($tipoPrograma->id);

        return response()->json([
            'message' => 'Documento eliminado exitosamente',
        ]);
    }

    protected function clearProgramCache(int $programId)
    {
        Cache::forget("programa:{$programId}:documentos");
        Cache::forget("programa:{$programId}:full");
    }
}
