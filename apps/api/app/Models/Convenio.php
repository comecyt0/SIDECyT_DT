<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Convenio extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'solicitud_id',
        'numero_convenio',
        'estado',
        'monto_aprobado',
        'num_tranches',
        'fecha_generacion',
        'fecha_firma',
        'fecha_inicio_vigencia',
        'fecha_fin_vigencia',
        'pdf_url',
        'observaciones',
    ];

    protected $casts = [
        'monto_aprobado' => 'decimal:2',
        'fecha_generacion' => 'datetime',
        'fecha_firma' => 'datetime',
        'fecha_inicio_vigencia' => 'datetime',
        'fecha_fin_vigencia' => 'datetime',
    ];

    /**
     * Relationship: A convenio belongs to a solicitud
     */
    public function solicitud()
    {
        return $this->belongsTo(Solicitud::class);
    }

    /**
     * Relationship: A convenio has many ministeraciones (tranches)
     */
    public function ministeraciones()
    {
        return $this->hasMany(Ministracion::class);
    }
}
