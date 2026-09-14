<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProgramaCampo extends Model
{
    use HasFactory;

    protected $fillable = [
        'tipo_programa_id',
        'etapa_id',
        'nombre_campo',
        'etiqueta',
        'tipo_campo',
        'opciones_json',
        'reglas_validacion_json',
        'orden',
        'requerido',
        'activo',
    ];

    protected $casts = [
        'opciones_json' => 'array',
        'reglas_validacion_json' => 'array',
        'requerido' => 'boolean',
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
