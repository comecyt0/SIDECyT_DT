<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** E47: borrador del asistente de convocatorias (solo lo ve y usa quien lo creó). */
class ConvocatoriaBorrador extends Model
{
    protected $table = 'convocatoria_borradores';

    /** user_id se asigna en el servidor con forceFill, nunca desde la petición. */
    protected $fillable = ['nombre', 'paso', 'datos'];

    protected $casts = [
        'datos' => 'array',
        'paso' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
