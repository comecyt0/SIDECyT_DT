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

    public function institucion()
    {
        return $this->belongsTo(Empresa::class);
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
