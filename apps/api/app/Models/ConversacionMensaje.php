<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Mensaje de un hilo del buzón (E45). Solo texto. `leido_at` lo marca el lado contrario al autor. */
class ConversacionMensaje extends Model
{
    protected $table = 'conversacion_mensajes';

    public const MAX_CARACTERES = 2000;

    protected $fillable = ['conversacion_id', 'user_id', 'cuerpo'];

    protected $casts = ['leido_at' => 'datetime'];

    public function conversacion()
    {
        return $this->belongsTo(Conversacion::class);
    }

    public function autor()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
