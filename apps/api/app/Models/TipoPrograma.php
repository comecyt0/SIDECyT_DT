<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TipoPrograma extends Model
{
    use HasFactory;

    protected $fillable = [
        'clave',
        'nombre',
        'descripcion',
        'tipo_apoyo',
        'tiene_etapas',
        'num_etapas',
        'requiere_evaluacion_tecnica',
        'requiere_fianza',
        'porcentaje_fianza',
        'tiene_equipo',
        'min_miembros_equipo',
        'max_miembros_equipo',
        'rango_edad_min',
        'rango_edad_max',
        'monto_maximo',
        'porcentaje_aportacion_solicitante',
        'puntaje_minimo_aprobatorio',
        'activo',
    ];

    protected $casts = [
        'tiene_etapas' => 'boolean',
        'requiere_evaluacion_tecnica' => 'boolean',
        'requiere_fianza' => 'boolean',
        'tiene_equipo' => 'boolean',
        'activo' => 'boolean',
        'monto_maximo' => 'decimal:2',
        'porcentaje_aportacion_solicitante' => 'decimal:2',
        'porcentaje_fianza' => 'decimal:2',
        'puntaje_minimo_aprobatorio' => 'decimal:2',
    ];

    public function modalidades(): HasMany
    {
        return $this->hasMany(ProgramaModalidad::class);
    }

    public function etapas(): HasMany
    {
        return $this->hasMany(ProgramaEtapa::class);
    }

    public function campos(): HasMany
    {
        return $this->hasMany(ProgramaCampo::class);
    }

    public function documentos(): HasMany
    {
        return $this->hasMany(ProgramaDocumento::class);
    }

    public function rubros(): HasMany
    {
        return $this->hasMany(ProgramaRubro::class);
    }

    public function criterios(): HasMany
    {
        return $this->hasMany(ProgramaCriterioEvaluacion::class);
    }
}
