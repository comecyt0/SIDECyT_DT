<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Integrante de un club (E52 · F1). Lo captura el líder; el líder mismo es el primer integrante (es_lider). */
class ClubIntegrante extends Model
{
    protected $table = 'club_integrantes';

    // es_lider_b (08/10/2026): tarjeta del líder B; la crean y quitan los accesos del club (App\Support\LiderBIntegrante).
    protected $guarded = ['id', 'club_id', 'es_lider', 'es_lider_b', 'foto_path', 'created_at', 'updated_at'];

    protected $hidden = ['foto_path'];

    protected $casts = ['datos' => 'array', 'es_lider' => 'boolean', 'es_lider_b' => 'boolean', 'fecha_nacimiento' => 'date:Y-m-d', 'curp_problemas' => 'array'];

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
