<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Categoría de apoyo (Fomento, Talento, Otra...).
 *
 * 100% editable por admin desde /admin/categorias.
 * Cada convocatoria se asocia a una categoría vía `categoria_id`.
 */
class CategoriaApoyo extends Model
{
    protected $table = 'categorias_apoyo';

    // SEV-1 defense-in-depth: bloquea mass-assign de PK/timestamps.
    protected $guarded = ['id', 'created_at', 'updated_at'];

    protected $casts = [
        'reembolsable' => 'boolean',
        'activa' => 'boolean',
        'orden' => 'integer',
    ];

    public function convocatorias()
    {
        return $this->hasMany(Convocatoria::class, 'categoria_id');
    }
}
