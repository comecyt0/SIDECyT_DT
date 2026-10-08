<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * E61 — Acceso de un acompañante a un club. Solo lo escriben los endpoints del club (ClubAccesoController).
 * 08/10/2026: si el club lo registró el director (clubes.dueno_director), sus accesos son líder A y líder B; si lo
 * registró un docente (él es el líder A), son líder B y director.
 */
class ClubAcceso extends Model
{
    public const TIPOS = ['lider_a', 'lider_b', 'director'];

    public const ETIQUETAS = ['lider_a' => 'Líder A', 'lider_b' => 'Líder B', 'director' => 'Director(a) de la escuela'];

    protected $table = 'club_accesos';

    protected $guarded = ['*'];

    protected $casts = ['colider' => 'boolean', 'colider_desde' => 'datetime'];

    /** Tipos de acceso que admite el club según quién lo registró. */
    public static function tiposDe(Club $club): array
    {
        return $club->dueno_director ? ['lider_a', 'lider_b'] : ['lider_b', 'director'];
    }

    public function club()
    {
        return $this->belongsTo(Club::class);
    }

    public function usuario()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
