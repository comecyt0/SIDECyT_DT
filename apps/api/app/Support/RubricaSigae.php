<?php

namespace App\Support;

use App\Models\Dictamen;
use App\Models\ProgramaCriterioEvaluacion;
use App\Models\Solicitud;
use App\Models\SolicitudCriterioEvaluacion;

/**
 * E72 paso 5 — Rúbrica de una convocatoria de SIGAE (criterios activos del TipoPrograma; sin criterios, los 4 legacy
 * de 25 puntos) y mínimo aprobatorio como PORCENTAJE del máximo real (tipo_programas.puntaje_minimo_aprobatorio;
 * 80 % si no está definido). Mismas reglas que App\Support\Rubrica de SICEI.
 */
class RubricaSigae
{
    public const LEGACY = [
        ['clave' => 'criterio_1_puntaje', 'nombre' => 'Viabilidad técnica y metodológica', 'max' => 25.0],
        ['clave' => 'criterio_2_puntaje', 'nombre' => 'Impacto y pertinencia', 'max' => 25.0],
        ['clave' => 'criterio_3_puntaje', 'nombre' => 'Capacidad del equipo e institución', 'max' => 25.0],
        ['clave' => 'criterio_4_puntaje', 'nombre' => 'Presupuesto y uso de recursos', 'max' => 25.0],
    ];

    /** @return list<array{id: ?int, clave: string, nombre: string, descripcion: ?string, max: float}> */
    public static function criterios(Solicitud $s): array
    {
        $tipo = $s->convocatoria?->tipo_programa_id;
        $dinamicos = $tipo ? ProgramaCriterioEvaluacion::where('tipo_programa_id', $tipo)->where('activo', true)
            ->orderBy('orden')->orderBy('id')->get(['id', 'nombre', 'descripcion', 'puntaje_maximo']) : collect();

        if ($dinamicos->isNotEmpty()) {
            return $dinamicos->map(fn ($c) => [
                'id' => $c->id, 'clave' => 'c'.$c->id, 'nombre' => $c->nombre, 'descripcion' => $c->descripcion,
                'max' => (float) ($c->puntaje_maximo ?? 100),
            ])->values()->all();
        }

        return array_map(fn ($c) => $c + ['id' => null, 'descripcion' => null], self::LEGACY);
    }

    public static function esDinamica(Solicitud $s): bool
    {
        return (self::criterios($s)[0]['id'] ?? null) !== null;
    }

    public static function maximo(Solicitud $s): float
    {
        return (float) array_sum(array_column(self::criterios($s), 'max'));
    }

    public static function minimoPorcentaje(Solicitud $s): float
    {
        $v = $s->convocatoria?->tipoPrograma?->puntaje_minimo_aprobatorio;

        return is_numeric($v) && $v >= 0 && $v <= 100 ? (float) $v : 80.0;
    }

    public static function alcanza(Solicitud $s, float $puntaje): bool
    {
        $max = self::maximo($s);

        return $max > 0 && ($puntaje * 100 / $max) >= self::minimoPorcentaje($s);
    }

    /** {clave: puntaje} de un dictamen con las mismas claves que criterios() ('c<id>' o las columnas legacy). */
    public static function puntajesDe(Dictamen $d): array
    {
        $dinamicos = SolicitudCriterioEvaluacion::where('dictamen_id', $d->id)->pluck('puntaje_obtenido', 'criterio_id');
        if ($dinamicos->isNotEmpty()) {
            return $dinamicos->mapWithKeys(fn ($p, $id) => ['c'.$id => (float) $p])->all();
        }

        return collect(self::LEGACY)->mapWithKeys(fn ($c) => [$c['clave'] => (float) $d->{$c['clave']}])->all();
    }

    /**
     * Renglones del PDF del dictamen: lo que calificó ESTE dictamen, con nombre y máximo de cada criterio aunque
     * después se haya ocultado de la convocatoria (EstructuraPrograma lo oculta, no lo borra, si ya tiene calificaciones).
     *
     * @return array{renglones: list<array{nombre: string, max: float, puntaje: float}>, maximo: float}
     */
    public static function detalleDictamen(Dictamen $d): array
    {
        $dinamicos = SolicitudCriterioEvaluacion::where('dictamen_id', $d->id)->get(['criterio_id', 'puntaje_obtenido']);
        if ($dinamicos->isNotEmpty()) {
            $info = ProgramaCriterioEvaluacion::whereIn('id', $dinamicos->pluck('criterio_id'))
                ->get(['id', 'nombre', 'puntaje_maximo', 'orden'])->keyBy('id');
            $renglones = $dinamicos
                ->sortBy(fn ($x) => [(int) ($info[$x->criterio_id]->orden ?? 0), (int) $x->criterio_id])
                ->map(fn ($x) => [
                    'nombre' => (string) ($info[$x->criterio_id]->nombre ?? 'Criterio'),
                    'max' => (float) ($info[$x->criterio_id]->puntaje_maximo ?? 100),
                    'puntaje' => (float) $x->puntaje_obtenido,
                ])->values()->all();
        } else {
            $renglones = array_map(fn ($c) => ['nombre' => $c['nombre'], 'max' => $c['max'], 'puntaje' => (float) $d->{$c['clave']}], self::LEGACY);
        }

        return ['renglones' => $renglones, 'maximo' => (float) array_sum(array_column($renglones, 'max'))];
    }

    /** Para el admin: dictámenes, promedio y si alcanza el mínimo. Requiere asignaciones.dictamen cargado. */
    public static function resumen(Solicitud $s): array
    {
        $asignaciones = $s->asignaciones;
        $dictamenes = $asignaciones->pluck('dictamen')->filter();
        $promedio = $dictamenes->count() ? round((float) $dictamenes->avg('puntaje_total'), 2) : null;
        $maximo = self::maximo($s);
        $pendientes = $asignaciones->filter(fn ($a) => $a->estado !== 'concluido' && ! $a->vencida())->count();

        return [
            'asignados' => $asignaciones->count(),
            'concluidos' => $dictamenes->count(),
            'pendientes' => $pendientes,
            'completa' => $asignaciones->count() > 0 && $pendientes === 0 && $dictamenes->count() > 0,
            'promedio' => $promedio,
            'maximo' => $maximo,
            'porcentaje' => $promedio !== null && $maximo > 0 ? round($promedio * 100 / $maximo, 1) : null,
            'minimo_aprobatorio' => self::minimoPorcentaje($s),
            'alcanza_minimo' => $promedio !== null ? self::alcanza($s, $promedio) : null,
        ];
    }
}
