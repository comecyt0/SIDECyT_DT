<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProgramaEtapa extends Model
{
    use HasFactory;

    protected $fillable = [
        'tipo_programa_id',
        'numero_etapa',
        'nombre',
        'descripcion',
        'duracion_meses',
        'es_evaluacion_tecnica',
        'puntaje_minimo',
        'activo',
    ];

    protected $casts = [
        'es_evaluacion_tecnica' => 'boolean',
        'activo' => 'boolean',
        'puntaje_minimo' => 'decimal:2',
    ];

    public function tipoPrograma(): BelongsTo
    {
        return $this->belongsTo(TipoPrograma::class);
    }

    public function campos(): HasMany
    {
        return $this->hasMany(ProgramaCampo::class, 'etapa_id');
    }

    public function documentos(): HasMany
    {
        return $this->hasMany(ProgramaDocumento::class, 'etapa_id');
    }

    public function criterios(): HasMany
    {
        return $this->hasMany(ProgramaCriterioEvaluacion::class, 'etapa_id');
    }
}
