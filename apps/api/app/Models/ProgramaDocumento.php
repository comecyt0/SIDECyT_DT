<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProgramaDocumento extends Model
{
    use HasFactory;

    protected $fillable = [
        'tipo_programa_id',
        'etapa_id',
        'nombre',
        'clave',
        'descripcion',
        'formato_permitido',
        'tamaño_maximo_mb',
        'obligatorio',
        'orden',
        'activo',
    ];

    protected $casts = [
        'obligatorio' => 'boolean',
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
