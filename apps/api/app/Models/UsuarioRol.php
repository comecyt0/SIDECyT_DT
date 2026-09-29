<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Rol otorgado a una persona (E52). `users.rol_id` es el rol activo; aquí están todos los que puede usar. */
class UsuarioRol extends Model
{
    protected $table = 'usuario_roles';

    // Solo lo escribe el servidor (aprobaciones y alta de usuarios): nada asignable desde fuera.
    protected $guarded = ['*'];

    public function rol()
    {
        return $this->belongsTo(Rol::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /** Otorga (idempotente) un rol a la persona. */
    public static function otorgar(int $userId, int $rolId, ?int $otorgadoPor = null): void
    {
        $existe = static::where('user_id', $userId)->where('rol_id', $rolId)->exists();
        if ($existe) {
            return;
        }
        $r = new static();
        $r->forceFill(['user_id' => $userId, 'rol_id' => $rolId, 'otorgado_por' => $otorgadoPor])->save();
    }
}
