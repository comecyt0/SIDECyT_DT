<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    public $timestamps = false;

    // SEV-1 — AuditLog es WORM (write-once, read-many) por diseño.
    // Denylist conservadora: bloquea PK. Los controllers nunca exponen update/delete
    // sobre este modelo (sólo el servicio interno de auditoría crea filas).
    protected $guarded = ['id'];

    protected $casts = [
        'metadata' => 'array',
        'created_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function subject()
    {
        return $this->morphTo();
    }
}
