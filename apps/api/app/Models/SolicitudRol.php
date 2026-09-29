<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Una persona CON cuenta pide otro rol desde "Mis roles" (E52). La aprueba o rechaza un admin. */
class SolicitudRol extends Model
{
    protected $table = 'solicitudes_rol';

    // estado/revisión solo los escribe el controlador con forceFill (patrón E30).
    protected $guarded = ['id', 'estado', 'motivo_rechazo', 'revisado_por', 'revisado_at', 'created_at', 'updated_at'];

    protected $casts = [
        'datos_rol' => 'array',
        'revisado_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function revisadoPor()
    {
        return $this->belongsTo(User::class, 'revisado_por');
    }
}
