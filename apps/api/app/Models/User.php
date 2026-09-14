<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use PHPOpenSourceSaver\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'rol_id',
        'empresa_id',
        'telefono',
        'cargo',
        'activo',
        'ultimo_acceso',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'activo' => 'boolean',
            'ultimo_acceso' => 'datetime',
            'two_factor_confirmed_at' => 'datetime',
            // Secret y recovery codes se guardan encriptados en DB
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted:array',
        ];
    }

    /** Helper: ¿el usuario tiene 2FA activo? */
    public function hasTwoFactorEnabled(): bool
    {
        return ! is_null($this->two_factor_confirmed_at) && ! is_null($this->two_factor_secret);
    }

    public function rol()
    {
        return $this->belongsTo(Rol::class);
    }

    public function empresa()
    {
        return $this->belongsTo(Empresa::class);
    }

    /**
     * Get the identifier that will be stored in the subject claim of the JWT.
     */
    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    /**
     * Return a key value array, containing any custom claims to be added to the JWT.
     */
    public function getJWTCustomClaims(): array
    {
        $this->loadMissing('rol', 'empresa');

        return [
            'rol' => $this->rol ? $this->rol->slug : null,
            'empresa' => $this->empresa ? $this->empresa->acronimo : null,
        ];
    }
}
