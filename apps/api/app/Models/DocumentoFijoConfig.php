<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Tipos y tamaño máximo de los documentos fijos (carta compromiso, carátula, constancia, factura, informe). E45. */
class DocumentoFijoConfig extends Model
{
    protected $table = 'documentos_fijos_config';

    protected $fillable = ['formatos', 'tamano_maximo_mb'];

    protected $casts = ['tamano_maximo_mb' => 'integer'];
}
