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
        // E45: el nombre interno del archivo no sale; se expone la URL autenticada (avatar_url / banner_url).
        'avatar_path',
        'banner_path',
        // E52: datos personales del registro general. No viajan en listados ni en /auth/me; los expone a mano solo
        // quien los necesita (admin en la revisión, la propia persona en "Mi cuenta").
        'curp',
        'datos_registro',
    ];

    /** E52: roles otorgados (el activo es rol_id). */
    public function usuarioRoles()
    {
        return $this->hasMany(UsuarioRol::class);
    }

    /** E45: toda serialización de un usuario lleva su foto y portada, para identificarlo en cualquier vista. */
    protected $appends = ['avatar_url', 'banner_url'];

    public function getAvatarUrlAttribute(): ?string
    {
        return $this->avatar_path ? '/api/media/perfil/'.$this->avatar_path : null;
    }

    public function getBannerUrlAttribute(): ?string
    {
        return $this->banner_path ? '/api/media/perfil/'.$this->banner_path : null;
    }

    /** Admin de convocatoria (E45): convocatorias que opera. */
    public function convocatoriasAsignadas()
    {
        return $this->belongsToMany(Convocatoria::class, 'convocatoria_user');
    }

    /** Alcance por periodo (E45). */
    public function periodos()
    {
        return $this->belongsToMany(Periodo::class, 'periodo_user');
    }

    public function tieneRol(string ...$slugs): bool
    {
        foreach ($slugs as $slug) {
            if ((int) $this->rol_id === (int) config("comecyt.roles.{$slug}")) {
                return true;
            }
        }

        return false;
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'activo' => 'boolean',
            'ultimo_acceso' => 'datetime',
            'two_factor_confirmed_at' => 'datetime',
            'password_changed_at' => 'datetime',
            // Secret y recovery codes se guardan encriptados en DB
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted:array',
            'datos_registro' => 'array',
        ];
    }

    /**
     * SEGURIDAD (24/09/2026): cualquier cambio de contraseña —propio, restablecimiento por correo, admin o SSO—
     * marca el momento. ApiAuthenticate rechaza los JWT emitidos antes: cierra las sesiones abiertas en otros
     * equipos. Va en el modelo para que ningún camino se quede sin hacerlo.
     */
    protected static function booted(): void
    {
        static::saving(function (User $user) {
            if ($user->isDirty('password') && $user->exists) {
                $user->password_changed_at = now();
            }
        });
    }

    /** ¿Este JWT (claim `iat`) se emitió antes del último cambio de contraseña? */
    public function tokenAnteriorAlCambioDeClave(?int $iat): bool
    {
        if (! $this->password_changed_at || $iat === null) {
            return false;
        }

        // Comparación en segundos (resolución de `iat`): un token emitido en el mismo segundo del cambio es válido
        // — es el que se entrega justo después de cambiarla.
        return $iat < $this->password_changed_at->getTimestamp();
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
