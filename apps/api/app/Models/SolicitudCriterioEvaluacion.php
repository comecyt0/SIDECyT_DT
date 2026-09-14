<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SolicitudCriterioEvaluacion extends Model
{
    protected $table = 'solicitud_criterios_evaluacion';

    protected $fillable = [
        'dictamen_id',
        'criterio_id',
        'puntaje_obtenido',
        'observacion',
    ];

    protected $casts = [
        'puntaje_obtenido' => 'decimal:2',
    ];

    public function dictamen(): BelongsTo
    {
        return $this->belongsTo(Dictamen::class);
    }

    public function criterio(): BelongsTo
    {
        return $this->belongsTo(ProgramaCriterioEvaluacion::class);
    }
}
