<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Hilo del buzón de sugerencias (E45): un solicitante con el equipo de una convocatoria. */
class Conversacion extends Model
{
    protected $table = 'conversaciones';

    public const CATEGORIAS = ['sugerencia', 'duda', 'problema'];

    protected $fillable = ['convocatoria_id', 'solicitante_id', 'asunto', 'categoria'];

    protected $casts = [
        'ultimo_mensaje_at' => 'datetime',
        'resuelta_at' => 'datetime',
    ];

    public function convocatoria()
    {
        return $this->belongsTo(Convocatoria::class);
    }

    public function solicitante()
    {
        return $this->belongsTo(User::class, 'solicitante_id');
    }

    public function mensajes()
    {
        return $this->hasMany(ConversacionMensaje::class);
    }

    public function ultimoMensaje()
    {
        return $this->hasOne(ConversacionMensaje::class)->latestOfMany();
    }
}
