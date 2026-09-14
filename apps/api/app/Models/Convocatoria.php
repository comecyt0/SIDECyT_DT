<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Convocatoria extends Model
{
    use HasFactory;

    // SEV-1 defense-in-depth: bloquea mass-assign de PK/timestamps.
    protected $guarded = ['id', 'created_at', 'updated_at'];

    protected $table = 'convocatorias';

    public function tipoPrograma(): BelongsTo
    {
        return $this->belongsTo(TipoPrograma::class);
    }

    public function solicitudes(): HasMany
    {
        return $this->hasMany(Solicitud::class);
    }
}
