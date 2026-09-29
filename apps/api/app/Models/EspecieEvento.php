<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Evento de una convocatoria de Apoyo en especie (E52 · F3). Catálogo básico: nombre, fecha, sede y, si la logística es
 * por evento, sus cupos de transporte y box lunch (null = sin tope). F4 agrega el escaneo de asistencia.
 */
class EspecieEvento extends Model
{
    protected $table = 'especie_eventos';

    protected $fillable = ['nombre', 'fecha', 'sede', 'cupo_transporte', 'cupo_lunch', 'orden'];

    protected $casts = ['fecha' => 'date:Y-m-d', 'cupo_transporte' => 'integer', 'cupo_lunch' => 'integer', 'orden' => 'integer'];

    public function convocatoria()
    {
        return $this->belongsTo(Convocatoria::class);
    }
}
