<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Catálogo oficial SEPOMEX del Estado de México (E52). Solo lectura para el público: se carga con sidecyt:cargar-cp. */
class CodigoPostal extends Model
{
    protected $table = 'codigos_postales';

    public $timestamps = false;

    protected $guarded = ['*'];
}
