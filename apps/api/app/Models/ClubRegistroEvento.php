<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Registro de un club en un evento (E52 · F4): asistencia (personas que llegaron) o box lunch (cantidad entregada). Uno
 * por club, evento y tipo; se corrige volviendo a registrar (cada cambio queda en la bitácora). Lo escribe el servidor.
 */
class ClubRegistroEvento extends Model
{
    protected $table = 'club_registros_evento';

    public const TIPOS = ['asistencia', 'lunch'];

    protected $guarded = ['*'];

    protected $casts = ['cantidad' => 'integer'];

    public function club()
    {
        return $this->belongsTo(Club::class);
    }

    public function evento()
    {
        return $this->belongsTo(EspecieEvento::class, 'evento_id');
    }

    public function registrador()
    {
        return $this->belongsTo(User::class, 'registrado_por');
    }
}
