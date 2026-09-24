<?php

namespace App\Support;

use App\Models\User;

/**
 * E45 — Datos bancarios completos solo para admin y admin de convocatoria (decisión del usuario). Para cualquier
 * otro rol se dejan los últimos 4 dígitos y se oculta el enlace a la carátula bancaria.
 */
class Enmascarar
{
    public static function veBancarios(User $user): bool
    {
        return $user->tieneRol('admin', 'admin_convocatoria');
    }

    public static function digitos(?string $valor): ?string
    {
        if ($valor === null || $valor === '') {
            return $valor;
        }
        $limpio = preg_replace('/\s+/', '', $valor);

        return str_repeat('•', max(0, mb_strlen($limpio) - 4)).mb_substr($limpio, -4);
    }

    /** Enmascara en sitio un arreglo de ministración (o una colección de ellas). */
    public static function ministracion(?array $m): ?array
    {
        if (! $m) {
            return $m;
        }
        foreach (['cuenta_clabe', 'numero_cuenta'] as $k) {
            if (array_key_exists($k, $m)) {
                $m[$k] = self::digitos($m[$k]);
            }
        }
        if (array_key_exists('caratula_banco_url', $m)) {
            $m['caratula_banco_url'] = $m['caratula_banco_url'] ? 'oculto' : null;
        }
        $m['datos_bancarios_enmascarados'] = true;

        return $m;
    }
}
