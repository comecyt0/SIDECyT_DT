<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Integrante de un club (E52 · F1). Lo captura el líder; el líder mismo es el primer integrante (es_lider). */
class ClubIntegrante extends Model
{
    protected $table = 'club_integrantes';

    protected $guarded = ['id', 'club_id', 'es_lider', 'foto_path', 'created_at', 'updated_at'];

    protected $hidden = ['foto_path'];

    protected $casts = ['datos' => 'array', 'es_lider' => 'boolean', 'fecha_nacimiento' => 'date:Y-m-d'];

    protected $appends = ['foto_url', 'menor_de_edad'];

    public function getFotoUrlAttribute(): ?string
    {
        return $this->foto_path ? '/api/media/club/'.$this->foto_path : null;
    }

    public function getMenorDeEdadAttribute(): ?bool
    {
        return $this->fecha_nacimiento ? $this->fecha_nacimiento->age < 18 : null;
    }

    public function club()
    {
        return $this->belongsTo(Club::class);
    }
}
