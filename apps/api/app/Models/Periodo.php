<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Periodo al que pertenece una convocatoria (E45). Define el alcance de visión de ciertos usuarios. */
class Periodo extends Model
{
    protected $table = 'periodos';

    protected $fillable = ['nombre', 'fecha_inicio', 'fecha_fin', 'activo'];

    protected $casts = [
        'fecha_inicio' => 'date:Y-m-d',
        'fecha_fin' => 'date:Y-m-d',
        'activo' => 'boolean',
    ];

    public function convocatorias()
    {
        return $this->hasMany(Convocatoria::class);
    }

    public function usuarios()
    {
        return $this->belongsToMany(User::class, 'periodo_user');
    }
}
