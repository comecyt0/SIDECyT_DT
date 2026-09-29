<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Catálogo de escuelas (E52 · F1). Lo carga el admin por Excel o una por una. */
class Escuela extends Model
{
    public const NIVELES = ['primaria', 'secundaria', 'media_superior', 'superior'];
    public const SISTEMAS = ['estatal', 'federal'];

    protected $fillable = ['cct', 'nombre', 'municipio', 'nivel', 'sistema', 'activo'];

    protected $casts = ['activo' => 'boolean'];
}
