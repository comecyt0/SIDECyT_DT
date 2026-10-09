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
        'qr_token', 'qr_hash', 'qr_habilitado_at', 'qr_habilitado_por',
        // E55: la escuela en revisión solo la fija el servidor (al crear el club con una solicitud propia).
        'escuela_solicitud_id',
        // 08/10/2026: club registrado por el director (da de alta al líder A y al líder B); solo lo cambia el servidor.
        'dueno_director',
    ];

    /** E55: solicitud de registro de escuela que espera este club (mientras `escuela_id` es nulo). */
    public function escuelaSolicitud()
    {
        return $this->belongsTo(EscuelaSolicitud::class);
    }

    /** Estados de un club ya aceptado (F3: logística; `kit_entregado` detiene el confeti del líder). */
    public const ACEPTADOS = ['aceptado', 'kit_entregado'];

    /** El token del QR nunca sale en JSON (ni cifrado ni su hash): solo se pinta como imagen para su líder. */
    protected $hidden = ['logo_path', 'qr_token', 'qr_hash'];

    protected $casts = [
        'datos' => 'array', 'enviado_at' => 'datetime', 'vence_at' => 'datetime', 'visto_bueno_at' => 'datetime',
        'comite_at' => 'datetime', 'aceptado_at' => 'datetime', 'aviso_privacidad_at' => 'datetime', 'ronda' => 'integer',
        'kit_fecha' => 'datetime', 'kit_asignado_at' => 'datetime', 'kit_entregado_at' => 'datetime',
        'qr_habilitado_at' => 'datetime', 'dueno_director' => 'boolean',
    ];

    public function registrosEvento()
    {
        return $this->hasMany(ClubRegistroEvento::class);
    }

    public function kitRegistrador()
    {
        return $this->belongsTo(User::class, 'kit_registrado_por');
    }

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
        return $this->hasMany(ClubIntegrante::class)->orderByDesc('es_lider')->orderByDesc('es_lider_b')->orderBy('orden')->orderBy('id');
    }

    /** E61 — líder B y director (acompañantes del club). */
    public function accesos()
    {
        return $this->hasMany(ClubAcceso::class);
    }

    /**
     * E61 — Qué es esta persona para el club: 'lider' (dueño: líder A o, si dueno_director, el director), el tipo de su
     * acceso ('lider_a', 'lider_b', 'director') con '_colider' si le compartieron el permiso, o null.
     * Los acompañantes solo cuentan con el rol activo `acompanante_club` (así un líder de otro club que también es
     * acompañante aquí opera cada club desde el rol correspondiente).
     */
    public function accesoDe(?User $u): ?string
    {
        if (! $u) return null;
        if ((int) $this->lider_id === (int) $u->id) return 'lider';
        if (! $u->tieneRol('acompanante_club')) return null;
        $a = $this->relationLoaded('accesos') ? $this->accesos->firstWhere('user_id', $u->id) : $this->accesos()->where('user_id', $u->id)->first();
        if (! $a) return null;

        // 08/10/2026: cualquier acompañante con el permiso compartido opera (lider_a_colider, lider_b_colider, director_colider).
        return $a->colider ? $a->tipo.'_colider' : $a->tipo;
    }

    /** E61 — Ver el club (seguimiento, QR, datos, logística): líder y acompañantes. */
    public function puedeVer(?User $u): bool
    {
        return $this->accesoDe($u) !== null;
    }

    /** E61 — Operar (editar, enviar, logística, subir firmados): el líder y el director mientras sea colíder. */
    public function puedeOperar(?User $u): bool
    {
        $a = $this->accesoDe($u);

        return $a === 'lider' || ($a !== null && str_ends_with($a, '_colider'));
    }

    /**
     * E61 — A quién avisar de lo que pasa con el club: el líder y el director mientras sea colíder (decisión del usuario);
     * con `conLiderB` también el líder B (fecha y lugar del kit). Solo cuentas activas.
     */
    public function destinatarios(bool $conLiderB = false): \Illuminate\Support\Collection
    {
        // 08/10/2026 (pedido del usuario): todo aviso y correo que recibe el líder A llega también al líder B y al director
        // (y al líder A de un club del director), siempre que estén dados de alta en este club. `$conLiderB` queda por
        // compatibilidad con quien lo llama: ya no restringe nada.
        $ids = collect([$this->lider_id])->merge($this->accesos()->pluck('user_id'));

        return User::whereIn('id', $ids->filter()->unique()->all())->where('activo', true)->get();
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
