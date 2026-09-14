<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Modelo de Empresa (antes Institución).
 *
 * Tabla: `empresas` (renombrada desde `instituciones` en migration
 * 2026_06_02_120000_rename_instituciones_to_empresas).
 */
class Empresa extends Model
{
    use HasFactory;

    protected $table = 'empresas';

    // SEV-1 — Denylist. Bloquea explícitamente `en_lista_negra` (sólo el flujo
    // admin de sanciones puede setearlo) y los timestamps. El resto de columnas
    // del schema (nombre, acronimo, tipo, direccion, rfc, tipo_persona, etc.) son
    // editables vía los formularios validados de admin/postulante.
    protected $guarded = [
        'id',
        'en_lista_negra',
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    public function municipio()
    {
        return $this->belongsTo(Municipio::class);
    }

    public function solicitantes()
    {
        return $this->hasMany(User::class, 'empresa_id');
    }
}
