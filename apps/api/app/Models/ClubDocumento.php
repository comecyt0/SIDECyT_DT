<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Documento de un club (E52 · F1): disco privado, descarga con sesión y permiso. */
class ClubDocumento extends Model
{
    protected $table = 'club_documentos';

    protected $guarded = ['*'];

    protected $hidden = ['archivo'];

    public function club()
    {
        return $this->belongsTo(Club::class);
    }
}
