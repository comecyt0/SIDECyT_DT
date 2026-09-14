<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class SolicitudDocumento extends Model
{
    use SoftDeletes;

    protected $table = 'solicitud_documentos';

    protected $fillable = [
        'solicitud_id',
        'tipo',
        'nombre_original',
        'url',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function solicitud(): BelongsTo
    {
        return $this->belongsTo(Solicitud::class);
    }
}
