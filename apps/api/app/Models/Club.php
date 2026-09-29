<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Club escolar registrado en una convocatoria de Apoyo en especie (E52 · F1/F2).
 *
 * Estados: borrador → enviado (en la etapa `etapa_actual_id`) → observado (subsanar antes de `vence_at`) → subsanado →
 * … → aprobado_revision (pasó todas las etapas) → aceptado (visto bueno del admin de convocatoria + comité) | rechazado.
 * "Vencido" no es un estado guardado: es `observado` con `vence_at` ya pasado (lo decide el revisor).
 * Todo lo operativo (folio, estado, etapa, plazos, marcas de revisión y comité) solo lo escribe el servidor.
 */
class Club extends Model
{
    protected $table = 'clubes';

    protected $guarded = [
        'id', 'folio', 'estado', 'lider_id', 'convocatoria_id', 'enviado_at', 'logo_path', 'created_at', 'updated_at',
        'etapa_actual_id', 'ronda', 'vence_at', 'visto_bueno_at', 'visto_bueno_por', 'comite_resultado', 'comite_at',
        'comite_por', 'aceptado_at', 'rechazo_origen', 'rechazo_motivo', 'aviso_privacidad_at',
        'kit_fecha', 'kit_lugar', 'kit_asignado_at', 'kit_entregado_at', 'kit_entregado_lugar', 'kit_entrego', 'kit_recibio', 'kit_registrado_por',
    ];

    /** Estados de un club ya aceptado (F3: logística; `kit_entregado` detiene el confeti del líder). */
    public const ACEPTADOS = ['aceptado', 'kit_entregado'];

    protected $hidden = ['logo_path'];

    protected $casts = [
        'datos' => 'array', 'enviado_at' => 'datetime', 'vence_at' => 'datetime', 'visto_bueno_at' => 'datetime',
        'comite_at' => 'datetime', 'aceptado_at' => 'datetime', 'aviso_privacidad_at' => 'datetime', 'ronda' => 'integer',
        'kit_fecha' => 'datetime', 'kit_asignado_at' => 'datetime', 'kit_entregado_at' => 'datetime',
    ];

    protected $appends = ['logo_url'];

    /** Estados en los que el club espera la resolución de su etapa actual. */
    public const EN_REVISION = ['enviado', 'subsanado'];

    public function getLogoUrlAttribute(): ?string
    {
        return $this->logo_path ? '/api/media/club/'.$this->logo_path : null;
    }

    public function convocatoria()
    {
        return $this->belongsTo(Convocatoria::class);
    }

    public function escuela()
    {
        return $this->belongsTo(Escuela::class);
    }

    public function lider()
    {
        return $this->belongsTo(User::class, 'lider_id');
    }

    public function integrantes()
    {
        return $this->hasMany(ClubIntegrante::class)->orderByDesc('es_lider')->orderBy('orden')->orderBy('id');
    }

    public function documentos()
    {
        return $this->hasMany(ClubDocumento::class);
    }

    public function etapaActual()
    {
        return $this->belongsTo(EspecieEtapa::class, 'etapa_actual_id');
    }

    public function logisticas()
    {
        return $this->hasMany(ClubLogistica::class);
    }

    public function firmados()
    {
        return $this->hasMany(ClubFirmado::class)->orderByDesc('id');
    }

    public function revisiones()
    {
        return $this->hasMany(ClubRevision::class)->orderBy('created_at')->orderBy('id');
    }

    /** Observado con el plazo ya vencido: el líder ya no puede corregir; decide el revisor (rechazar o prórroga). */
    public function vencido(): bool
    {
        return $this->estado === 'observado' && $this->vence_at !== null && $this->vence_at->isPast();
    }

    /** Estado para mostrar: igual al guardado, salvo "vencido". */
    public function estadoVisible(): string
    {
        return $this->vencido() ? 'vencido' : $this->estado;
    }

    /** El líder edita en captura y mientras subsana dentro del plazo (decisión del usuario: puede corregir cualquier dato). */
    public function editable(): bool
    {
        return $this->estado === 'borrador' || ($this->estado === 'observado' && ! $this->vencido());
    }
}
