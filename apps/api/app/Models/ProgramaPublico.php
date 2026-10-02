<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

/**
 * E49: programa que se presenta en las landings de SIDECyT (SIGAE / SICEI). Administrable desde /admin/sitio.
 * No es un TipoPrograma (ese es la configuración técnica 1:1 de cada convocatoria).
 */
class ProgramaPublico extends Model
{
    protected $table = 'programas_publicos';

    public const SISTEMAS = ['sigae', 'sicei'];

    public const ICONOS = ['wrench', 'graduation', 'rocket', 'network', 'lightbulb', 'award', 'shield', 'badge', 'book', 'flask', 'users', 'briefcase'];

    public const TONOS = ['sky', 'mint', 'peach'];

    protected $fillable = ['sistema', 'nombre', 'dirigido_a', 'resumen', 'correo', 'telefono', 'url_info', 'icono', 'tono', 'orden', 'activo'];

    protected $casts = ['activo' => 'boolean', 'orden' => 'integer'];

    protected static function booted(): void
    {
        $olvidar = fn (ProgramaPublico $p) => Cache::forget('public:sitio:'.$p->sistema);
        static::saved($olvidar);
        static::deleted($olvidar);
    }

    /**
     * E54: forma comparable de un nombre (sin mayúsculas, acentos ni espacios de más). Se compara en PHP: el LOWER() de
     * PostgreSQL con la intercalación de esta base no convierte letras acentuadas ('ROBÓTICA' → 'robÓtica').
     */
    public static function normalizar(string $nombre): string
    {
        return preg_replace('/\s+/', ' ', trim(mb_strtolower(\Illuminate\Support\Str::ascii(strip_tags($nombre)))));
    }

    /** E54: ¿ya hay un programa con ese nombre en el sistema? (para no crear duplicados). */
    public static function nombreOcupado(string $sistema, string $nombre, ?int $exceptoId = null): ?self
    {
        $buscado = self::normalizar($nombre);

        return self::where('sistema', $sistema)->when($exceptoId, fn ($q) => $q->where('id', '!=', $exceptoId))->get(['id', 'nombre', 'sistema', 'activo'])
            ->first(fn (self $p) => self::normalizar($p->nombre) === $buscado);
    }

    /** E54: convocatorias asociadas a este programa (2026, 2027…). */
    public function convocatorias()
    {
        return $this->hasMany(Convocatoria::class)->whereNull('deleted_at');
    }
}
