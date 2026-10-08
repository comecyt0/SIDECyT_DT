<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Etapa de revisión de una convocatoria de Apoyo en especie (E52 · F2). En secuencia por `orden`; `revisa` decide quién
 * puede resolverla (revisor documental, admin de convocatoria o cualquiera de los dos); `plazo_horas` son horas naturales
 * para subsanar y `max_subsanaciones` cuántas veces se puede observar en esta etapa.
 */
class EspecieEtapa extends Model
{
    protected $table = 'especie_etapas';

    public const REVISA = ['revisor', 'admin_convocatoria', 'ambos'];

    protected $fillable = ['orden', 'nombre', 'revisa', 'plazo_horas', 'max_subsanaciones', 'aprobaciones_requeridas'];

    protected $casts = ['orden' => 'integer', 'plazo_horas' => 'integer', 'max_subsanaciones' => 'integer', 'aprobaciones_requeridas' => 'integer'];

    public function convocatoria()
    {
        return $this->belongsTo(Convocatoria::class);
    }

    /** E70: personas asignadas a la fase. Sin asignar, la resuelve cualquiera con el rol de `revisa` (como antes). */
    public function revisores()
    {
        return $this->belongsToMany(User::class, 'especie_etapa_revisores', 'etapa_id', 'user_id')->withTimestamps();
    }

    /** ¿Puede este rol resolver la etapa? (el admin general siempre puede). */
    public function permiteRol(string $slug): bool
    {
        return $slug === 'admin'
            || ($slug === 'revisor' && in_array($this->revisa, ['revisor', 'ambos'], true))
            || ($slug === 'admin_convocatoria' && in_array($this->revisa, ['admin_convocatoria', 'ambos'], true));
    }
}
