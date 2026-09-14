<?php

namespace App\Http\Controllers\Convocatorias;

use App\Http\Controllers\Controller;
use App\Models\Convocatoria;
use Illuminate\Http\Request;

class ConvocatoriaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(Convocatoria::orderBy('id', 'desc')->get());
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
    public function show(Convocatoria $convocatoria)
    {
        return response()->json($convocatoria);
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
        ]);

        $convocatoria->update($validated);

        return response()->json([
            'message' => 'Convocatoria actualizada con éxito',
            'convocatoria' => $convocatoria,
        ]);
    }
}
