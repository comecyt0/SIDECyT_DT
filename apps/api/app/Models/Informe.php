<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Informe extends Model
{
    // SEV-1 — Denylist. PK y timestamps bloqueados; `estado` permanece asignable
    // porque el flujo revisor lo actualiza, protegido por middleware revisor.
    protected $guarded = [
        'id',
        'created_at',
        'updated_at',
    ];

    protected $table = 'informes';

    public function solicitud()
    {
        return $this->belongsTo(Solicitud::class);
    }
}
