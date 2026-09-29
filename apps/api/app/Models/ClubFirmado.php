<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Documento firmado que sube el líder (E52 · F3): carta de resguardo o formato de una solicitud de transporte/box lunch.
 * Cada subida es una versión nueva (historial para los admins); la vigente es la más reciente no reemplazada. El admin o
 * admin de convocatoria la aprueba o la rechaza con motivo. Todo lo escribe el servidor.
 */
class ClubFirmado extends Model
{
    protected $table = 'club_firmados';

    protected $guarded = ['*'];

    protected $hidden = ['archivo'];

    protected $casts = ['revisado_at' => 'datetime'];

    public function club()
    {
        return $this->belongsTo(Club::class);
    }

    public function logistica()
    {
        return $this->belongsTo(ClubLogistica::class, 'logistica_id');
    }

    public function revisor()
    {
        return $this->belongsTo(User::class, 'revisado_por');
    }
}
