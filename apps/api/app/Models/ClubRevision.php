<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Historial de un club (E52 · F2): cada envío, resolución de etapa (aprobado / observado / rechazado), prórroga y
 * corrección del líder. Solo lo escribe el servidor; nunca se edita ni se borra (queda como evidencia).
 */
class ClubRevision extends Model
{
    protected $table = 'club_revisiones';

    public const UPDATED_AT = null;

    protected $guarded = ['id'];

    protected $casts = ['vence_at' => 'datetime', 'created_at' => 'datetime', 'ronda' => 'integer', 'horas' => 'integer'];

    public function club()
    {
        return $this->belongsTo(Club::class);
    }

    public function etapa()
    {
        return $this->belongsTo(EspecieEtapa::class, 'etapa_id');
    }

    public function usuario()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
