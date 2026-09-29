<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Configuración de una convocatoria de Apoyo en especie (E52 · F1). 1:1 con la convocatoria. Solo la escribe el admin. */
class EspecieConfig extends Model
{
    protected $table = 'especie_config';

    protected $fillable = [
        'min_integrantes', 'max_integrantes', 'clubes_por_escuela', 'participan_menores',
        'kit_nombre', 'kit_descripcion', 'campos_club', 'campos_integrante',
    ];

    protected $casts = [
        'participan_menores' => 'boolean',
        'campos_club' => 'array',
        'campos_integrante' => 'array',
        'min_integrantes' => 'integer',
        'max_integrantes' => 'integer',
        'clubes_por_escuela' => 'integer',
    ];

    public function convocatoria()
    {
        return $this->belongsTo(Convocatoria::class);
    }

    public function campos()
    {
        return $this->hasMany(EspecieCampo::class, 'convocatoria_id', 'convocatoria_id')->orderBy('orden');
    }
}
