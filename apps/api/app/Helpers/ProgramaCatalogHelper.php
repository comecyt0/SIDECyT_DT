<?php

namespace App\Helpers;

use Illuminate\Support\Facades\Cache;

class ProgramaCatalogHelper
{
    private const CACHE_PREFIX = 'programa_catalog_';

    /**
     * Invalidate all cached catalogs for a specific program
     *
     * Call this whenever programa data is updated (in admin update endpoints).
     */
    public static function invalidateForProgram(int $tipoProgramaId): void
    {
        Cache::forget(self::CACHE_PREFIX.'campos_'.$tipoProgramaId);
        Cache::forget(self::CACHE_PREFIX.'documentos_'.$tipoProgramaId);
        Cache::forget(self::CACHE_PREFIX.'criterios_'.$tipoProgramaId);
        Cache::forget(self::CACHE_PREFIX.'rubros_'.$tipoProgramaId);
        Cache::forget(self::CACHE_PREFIX.'etapas_'.$tipoProgramaId);
        Cache::forget(self::CACHE_PREFIX.'modalidades_'.$tipoProgramaId);
        Cache::forget(self::CACHE_PREFIX.'completo_'.$tipoProgramaId);
    }

    /**
     * Invalidate all program catalogs (use when program list changes)
     */
    public static function invalidateAll(): void
    {
        Cache::flush();
    }
}
