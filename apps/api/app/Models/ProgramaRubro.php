<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProgramaRubro extends Model
{
    use HasFactory;

    protected $fillable = [
        'tipo_programa_id',
        'clave',
        'nombre',
        'descripcion',
        'porcentaje_maximo',
        'activo',
    ];

    protected $casts = [
        'porcentaje_maximo' => 'decimal:2',
        'activo' => 'boolean',
    ];

    public function tipoPrograma(): BelongsTo
    {
        return $this->belongsTo(TipoPrograma::class);
    }
}
