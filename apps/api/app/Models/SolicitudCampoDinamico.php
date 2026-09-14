<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SolicitudCampoDinamico extends Model
{
    protected $table = 'solicitud_campos_dinamicos';

    protected $fillable = [
        'solicitud_id',
        'programa_campo_id',
        'valor_texto',
        'valor_numero',
        'valor_fecha',
        'valor_json',
    ];

    protected $casts = [
        'valor_numero' => 'decimal:2',
        'valor_fecha' => 'date',
        'valor_json' => 'array',
    ];

    public function solicitud(): BelongsTo
    {
        return $this->belongsTo(Solicitud::class);
    }

    public function campo(): BelongsTo
    {
        return $this->belongsTo(ProgramaCampo::class, 'programa_campo_id');
    }
}
