<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SolicitudMiembroEquipo extends Model
{
    protected $table = 'solicitud_miembros_equipo';

    protected $fillable = [
        'solicitud_id',
        'nombre_completo',
        'edad',
        'curp',
        'institucion_educativa',
        'correo',
        'telefono',
        'rol_en_equipo',
        'es_lider',
    ];

    protected $casts = [
        'es_lider' => 'boolean',
    ];

    public function solicitud(): BelongsTo
    {
        return $this->belongsTo(Solicitud::class);
    }
}
