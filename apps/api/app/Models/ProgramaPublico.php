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
}
