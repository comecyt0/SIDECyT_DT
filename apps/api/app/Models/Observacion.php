<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Observacion extends Model
{
    protected $fillable = [
        'solicitud_id',
        'user_id',
        'campo',
        'tipo',
        'comentario',
        'resuelta',
        'respuesta_solicitante',
    ];

    protected $table = 'observaciones';

    /**
     * Relación: Una observación pertenece a una solicitud
     */
    public function solicitud()
    {
        return $this->belongsTo(Solicitud::class);
    }

    /**
     * Relación: Una observación fue creada por un usuario (revisor/evaluador/admin)
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
