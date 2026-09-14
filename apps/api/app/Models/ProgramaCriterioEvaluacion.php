<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProgramaCriterioEvaluacion extends Model
{
    use HasFactory;

    protected $table = 'programa_criterios_evaluacion';

    protected $fillable = [
        'tipo_programa_id',
        'etapa_id',
        'nombre',
        'descripcion',
        'ponderacion',
        'puntaje_maximo',
        'orden',
        'activo',
    ];

    protected $casts = [
        'ponderacion' => 'decimal:2',
        'puntaje_maximo' => 'decimal:2',
        'activo' => 'boolean',
    ];

    public function tipoPrograma(): BelongsTo
    {
        return $this->belongsTo(TipoPrograma::class);
    }

    public function etapa(): BelongsTo
    {
        return $this->belongsTo(ProgramaEtapa::class);
    }
}
