<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * E55 — Solicitud de registro de una escuela que no está en el catálogo. La envía un líder de club (con sus datos y los
 * de contacto) dentro de una convocatoria; la resuelve el admin o el admin de esa convocatoria. Todo lo operativo
 * (estado, motivo, quién y cuándo resolvió, escuela creada) lo escribe solo el servidor.
 */
class EscuelaSolicitud extends Model
{
    protected $table = 'escuela_solicitudes';

    public const ESTADOS = ['pendiente', 'aceptada', 'rechazada'];

    protected $fillable = ['cct', 'nombre', 'municipio', 'nivel', 'sistema', 'direccion', 'telefono', 'director'];

    protected $casts = ['revisado_at' => 'datetime'];

    public function lider()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function convocatoria()
    {
        return $this->belongsTo(Convocatoria::class);
    }

    public function escuela()
    {
        return $this->belongsTo(Escuela::class);
    }

    public function revisor()
    {
        return $this->belongsTo(User::class, 'revisado_por');
    }

    public function clubes()
    {
        return $this->hasMany(Club::class);
    }
}
