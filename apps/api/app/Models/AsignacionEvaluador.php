<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AsignacionEvaluador extends Model
{
    protected $table = 'asignaciones_evaluador';

    /**
     * E85: las asignaciones retiradas por el admin de convocatoria (no se borran) no cuentan en ningún lado. Para verlas
     * o reactivarlas: withoutGlobalScope('vigentes').
     */
    protected static function booted(): void
    {
        static::addGlobalScope('vigentes', fn ($q) => $q->whereNull($q->getModel()->getTable().'.retirada_at'));
    }

    // SEV-1 — Denylist. PK y timestamps bloqueados; el resto (incluyendo 'estado')
    // permanece asignable porque el flujo iniciar/concluir lo necesita, pero los
    // endpoints están protegidos por middleware admin/evaluador.
    protected $guarded = [
        'id',
        'created_at',
        'updated_at',
    ];

    // E72 paso 5: fecha límite aplicada y conflictos aceptados al asignar
    protected $casts = [
        'fecha_limite' => 'date',
        'carta_imparcialidad_aceptada' => 'boolean',
        'concluida_at' => 'datetime',
        'aviso_previo_at' => 'datetime',
        'aviso_vence_at' => 'datetime',
        'conflictos_aceptados' => 'array',
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

    /** Vencida: tiene fecha límite, ya pasó en hora del centro (el día límite todavía cuenta) y no concluyó. */
    public function vencida(): bool
    {
        return $this->estado !== 'concluido'
            && $this->fecha_limite !== null
            && $this->fecha_limite->toDateString() < Convocatoria::hoy();
    }

    /** asignado | evaluando | concluido | vencida */
    public function estadoVisible(): string
    {
        return $this->vencida() ? 'vencida' : (string) $this->estado;
    }
}
