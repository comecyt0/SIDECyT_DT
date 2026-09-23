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

    /**
     * La landing pública cachea las convocatorias abiertas 5 min (ConvocatoriaPublicaController).
     * Cualquier alta, cambio o baja —desde el admin, el asistente o el cierre automático— la invalida.
     */
    protected static function booted(): void
    {
        $forget = fn () => \App\Http\Controllers\Convocatorias\ConvocatoriaPublicaController::forgetCache();
        static::saved($forget);
        static::deleted($forget);
    }

    public function tipoPrograma(): BelongsTo
    {
        return $this->belongsTo(TipoPrograma::class);
    }

    public function solicitudes(): HasMany
    {
        return $this->hasMany(Solicitud::class);
    }
}
