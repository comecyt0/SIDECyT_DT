<?php

namespace App\Support;

use App\Models\ProgramaCampo;
use App\Models\ProgramaCriterioEvaluacion;
use App\Models\ProgramaDocumento;
use App\Models\ProgramaRubro;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * E56 (02/10/2026) — Agregar y quitar preguntas, documentos, conceptos de gasto y criterios de una convocatoria ya creada
 * (decisión del usuario: «agregar sí; quitar con cuidado»):
 *  - si nadie lo ha usado, se ELIMINA;
 *  - si ya tiene respuestas, archivos, presupuestos o calificaciones, se OCULTA (activo = false): desaparece para las
 *    solicitudes nuevas y los datos capturados se conservan. Antes se borraba siempre, y rubros y criterios tienen
 *    `cascadeOnDelete`: quitar un concepto de gasto borraba los presupuestos de las solicitudes, y un criterio, las
 *    calificaciones de los dictámenes.
 */
class EstructuraPrograma
{
    /** ids (del tipo de elemento) que ya tienen datos capturados. */
    public static function idsEnUso(string $tipo, int $tipoProgramaId, array $ids): array
    {
        if (! $ids) return [];

        return match ($tipo) {
            'campos' => DB::table('solicitud_campos_dinamicos')->whereIn('programa_campo_id', $ids)->distinct()->pluck('programa_campo_id')->all(),
            'rubros' => DB::table('solicitud_rubros_presupuesto')->whereIn('rubro_id', $ids)->distinct()->pluck('rubro_id')->all(),
            'criterios' => DB::table('solicitud_criterios_evaluacion')->whereIn('criterio_id', $ids)->distinct()->pluck('criterio_id')->all(),
            'documentos' => self::documentosEnUso($tipoProgramaId, $ids),
            default => [],
        };
    }

    /** Documentos subidos por solicitudes o clubes de las convocatorias de esta configuración (por su clave). */
    private static function documentosEnUso(int $tipoProgramaId, array $ids): array
    {
        $porClave = ProgramaDocumento::whereIn('id', $ids)->pluck('id', 'clave');
        if ($porClave->isEmpty()) return [];
        $convs = DB::table('convocatorias')->where('tipo_programa_id', $tipoProgramaId)->pluck('id');
        $usadas = DB::table('solicitud_documentos')->whereNull('deleted_at')->whereIn('tipo', $porClave->keys())
            ->whereIn('solicitud_id', DB::table('solicitudes')->whereIn('convocatoria_id', $convs)->select('id'))
            ->distinct()->pluck('tipo')
            ->merge(DB::table('club_documentos')->whereIn('clave', $porClave->keys())
                ->whereIn('club_id', DB::table('clubes')->whereIn('convocatoria_id', $convs)->select('id'))
                ->distinct()->pluck('clave'));

        return $usadas->unique()->map(fn ($c) => $porClave[$c] ?? null)->filter()->values()->all();
    }

    /** Agrega `en_uso` a cada elemento del listado del panel. */
    public static function marcarEnUso(string $tipo, int $tipoProgramaId, Collection $items): Collection
    {
        $uso = array_flip(self::idsEnUso($tipo, $tipoProgramaId, $items->pluck('id')->all()));

        return $items->each(fn (Model $m) => $m->setAttribute('en_uso', isset($uso[$m->id])));
    }

    /**
     * Quita un elemento con cuidado: lo elimina si no tiene datos o lo oculta si ya los tiene.
     * Devuelve 'eliminado' | 'oculto'. Queda en la bitácora.
     */
    public static function quitar(string $tipo, ProgramaCampo|ProgramaDocumento|ProgramaRubro|ProgramaCriterioEvaluacion $item): string
    {
        $enUso = in_array($item->id, self::idsEnUso($tipo, (int) $item->tipo_programa_id, [$item->id]), true);
        $nombre = $item->etiqueta ?? $item->nombre ?? $item->clave ?? '';
        if ($enUso) {
            $item->forceFill(['activo' => false])->save();
            Audit::log('programa.elemento_ocultado', $item, ['tipo' => $tipo, 'nombre' => $nombre, 'motivo' => 'tiene datos capturados']);

            return 'oculto';
        }
        Audit::log('programa.elemento_eliminado', $item, ['tipo' => $tipo, 'nombre' => $nombre, 'tipo_programa_id' => $item->tipo_programa_id]);
        $item->delete();

        return 'eliminado';
    }

    public static function mensaje(string $resultado, string $que): string
    {
        return $resultado === 'oculto'
            ? "Ya tiene datos capturados: se ocultó para las solicitudes nuevas y se conservan los datos. Puedes volver a mostrar {$que}."
            : ucfirst($que).' eliminado.';
    }
}
