<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Configuración de una convocatoria de Apoyo en especie (E52 · F1). 1:1 con la convocatoria. Solo la escribe el admin. */
class EspecieConfig extends Model
{
    protected $table = 'especie_config';

    /** Modalidad de la convocatoria (para qué etapa registran sus datos los clubes). */
    public const MODALIDADES = ['estatal', 'nacional', 'internacional'];

    protected $fillable = [
        'min_integrantes', 'max_integrantes', 'clubes_por_escuela', 'participan_menores',
        'kit_nombre', 'kit_descripcion', 'campos_club', 'campos_integrante', 'modalidad', 'formatos', 'kit_diferenciado', 'kits',
    ];

    protected $casts = [
        'participan_menores' => 'boolean',
        'campos_club' => 'array',
        'campos_integrante' => 'array',
        'formatos' => 'array', // E79
        'kit_diferenciado' => 'boolean', 'kits' => 'array', // E86
        'min_integrantes' => 'integer',
        'max_integrantes' => 'integer',
        'clubes_por_escuela' => 'integer',
        'acta_comite_at' => 'datetime',
        // F3 · logística (solo los escribe su endpoint con forceFill)
        'cupo_transporte' => 'integer', 'cupo_lunch' => 'integer', 'max_transporte_club' => 'integer', 'max_lunch_club' => 'integer',
        'tope_integrantes' => 'boolean', 'acompanantes' => 'integer', 'fecha_limite_logistica' => 'date:Y-m-d',
        // E71: apoyos que da la convocatoria y salida del transporte (solo los escribe ApoyosLogistica con forceFill).
        'incluye_transporte' => 'boolean', 'incluye_lunch' => 'boolean',
        'transporte_salida_hora' => 'datetime', 'transporte_regreso_hora' => 'datetime',
    ];

    public function eventos()
    {
        return $this->hasMany(EspecieEvento::class, 'convocatoria_id', 'convocatoria_id')->orderBy('orden')->orderBy('fecha');
    }

    /** El acta del comité solo la escribe su endpoint (nunca el PUT de configuración). */
    protected $hidden = ['acta_comite'];

    public function etapas()
    {
        return $this->hasMany(EspecieEtapa::class, 'convocatoria_id', 'convocatoria_id')->orderBy('orden');
    }

    public function convocatoria()
    {
        return $this->belongsTo(Convocatoria::class);
    }

    public function campos()
    {
        return $this->hasMany(EspecieCampo::class, 'convocatoria_id', 'convocatoria_id')->orderBy('orden');
    }
}
