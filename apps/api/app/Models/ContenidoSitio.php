<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

/** E49: listas editables de las landings (sectores, documentos, notas), por clave. */
class ContenidoSitio extends Model
{
    protected $table = 'contenido_sitio';

    protected $fillable = ['clave', 'valor'];

    protected $casts = ['valor' => 'array'];

    /**
     * Claves permitidas y su forma. `lista`: textos; `docs`: [{titulo, detalle}].
     * Una clave nueva se agrega aquí (y en el panel), nunca desde la petición.
     */
    public const CLAVES = [
        'sigae.sectores' => ['tipo' => 'lista', 'max' => 60, 'largo' => 60],
        'sigae.documentos' => ['tipo' => 'docs', 'max' => 20, 'largo' => 160],
        'sigae.documentos_notas' => ['tipo' => 'lista', 'max' => 10, 'largo' => 300],
    ];

    protected static function booted(): void
    {
        $olvidar = fn (ContenidoSitio $c) => Cache::forget('public:sitio:'.explode('.', $c->clave)[0]);
        static::saved($olvidar);
        static::deleted($olvidar);
    }

    public static function valor(string $clave): array
    {
        $v = static::where('clave', $clave)->value('valor');
        $v = is_string($v) ? json_decode($v, true) : $v;

        return is_array($v) ? $v : [];
    }
}
