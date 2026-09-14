<?php

namespace App\Http\Controllers\Catalogos;

use App\Models\ProgramaEtapa;
use App\Models\TipoPrograma;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Cache;

class ProgramaCatalogController extends Controller
{
    private const CACHE_TTL = 300;

    public function show(int $tipoProgramaId): JsonResponse
    {
        $cacheKey = "programa_config_{$tipoProgramaId}";

        $data = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($tipoProgramaId) {
            $programa = TipoPrograma::with([
                'modalidades' => fn ($q) => $q->where('activo', true)->orderBy('nombre'),
                'etapas' => fn ($q) => $q->where('activo', true)->orderBy('numero_etapa'),
                'campos' => fn ($q) => $q->where('activo', true)->orderBy('orden'),
                'documentos' => fn ($q) => $q->where('activo', true)->orderBy('orden'),
                'rubros' => fn ($q) => $q->where('activo', true)->orderBy('nombre'),
                'criterios' => fn ($q) => $q->where('activo', true)->orderBy('orden'),
            ])->find($tipoProgramaId);

            return $programa ? $programa->toArray() : null;
        });

        if (! $data) {
            return response()->json(['message' => 'Programa no encontrado'], 404);
        }

        return response()->json(['message' => 'OK', 'data' => $data]);
    }

    public function campos(int $tipoProgramaId): JsonResponse
    {
        $cacheKey = "programa_campos_{$tipoProgramaId}";

        $data = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($tipoProgramaId) {
            $programa = TipoPrograma::find($tipoProgramaId);
            if (! $programa) {
                return null;
            }

            return $programa->campos()->where('activo', true)->orderBy('orden')->get()->toArray();
        });

        if ($data === null) {
            return response()->json(['message' => 'Programa no encontrado'], 404);
        }

        return response()->json(['message' => 'OK', 'data' => $data, 'count' => is_array($data) ? count($data) : 0]);
    }

    public function documentos(int $tipoProgramaId): JsonResponse
    {
        $cacheKey = "programa_documentos_{$tipoProgramaId}";

        $data = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($tipoProgramaId) {
            $programa = TipoPrograma::find($tipoProgramaId);
            if (! $programa) {
                return null;
            }

            return $programa->documentos()->where('activo', true)->orderBy('orden')->get()->toArray();
        });

        if ($data === null) {
            return response()->json(['message' => 'Programa no encontrado'], 404);
        }

        return response()->json(['message' => 'OK', 'data' => $data, 'count' => is_array($data) ? count($data) : 0]);
    }

    public function criterios(int $tipoProgramaId): JsonResponse
    {
        $cacheKey = "programa_criterios_{$tipoProgramaId}";

        $data = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($tipoProgramaId) {
            $programa = TipoPrograma::find($tipoProgramaId);
            if (! $programa) {
                return null;
            }

            $criterios = $programa->criterios()->where('activo', true)->orderBy('orden')->get();

            if ($programa->tiene_etapas) {
                return $criterios->groupBy('etapa_id')->map(function ($grupo, $etapaId) {
                    $etapa = ProgramaEtapa::find($etapaId);

                    return [
                        'etapa' => $etapa ? $etapa->toArray() : null,
                        'criterios' => $grupo->values()->toArray(),
                    ];
                })->values()->toArray();
            }

            return $criterios->toArray();
        });

        if ($data === null) {
            return response()->json(['message' => 'Programa no encontrado'], 404);
        }

        return response()->json(['message' => 'OK', 'data' => $data]);
    }

    public function rubros(int $tipoProgramaId): JsonResponse
    {
        $cacheKey = "programa_rubros_{$tipoProgramaId}";

        $data = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($tipoProgramaId) {
            $programa = TipoPrograma::find($tipoProgramaId);
            if (! $programa) {
                return null;
            }

            return $programa->rubros()->where('activo', true)->orderBy('nombre')->get()->toArray();
        });

        if ($data === null) {
            return response()->json(['message' => 'Programa no encontrado'], 404);
        }

        return response()->json(['message' => 'OK', 'data' => $data, 'count' => is_array($data) ? count($data) : 0]);
    }

    public function etapas(int $tipoProgramaId): JsonResponse
    {
        $cacheKey = "programa_etapas_{$tipoProgramaId}";

        $data = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($tipoProgramaId) {
            $programa = TipoPrograma::find($tipoProgramaId);
            if (! $programa) {
                return null;
            }

            return $programa->etapas()->where('activo', true)->orderBy('numero_etapa')->get()->toArray();
        });

        if ($data === null) {
            return response()->json(['message' => 'Programa no encontrado'], 404);
        }

        return response()->json(['message' => 'OK', 'data' => $data, 'count' => is_array($data) ? count($data) : 0]);
    }

    public function modalidades(int $tipoProgramaId): JsonResponse
    {
        $cacheKey = "programa_modalidades_{$tipoProgramaId}";

        $data = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($tipoProgramaId) {
            $programa = TipoPrograma::find($tipoProgramaId);
            if (! $programa) {
                return null;
            }

            return $programa->modalidades()->where('activo', true)->orderBy('nombre')->get()->toArray();
        });

        if ($data === null) {
            return response()->json(['message' => 'Programa no encontrado'], 404);
        }

        return response()->json(['message' => 'OK', 'data' => $data, 'count' => is_array($data) ? count($data) : 0]);
    }

    public function clearCache(int $tipoProgramaId): JsonResponse
    {
        $keys = [
            "programa_config_{$tipoProgramaId}",
            "programa_campos_{$tipoProgramaId}",
            "programa_documentos_{$tipoProgramaId}",
            "programa_criterios_{$tipoProgramaId}",
            "programa_rubros_{$tipoProgramaId}",
            "programa_etapas_{$tipoProgramaId}",
            "programa_modalidades_{$tipoProgramaId}",
        ];

        foreach ($keys as $key) {
            Cache::forget($key);
        }

        return response()->json(['message' => 'Cache cleared', 'programa_id' => $tipoProgramaId]);
    }
}
