<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Solicitud de transporte y box lunch de un club (E52 · F3): una por club (modo convocatoria) o una por club y evento
 * (modo evento). Aparta cupo mientras está enviada, firmada o aprobada; rechazada o cancelada lo libera.
 * Todo lo escribe el servidor (sin asignación masiva).
 */
class ClubLogistica extends Model
{
    protected $table = 'club_logistica';

    public const APARTAN = ['enviada', 'firmada', 'aprobada'];

    protected $guarded = ['*'];

    protected $casts = ['transporte' => 'integer', 'lunch' => 'integer', 'enviada_at' => 'datetime'];

    public function club()
    {
        return $this->belongsTo(Club::class);
    }

    public function evento()
    {
        return $this->belongsTo(EspecieEvento::class, 'evento_id');
    }

    public function firmados()
    {
        return $this->hasMany(ClubFirmado::class, 'logistica_id')->orderByDesc('id');
    }
}
