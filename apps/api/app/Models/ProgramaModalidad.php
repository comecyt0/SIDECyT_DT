<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProgramaModalidad extends Model
{
    use HasFactory;

    protected $table = 'programa_modalidades';

    protected $fillable = [
        'tipo_programa_id',
        'clave',
        'nombre',
        'descripcion',
        'monto_maximo_especifico',
        'activo',
    ];

    protected $casts = [
        'activo' => 'boolean',
        'monto_maximo_especifico' => 'decimal:2',
    ];

    public function tipoPrograma(): BelongsTo
    {
        return $this->belongsTo(TipoPrograma::class);
    }
}
