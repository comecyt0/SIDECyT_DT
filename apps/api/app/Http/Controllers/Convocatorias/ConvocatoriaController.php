<?php

namespace App\Http\Controllers\Convocatorias;

use App\Http\Controllers\Controller;
use App\Models\Convocatoria;
use App\Support\Alcance;
use App\Support\Audit;
use Illuminate\Http\Request;

class ConvocatoriaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        // E40: sin las archivadas (deleted_at). El modelo no usa el trait SoftDeletes aunque la columna
        // existe, así que el filtro va explícito — igual que en el endpoint público y en los scopes.
        // E45: con alcance (admin de convocatoria / consulta / periodos) y con su periodo y administradores.
        $q = Convocatoria::whereNull('deleted_at')
            ->with(['periodo:id,nombre', 'administradores:id,name,avatar_path', 'programaPublico:id,nombre,sistema,activo'])
            ->orderBy('id', 'desc');

        return response()->json(Alcance::aplicar($q, $request->user(), 'id')->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'ejercicio_fiscal' => 'required|string|max:4',
            'descripcion' => 'nullable|string',
            'fecha_apertura' => 'required|date',
            'fecha_cierre' => 'required|date|after_or_equal:fecha_apertura',
            'monto_maximo_apoyo' => 'nullable|numeric|min:0',
            'porcentaje_aportacion_minima' => 'nullable|numeric|min:0|max:100',
            'estado' => 'required|in:borrador,activa,cerrada',
            'tipo_programa_id' => 'required|exists:tipo_programas,id',
            // E45: periodo del alta (alcance de visión por periodo).
            'periodo_id' => 'nullable|integer|exists:periodos,id',
        ]);

        $convocatoria = Convocatoria::create($validated);

        return response()->json([
            'message' => 'Convocatoria creada con éxito',
            'convocatoria' => $convocatoria,
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, Convocatoria $convocatoria)
    {
        Alcance::exigirConvocatoria($request->user(), $convocatoria->id);

        // tipoPrograma: la ficha muestra el banner del programa como respaldo si la convocatoria no tiene.
        return response()->json($convocatoria->load([
            'tipoPrograma:id,nombre,banner_url,tipo_apoyo', 'periodo:id,nombre', 'administradores:id,name,email,avatar_path',
            'programaPublico:id,nombre,sistema,activo',
        ])->toArray() + ['tiene_registros' => $convocatoria->tieneRegistros()]); // E58: el nombre corto queda fijo con registros

    }

    /**
     * E54 — Cambia el programa (del catálogo público) al que pertenece la convocatoria. Solo admin general (ruta del grupo
     * admin); queda en la bitácora con el programa anterior. No toca la configuración técnica de la convocatoria.
     */
    public function cambiarPrograma(Request $request, Convocatoria $convocatoria)
    {
        $v = $request->validate(['programa_publico_id' => 'required|integer|exists:programas_publicos,id'], [], ['programa_publico_id' => 'programa']);
        $antes = $convocatoria->programa_publico_id;
        $convocatoria->forceFill(['programa_publico_id' => (int) $v['programa_publico_id']])->save();
        Audit::log('convocatoria.programa_cambiado', $convocatoria, ['antes' => $antes, 'despues' => (int) $v['programa_publico_id']]);

        return response()->json($convocatoria->fresh()->load('programaPublico:id,nombre,sistema,activo'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Convocatoria $convocatoria)
    {
        $validated = $request->validate([
            'nombre' => 'string|max:255',
            'ejercicio_fiscal' => 'string|max:4',
            'descripcion' => 'nullable|string',
            'fecha_apertura' => 'date',
            'fecha_cierre' => 'date|after_or_equal:fecha_apertura',
            'monto_maximo_apoyo' => 'numeric|min:0',
            'porcentaje_aportacion_minima' => 'numeric|min:0|max:100',
            'estado' => 'in:borrador,activa,cerrada',
            'tipo_programa_id' => 'exists:tipo_programas,id',
            'periodo_id' => 'nullable|integer|exists:periodos,id',
        ]);

        // E40: con prórroga vigente, el cierre original debe quedar antes de ella (para ampliar: /prorroga).
        if ($convocatoria->fecha_prorroga && isset($validated['fecha_cierre'])
            && $validated['fecha_cierre'] >= substr((string) $convocatoria->fecha_prorroga, 0, 10)) {
            return response()->json([
                'message' => 'Esta convocatoria tiene prórroga hasta el '.substr((string) $convocatoria->fecha_prorroga, 0, 10)
                    .'. Para ampliar el plazo usa «Dar prórroga».',
            ], 422);
        }

        // E58: nombre corto (va dentro de los folios nuevos). Se puede poner o corregir mientras no haya clubes ni
        // solicitudes; después queda fijo para que todos los folios de la convocatoria coincidan.
        if ($request->has('nombre_corto')) {
            $corto = Convocatoria::normalizarCorto($request->input('nombre_corto'));
            if ($corto !== $convocatoria->nombre_corto) {
                if ($convocatoria->tieneRegistros()) {
                    return response()->json(['message' => 'La convocatoria ya tiene registros con folio: el nombre corto ya no se puede cambiar.',
                        'errors' => ['nombre_corto' => ['La convocatoria ya tiene registros con folio: el nombre corto ya no se puede cambiar.']]], 422);
                }
                validator(['nombre_corto' => $corto], ['nombre_corto' => ['nullable', 'regex:'.Convocatoria::PATRON_CORTO,
                    \Illuminate\Validation\Rule::unique('convocatorias', 'nombre_corto')->ignore($convocatoria->id)]],
                    ['nombre_corto.regex' => 'El nombre corto lleva de 3 a 12 letras o números, sin espacios ni signos (p. ej. LEGO26).',
                        'nombre_corto.unique' => 'Ese nombre corto ya lo usa otra convocatoria; elige otro.'])->validate();
                $antes = $convocatoria->nombre_corto;
                $convocatoria->forceFill(['nombre_corto' => $corto]);
                Audit::log('convocatoria.nombre_corto', $convocatoria, ['antes' => $antes, 'despues' => $corto]);
            }
        }

        $convocatoria->update($validated);

        return response()->json([
            'message' => 'Convocatoria actualizada con éxito',
            'convocatoria' => $convocatoria,
        ]);
    }

    /**
     * POST /admin/convocatorias/{convocatoria}/prorroga  — solo admin (grupo `admin` en routes/api.php). E40.
     *
     * Amplía el plazo para recibir solicitudes. Reglas:
     *  - No aplica a borradores (aún no se publican).
     *  - La nueva fecha debe ser POSTERIOR a la fecha límite vigente (solo amplía, nunca recorta) y no
     *    puede estar en el pasado.
     *  - Motivo obligatorio (queda en la bitácora y en la ficha).
     *  - Si la convocatoria ya se había cerrado (a mano o por el cierre automático), la prórroga la reabre.
     *  - `fecha_cierre` conserva la fecha original: así se sabe que está "con prórroga".
     */
    public function prorroga(Request $request, Convocatoria $convocatoria)
    {
        if ($convocatoria->estado === 'borrador') {
            return response()->json(['message' => 'Publica la convocatoria antes de darle prórroga.'], 422);
        }

        $limiteActual = $convocatoria->fecha_cierre_efectiva;
        $hoy = Convocatoria::hoy();
        $minimo = max($limiteActual, $hoy);

        $validated = $request->validate([
            'fecha_prorroga' => ['required', 'date_format:Y-m-d', 'after:'.$minimo],
            'motivo' => ['required', 'string', 'min:10', 'max:500'],
        ], [
            'fecha_prorroga.after' => 'La prórroga debe ser posterior al '.$minimo.' (fecha límite vigente u hoy).',
            'motivo.min' => 'Explica el motivo de la prórroga (al menos 10 caracteres).',
        ]);

        $antes = [
            'estado' => $convocatoria->estado,
            'fecha_limite' => $limiteActual,
            'fecha_prorroga' => $convocatoria->fecha_prorroga,
        ];

        $convocatoria->forceFill([
            'fecha_prorroga' => $validated['fecha_prorroga'],
            'motivo_prorroga' => strip_tags($validated['motivo']),
            'prorroga_at' => now(),
            'prorroga_por' => $request->user()?->id,
            'estado' => 'activa',
        ])->save();

        Audit::log('convocatoria.prorroga', $convocatoria, [
            'antes' => $antes,
            'nueva_fecha_limite' => $validated['fecha_prorroga'],
            'motivo' => strip_tags($validated['motivo']),
        ]);

        return response()->json([
            'message' => 'Prórroga registrada: la convocatoria recibe solicitudes hasta el '.$validated['fecha_prorroga'].'.',
            'convocatoria' => $convocatoria->fresh('tipoPrograma'),
        ]);
    }
}
