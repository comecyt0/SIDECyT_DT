<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AsignacionEvaluador extends Model
{
    protected $table = 'asignaciones_evaluador';

    // SEV-1 — Denylist. PK y timestamps bloqueados; el resto (incluyendo 'estado')
    // permanece asignable porque el flujo iniciar/concluir lo necesita, pero los
    // endpoints están protegidos por middleware admin/evaluador.
    protected $guarded = [
        'id',
        'created_at',
        'updated_at',
    ];

    public function solicitud()
    {
        return $this->belongsTo(Solicitud::class);
    }

    public function evaluador()
    {
        return $this->belongsTo(User::class, 'evaluador_id');
    }

    public function asignadoPor()
    {
        return $this->belongsTo(User::class, 'asignado_por');
    }

    public function dictamen()
    {
        return $this->hasOne(Dictamen::class, 'asignacion_id');
    }
}
