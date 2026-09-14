<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ministracion extends Model
{
    protected $table = 'ministraciones';

    // SEV-1 — Denylist. PK y timestamps bloqueados; `estado` permanece asignable
    // porque el flujo de tesorería lo actualiza, protegido por middleware admin.
    protected $guarded = [
        'id',
        'created_at',
        'updated_at',
    ];

    public function solicitud()
    {
        return $this->belongsTo(Solicitud::class);
    }

    public function banco()
    {
        return $this->belongsTo(Banco::class);
    }
}
