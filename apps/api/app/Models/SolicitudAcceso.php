<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SolicitudAcceso extends Model
{
    use HasFactory;

    protected $table = 'solicitudes_acceso';

    // SEV-1 — Denylist robusta. Bloquea campos que solo el admin modifica al revisar:
    //   - estado, revisado_por, revisado_at, motivo_rechazo
    // Cualquier otra columna del schema (nombre, email, password, empresa_*, contactos…)
    // permanece asignable; el controller valida con $request->validate() además.
    protected $guarded = [
        'id',
        'estado',
        'revisado_por',
        'revisado_at',
        'motivo_rechazo',
        'created_at',
        'updated_at',
    ];

    protected $hidden = ['password'];

    protected $casts = [
        'revisado_at' => 'datetime',
        'password' => 'hashed',
        'empresa_datos' => 'array',
        'contactos' => 'array',
        'terminos_aceptados' => 'boolean',
    ];

    /**
     * The admin user who reviewed this access request.
     */
    public function revisadoPor()
    {
        return $this->belongsTo(User::class, 'revisado_por');
    }
}
