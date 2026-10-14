<?php

namespace App\Console\Commands;

use App\Models\AsignacionEvaluador;
use App\Models\Convocatoria;
use App\Notifications\EvaluacionAsignada;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * E72 paso 5 — Avisos de fecha límite de las evaluaciones: 2 días antes ('previo') y el día que vence ('hoy'), una
 * sola vez cada uno (aviso_previo_at / aviso_vence_at; ampliar la fecha los limpia). Fecha de negocio en hora del centro.
 */
class RecordatoriosEvaluacion extends Command
{
    protected $signature = 'evaluacion:recordatorios';

    protected $description = 'Avisa a quien evalúa cuando su fecha límite está por vencer o vence hoy';

    public function handle(): int
    {
        $hoy = Carbon::parse(Convocatoria::hoy());
        $enviados = 0;

        AsignacionEvaluador::with(['evaluador', 'solicitud.convocatoria'])
            ->whereIn('estado', ['asignado', 'evaluando'])
            ->whereBetween('fecha_limite', [$hoy->toDateString(), $hoy->copy()->addDays(2)->toDateString()])
            ->get()
            ->each(function (AsignacionEvaluador $a) use ($hoy, &$enviados) {
                $dias = (int) $hoy->diffInDays($a->fecha_limite->copy()->startOfDay());
                $motivo = $dias === 0 ? 'hoy' : ($dias === 2 ? 'previo' : null);
                $campo = $motivo === 'hoy' ? 'aviso_vence_at' : 'aviso_previo_at';
                if ($motivo === null || $a->{$campo} !== null || ! $a->evaluador?->activo) {
                    return;
                }
                $a->evaluador->notify(new EvaluacionAsignada($a, $motivo));
                $a->forceFill([$campo => now()])->save();
                $enviados++;
            });

        $this->info("Avisos enviados: {$enviados}");

        return self::SUCCESS;
    }
}
