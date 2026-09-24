<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Folio aprobado que el admin confirmó publicar en la landing (E45). Instantánea: no cambia si la solicitud cambia. */
class FolioPublicado extends Model
{
    protected $table = 'folios_publicados';

    public $timestamps = false;

    protected $fillable = ['convocatoria_id', 'solicitud_id', 'folio', 'publicado_por', 'publicado_at'];

    protected $casts = ['publicado_at' => 'datetime'];

    public function convocatoria()
    {
        return $this->belongsTo(Convocatoria::class);
    }
}
