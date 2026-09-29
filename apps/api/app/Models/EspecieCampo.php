<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Campo personalizado del club o del integrante en una convocatoria de Apoyo en especie (E52 · F1). */
class EspecieCampo extends Model
{
    protected $table = 'especie_campos';

    protected $fillable = ['ambito', 'nombre_campo', 'etiqueta', 'tipo_campo', 'opciones_json', 'requerido', 'orden'];

    protected $casts = ['opciones_json' => 'array', 'requerido' => 'boolean'];
}
