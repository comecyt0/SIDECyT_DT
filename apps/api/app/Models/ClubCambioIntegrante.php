<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * E92 — Solicitud de cambio de integrante (App\Support\CambioIntegrante). Todo lo escribe el servidor: no hay asignación
 * masiva. Los archivos (foto y permiso de imagen) viven en disco privado y nunca salen en JSON.
 */
class ClubCambioIntegrante extends Model
{
    protected $table = 'club_cambios_integrante';

    protected $guarded = ['*'];

    protected $hidden = ['foto_path', 'permiso_archivo'];

    protected $casts = ['nuevo' => 'array', 'resuelto_at' => 'datetime'];

    public const ESTADOS = ['pendiente', 'aprobada', 'rechazada', 'cancelada'];

    public function club()
    {
        return $this->belongsTo(Club::class);
    }

    public function sale()
    {
        return $this->belongsTo(ClubIntegrante::class, 'integrante_sale_id');
    }

    public function resolvio()
    {
        return $this->belongsTo(User::class, 'resuelto_por');
    }
}
