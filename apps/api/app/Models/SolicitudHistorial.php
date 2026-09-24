<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Cada cambio de estado de una solicitud (E45, seguimiento). Lo escribe el modelo Solicitud, nunca el público. */
class SolicitudHistorial extends Model
{
    protected $table = 'solicitud_historial';

    public $timestamps = false;

    protected $fillable = ['solicitud_id', 'estado_anterior', 'estado_nuevo', 'user_id', 'motivo', 'created_at'];

    protected $casts = ['created_at' => 'datetime'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
