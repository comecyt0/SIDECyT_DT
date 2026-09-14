<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Rol extends Model
{
    // SEV-1 — Roles son inmutables en producción (creados via seeder).
    // Bloquear cualquier asignación masiva del id (rol_id es el vector de escalada).
    protected $guarded = ['id', 'created_at', 'updated_at'];

    protected $table = 'roles';

    //
}
