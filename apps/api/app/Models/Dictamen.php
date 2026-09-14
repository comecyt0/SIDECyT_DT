<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// Added this line for the relationship

class Dictamen extends Model
{
    protected $fillable = [
        'asignacion_id',
        'criterio_1_puntaje',
        'criterio_2_puntaje',
        'criterio_3_puntaje',
        'criterio_4_puntaje',
        'puntaje_total',
        'comentarios_justificacion',
        'sujeto_apoyo',
        'documento_formato_b_url',
    ];

    protected $table = 'dictamenes';

    protected $casts = [
        'sujeto_apoyo' => 'boolean',
        'criterio_1_puntaje' => 'decimal:2',
        'criterio_2_puntaje' => 'decimal:2',
        'criterio_3_puntaje' => 'decimal:2',
        'criterio_4_puntaje' => 'decimal:2',
        'puntaje_total' => 'decimal:2',
    ];

    public function asignacion()
    {
        return $this->belongsTo(AsignacionEvaluador::class, 'asignacion_id');
    }

    public function criterioDinamicos()
    {
        return $this->hasMany(SolicitudCriterioEvaluacion::class);
    }

    /**
     * Boot the model to auto-calculate score and support status.
     * Soporta tanto criterios legacy (hardcodeados) como dinámicos.
     */
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($dictamen) {
            // Si puntaje_total ya viene seteado (path dinámico: el controller lo calculó),
            // no recalcular. Solo aplica en path legacy (4 criterios hardcodeados).
            if (! isset($dictamen->puntaje_total) || $dictamen->puntaje_total === null) {
                $dictamen->puntaje_total = ($dictamen->criterio_1_puntaje ?? 0) +
                                           ($dictamen->criterio_2_puntaje ?? 0) +
                                           ($dictamen->criterio_3_puntaje ?? 0) +
                                           ($dictamen->criterio_4_puntaje ?? 0);
            }

            $umbral = $dictamen->puntaje_minimo_aprobatorio ?? 80;
            $dictamen->sujeto_apoyo = $dictamen->puntaje_total >= $umbral;
        });
    }
}
