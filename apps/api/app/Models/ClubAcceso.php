<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** E61 — Acceso de un acompañante (líder B o director) a un club. Solo lo escribe el líder desde su endpoint. */
class ClubAcceso extends Model
{
    public const TIPOS = ['lider_b', 'director'];

    public const ETIQUETAS = ['lider_b' => 'Líder B', 'director' => 'Director(a) de la escuela'];

    protected $table = 'club_accesos';

    protected $guarded = ['*'];

    protected $casts = ['colider' => 'boolean', 'colider_desde' => 'datetime'];

    public function club()
    {
        return $this->belongsTo(Club::class);
    }

    public function usuario()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
