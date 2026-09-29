<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Club escolar registrado en una convocatoria de Apoyo en especie (E52 · F1). Lo crea y edita su líder mientras está en
 * `borrador`; al enviarlo pasa a revisión (F2). `folio`, `estado`, `lider_id` y `enviado_at` solo los escribe el servidor.
 */
class Club extends Model
{
    protected $table = 'clubes';

    protected $guarded = ['id', 'folio', 'estado', 'lider_id', 'convocatoria_id', 'enviado_at', 'logo_path', 'created_at', 'updated_at'];

    protected $hidden = ['logo_path'];

    protected $casts = ['datos' => 'array', 'enviado_at' => 'datetime'];

    protected $appends = ['logo_url'];

    public const EDITABLES = ['borrador'];

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

    public function editable(): bool
    {
        return in_array($this->estado, self::EDITABLES, true);
    }
}
