<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ListaNegra extends Model
{
    use HasFactory;

    protected $table = 'lista_negra';

    // SEV-1 — Denylist. PK y timestamps bloqueados. `activa` permanece asignable
    // porque el endpoint admin "remover veto" lo necesita; está protegido por middleware.
    protected $guarded = [
        'id',
        'created_at',
        'updated_at',
    ];

    /** 29/09/2026: faltaba; el listado la carga con with('empresa') y con la primera sanción daba 500. */
    public function empresa()
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    /** Nombre anterior (E25): sin la llave explícita buscaba la columna `institucion_id`, que ya no existe. */
    public function institucion()
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function solicitud()
    {
        return $this->belongsTo(Solicitud::class);
    }

    public function sancionador()
    {
        return $this->belongsTo(User::class, 'sancionado_por');
    }
}
