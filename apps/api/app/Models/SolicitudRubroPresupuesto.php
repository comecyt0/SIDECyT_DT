<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SolicitudRubroPresupuesto extends Model
{
    protected $table = 'solicitud_rubros_presupuesto';

    protected $fillable = [
        'solicitud_id',
        'rubro_id',
        'monto_solicitado',
        'monto_aprobado',
        'descripcion',
    ];

    protected $casts = [
        'monto_solicitado' => 'decimal:2',
        'monto_aprobado' => 'decimal:2',
    ];

    public function solicitud(): BelongsTo
    {
        return $this->belongsTo(Solicitud::class);
    }

    public function rubro(): BelongsTo
    {
        return $this->belongsTo(ProgramaRubro::class);
    }
}
