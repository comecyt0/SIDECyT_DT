<?php

namespace App\Support;

use App\Models\Club;
use App\Models\ClubRevision;
use App\Models\EspecieEtapa;
use Illuminate\Validation\ValidationException;

/**
 * E52 · F2 — Validación y guardado de las etapas de revisión de una convocatoria (asistente y ficha de la convocatoria).
 * Con clubes ya enviados la ESTRUCTURA queda fija (no se agregan, quitan ni reordenan etapas: un club podría quedar en
 * una etapa inexistente); sí se pueden cambiar nombre, quién revisa, plazo y subsanaciones de cada una.
 */
class EtapasEspecie
{
    public const MAX_ETAPAS = 6;

    public static function reglas(string $prefijo = 'etapas'): array
    {
        return [
            $prefijo => 'required|array|min:1|max:'.self::MAX_ETAPAS,
            "{$prefijo}.*.id" => 'nullable|integer',
            "{$prefijo}.*.nombre" => 'required|string|max:120',
            "{$prefijo}.*.revisa" => 'required|in:'.implode(',', EspecieEtapa::REVISA),
            "{$prefijo}.*.plazo_horas" => 'required|integer|min:1|max:720',
            "{$prefijo}.*.max_subsanaciones" => 'required|integer|min:0|max:5',
        ];
    }

    public static function atributos(string $prefijo = 'etapas'): array
    {
        return [
            "{$prefijo}.*.nombre" => 'nombre de la etapa', "{$prefijo}.*.revisa" => 'quién revisa',
            "{$prefijo}.*.plazo_horas" => 'plazo en horas', "{$prefijo}.*.max_subsanaciones" => 'número de correcciones',
        ];
    }

    /** ¿Ya hay clubes en el flujo de revisión de la convocatoria? */
    public static function estructuraFija(int $convocatoriaId): bool
    {
        return Club::where('convocatoria_id', $convocatoriaId)->where('estado', '!=', 'borrador')->exists()
            || ClubRevision::whereHas('club', fn ($q) => $q->where('convocatoria_id', $convocatoriaId))->exists();
    }

    /** Guarda las etapas (dentro de la transacción de quien llama). */
    public static function guardar(int $convocatoriaId, array $etapas): void
    {
        $limpias = array_values(array_map(fn ($e) => [
            'id' => isset($e['id']) ? (int) $e['id'] : null,
            'nombre' => trim(strip_tags((string) $e['nombre'])) ?: 'Revisión',
            'revisa' => (string) $e['revisa'],
            'plazo_horas' => (int) $e['plazo_horas'],
            'max_subsanaciones' => (int) $e['max_subsanaciones'],
        ], $etapas));

        $actuales = EspecieEtapa::where('convocatoria_id', $convocatoriaId)->orderBy('orden')->get();
        if (self::estructuraFija($convocatoriaId)) {
            $ids = array_map(fn ($e) => $e['id'], $limpias);
            if ($ids !== $actuales->pluck('id')->all()) {
                throw ValidationException::withMessages(['etapas' => 'Ya hay clubes en revisión: puedes cambiar el nombre, quién revisa, el plazo y las correcciones de cada etapa, pero no agregar, quitar ni reordenar etapas.']);
            }
            foreach ($limpias as $e) {
                $actuales->firstWhere('id', $e['id'])->fill(array_diff_key($e, ['id' => 1]))->save();
            }

            return;
        }
        EspecieEtapa::where('convocatoria_id', $convocatoriaId)->delete();
        foreach ($limpias as $i => $e) {
            $etapa = new EspecieEtapa(array_diff_key($e, ['id' => 1]) + ['orden' => $i + 1]);
            $etapa->convocatoria_id = $convocatoriaId;
            $etapa->save();
        }
    }

    public static function payload(int $convocatoriaId): array
    {
        return EspecieEtapa::where('convocatoria_id', $convocatoriaId)->orderBy('orden')
            ->get(['id', 'orden', 'nombre', 'revisa', 'plazo_horas', 'max_subsanaciones'])->toArray();
    }
}
