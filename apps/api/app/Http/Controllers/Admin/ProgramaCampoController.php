<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProgramaCampo;
use App\Models\TipoPrograma;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ProgramaCampoController extends Controller
{
    public function __construct()
    {

        // Laravel 11: middleware applied via routes

    }

    /**
     * Get all fields for a program
     */
    public function index(TipoPrograma $tipoPrograma)
    {
        // E56: `en_uso` = ya tiene respuestas (al quitarla se oculta en vez de borrarse).
        $campos = \App\Support\EstructuraPrograma::marcarEnUso('campos', $tipoPrograma->id, $tipoPrograma->campos()->orderBy('orden')->get());

        return response()->json([
            'message' => 'OK',
            'data' => $campos,
            'count' => $campos->count(),
        ]);
    }

    /**
     * Store a new field for a program
     */
    public function store(Request $request, TipoPrograma $tipoPrograma)
    {
        $validated = $request->validate([
            'nombre_campo' => 'required|string|max:100',
            'etiqueta' => 'required|string|max:255',
            'tipo_campo' => 'required|in:text,number,textarea,date,select,checkbox,email',
            'descripcion' => 'nullable|string',
            'opciones' => 'nullable', // lista o texto (una por línea) → opciones_json [{id,label}] (24/09/2026: antes se descartaba)
            'orden' => 'required|integer|min:1',
            'requerido' => 'boolean',
            'activo' => 'boolean',
            'etapa_id' => 'nullable|exists:programa_etapas,id',
        ]);

        $validated = $this->conOpciones($validated);
        $validated['tipo_programa_id'] = $tipoPrograma->id;

        $campo = ProgramaCampo::create($validated);

        $this->clearProgramCache($tipoPrograma->id);

        return response()->json([
            'message' => 'Campo creado exitosamente',
            'data' => $campo,
        ], 201);
    }

    /**
     * Update a field
     */
    public function update(Request $request, TipoPrograma $tipoPrograma, ProgramaCampo $campo)
    {
        if ($campo->tipo_programa_id != $tipoPrograma->id) {
            return response()->json(['message' => 'Campo no pertenece a este programa'], 404);
        }

        $validated = $request->validate([
            'nombre_campo' => 'string|max:100',
            'etiqueta' => 'string|max:255',
            'tipo_campo' => 'in:text,number,textarea,date,select,checkbox,email',
            'descripcion' => 'nullable|string',
            'opciones' => 'nullable', // lista o texto (una por línea) → opciones_json [{id,label}] (24/09/2026: antes se descartaba)
            'orden' => 'integer|min:1',
            'requerido' => 'boolean',
            'activo' => 'boolean',
            'etapa_id' => 'nullable|exists:programa_etapas,id',
        ]);

        $campo->update($this->conOpciones($validated));

        $this->clearProgramCache($tipoPrograma->id);

        return response()->json([
            'message' => 'Campo actualizado exitosamente',
            'data' => $campo,
        ]);
    }

    /** `opciones` (lista o texto) → columna real `opciones_json` con el formato que lee el solicitante. */
    private function conOpciones(array $v): array
    {
        if (array_key_exists('opciones', $v)) {
            $o = $v['opciones'];
            $v['opciones_json'] = (is_array($o) || is_string($o)) ? AsistenteConvocatoriaController::opciones($o) : null;
            unset($v['opciones']);
        }

        return $v;
    }

    /**
     * Delete a field
     */
    public function destroy(TipoPrograma $tipoPrograma, ProgramaCampo $campo)
    {
        if ($campo->tipo_programa_id != $tipoPrograma->id) {
            return response()->json(['message' => 'Campo no pertenece a este programa'], 404);
        }

        // E56: se elimina solo si nadie la ha respondido; si ya tiene respuestas, se oculta y se conservan.
        $resultado = \App\Support\EstructuraPrograma::quitar('campos', $campo);

        $this->clearProgramCache($tipoPrograma->id);

        return response()->json([
            'message' => \App\Support\EstructuraPrograma::mensaje($resultado, 'la pregunta'),
            'resultado' => $resultado,
        ]);
    }

    protected function clearProgramCache(int $programId)
    {
        Cache::forget("programa:{$programId}:campos");
        Cache::forget("programa:{$programId}:full");
    }
}
