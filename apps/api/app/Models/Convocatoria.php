<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class Convocatoria extends Model
{
    use HasFactory;

    // SEV-1 defense-in-depth: bloquea mass-assign de PK/timestamps.
    // E40: la prórroga y el banner solo se escriben desde sus endpoints dedicados (forceFill), nunca por
    // el update genérico — así un PUT con campos extra no puede darse una prórroga ni cambiar la imagen.
    protected $guarded = [
        'id', 'created_at', 'updated_at',
        'fecha_prorroga', 'motivo_prorroga', 'prorroga_at', 'prorroga_por', 'banner_url',
    ];

    protected $table = 'convocatorias';

    /** Estado que ve el público (landing) y el admin, derivado de `estado` + fechas (E40). */
    public const PUBLICO_BORRADOR = 'borrador';
    public const PUBLICO_PROXIMA = 'proxima';
    public const PUBLICO_ABIERTA = 'abierta';
    public const PUBLICO_PRORROGA = 'prorroga';
    public const PUBLICO_CERRADA = 'cerrada';

    protected $appends = ['estado_publico', 'fecha_cierre_efectiva'];

    /**
     * La landing pública cachea las convocatorias 5 min (ConvocatoriaPublicaController).
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

    /** E52: configuración de Apoyo en especie (solo si el programa es tipo_apoyo = especie). */
    public function especieConfig(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(EspecieConfig::class);
    }

    /** E52: clubes registrados (Apoyo en especie). */
    public function clubes(): HasMany
    {
        return $this->hasMany(Club::class);
    }

    /** E45: periodo de la convocatoria (alcance de visión por periodo). */
    public function periodo(): BelongsTo
    {
        return $this->belongsTo(Periodo::class);
    }

    /** E45: administradores de convocatoria asignados. */
    public function administradores(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(User::class, 'convocatoria_user');
    }

    /** Hoy en la zona horaria de negocio (Toluca), no en UTC — ver config comecyt.timezone_negocio. */
    public static function hoy(): string
    {
        return Carbon::now(config('comecyt.timezone_negocio', 'America/Mexico_City'))->toDateString();
    }

    /** Fecha límite real: la prórroga si existe, si no la de cierre original ('YYYY-MM-DD'). */
    public function getFechaCierreEfectivaAttribute(): ?string
    {
        $fecha = $this->fecha_prorroga ?: $this->fecha_cierre;

        return $fecha ? substr((string) $fecha, 0, 10) : null;
    }

    /**
     * borrador → no se publica · proxima → publicada, aún no abre · abierta → recibe solicitudes ·
     * prorroga → recibe solicitudes con plazo ampliado · cerrada → cerrada a mano o ya pasó su fecha límite.
     * Las fechas son días completos: el día de cierre todavía cuenta como abierto.
     */
    public function getEstadoPublicoAttribute(): string
    {
        if ($this->estado === 'borrador') {
            return self::PUBLICO_BORRADOR;
        }
        if ($this->estado === 'cerrada') {
            return self::PUBLICO_CERRADA;
        }

        $hoy = self::hoy();
        $apertura = $this->fecha_apertura ? substr((string) $this->fecha_apertura, 0, 10) : null;
        $limite = $this->fecha_cierre_efectiva;

        if ($apertura && $hoy < $apertura) {
            return self::PUBLICO_PROXIMA;
        }
        if ($limite && $hoy > $limite) {
            return self::PUBLICO_CERRADA;
        }

        return $this->fecha_prorroga ? self::PUBLICO_PRORROGA : self::PUBLICO_ABIERTA;
    }

    /** ¿Se pueden crear y enviar solicitudes hoy? (abierta o con prórroga) */
    public function aceptaSolicitudes(): bool
    {
        return in_array($this->estado_publico, [self::PUBLICO_ABIERTA, self::PUBLICO_PRORROGA], true);
    }

    /** Convocatorias que reciben solicitudes hoy — misma regla que aceptaSolicitudes(), en SQL. */
    public function scopeAceptandoSolicitudes(Builder $q): Builder
    {
        $hoy = self::hoy();

        return $q->where('estado', 'activa')
            ->whereNull('deleted_at')
            ->whereDate('fecha_apertura', '<=', $hoy)
            ->whereRaw('COALESCE(fecha_prorroga, fecha_cierre) >= ?', [$hoy]);
    }
}
