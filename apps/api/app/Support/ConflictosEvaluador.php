<?php

namespace App\Support;

use App\Models\Solicitud;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * E72 paso 5 — Conflictos de interés al asignar una evaluación (mismas reglas que SICEI; docs/SICEI_BD_COMPARTIDA.md
 * §6.4). Bloqueantes: propia y bloqueado. Avisos (el admin decide): misma_empresa, misma_institucion,
 * participa_convocatoria (solicitud, club o acceso a club en la misma convocatoria) y evaluo_antes (dictaminó antes
 * al mismo solicitante o a su empresa, en SIGAE o en SICEI).
 */
class ConflictosEvaluador
{
    public const BLOQUEANTES = ['propia', 'bloqueado'];

    /** @return list<array{tipo: string, bloqueante: bool, detalle: string}> */
    public static function detectar(User $evaluador, Solicitud $s): array
    {
        $c = [];

        if ((int) $s->user_id === (int) $evaluador->id) {
            $c[] = self::item('propia', 'Es su propia solicitud.');
        }

        $bloqueo = DB::table('bloqueos_conflicto')
            ->where('evaluador_id', $evaluador->id)->where('convocatoria_id', $s->convocatoria_id)
            ->where(fn ($q) => $q->whereNull('solicitud_id')->orWhere('solicitud_id', $s->id))
            ->orderByRaw('solicitud_id is not null')->first();
        if ($bloqueo) {
            $c[] = self::item('bloqueado', ($bloqueo->solicitud_id ? 'Bloqueada para esta solicitud: ' : 'Bloqueada para toda la convocatoria: ').$bloqueo->motivo);
        }

        $empresaSolicitud = $s->empresa_id ?? $s->user?->empresa_id;
        if ($evaluador->empresa_id !== null && $empresaSolicitud !== null && (int) $evaluador->empresa_id === (int) $empresaSolicitud) {
            $c[] = self::item('misma_empresa', 'Pertenece a la misma empresa que el solicitante.');
        }

        $inst = self::normalizar(self::institucionDe($evaluador));
        if ($inst !== '' && $empresaSolicitud) {
            $empresa = DB::table('empresas')->where('id', $empresaSolicitud)->first(['nombre', 'acronimo']);
            $candidatos = array_filter([self::normalizar($empresa->nombre ?? ''), self::normalizar($empresa->acronimo ?? ''), self::normalizar(self::institucionDe($s->user))]);
            if (in_array($inst, $candidatos, true)) {
                $c[] = self::item('misma_institucion', 'Su institución coincide con la del solicitante.');
            }
        }

        $participa = DB::table('v_participaciones_sigae')
            ->where('user_id', $evaluador->id)->where('convocatoria_id', $s->convocatoria_id)
            ->where(fn ($q) => $q->where('tipo', '<>', 'solicitud')->orWhere('registro_id', '<>', $s->id))
            ->exists();
        if ($participa) {
            $c[] = self::item('participa_convocatoria', 'También participa en esta convocatoria (solicitud o club).');
        }

        if (self::evaluoAntes($evaluador, $s, $empresaSolicitud)) {
            $c[] = self::item('evaluo_antes', 'Ya evaluó antes otra solicitud de este solicitante o de su empresa.');
        }

        return $c;
    }

    public static function hayBloqueante(array $conflictos): bool
    {
        return collect($conflictos)->contains(fn ($c) => $c['bloqueante']);
    }

    private static function evaluoAntes(User $ev, Solicitud $s, ?int $empresa): bool
    {
        $filtro = fn ($q) => $q->where('solicitante_id', $s->user_id)->when($empresa, fn ($q) => $q->orWhere('empresa_id', $empresa));

        $enSigae = DB::table('v_dictamenes_sigae')->where('evaluador_id', $ev->id)
            ->where(fn ($q) => $q->where('convocatoria_id', '<>', $s->convocatoria_id)->orWhere('solicitante_id', '<>', $s->user_id))
            ->where($filtro)->exists();
        if ($enSigae) {
            return true;
        }
        // Cruce con SICEI: solo su vista de lectura (SIGAE no puede leer las tablas de SICEI)
        if (DB::selectOne("select to_regclass('sicei.v_dictamenes_sicei') as t")->t === null) {
            return false;
        }

        return DB::table('sicei.v_dictamenes_sicei')->where('evaluador_id', $ev->id)->where($filtro)->exists();
    }

    private static function institucionDe(?User $u): string
    {
        $d = $u?->datos_registro;

        return is_array($d) && is_string($d['institucion'] ?? null) ? $d['institucion'] : '';
    }

    private static function normalizar(?string $t): string
    {
        $t = Str::lower(Str::ascii(trim((string) $t)));
        $t = trim(preg_replace('/\s+/', ' ', preg_replace('/[^a-z0-9 ]+/', ' ', $t) ?? '') ?? '');

        return mb_strlen($t) >= 4 ? $t : '';
    }

    private static function item(string $tipo, string $detalle): array
    {
        return ['tipo' => $tipo, 'bloqueante' => in_array($tipo, self::BLOQUEANTES, true), 'detalle' => $detalle];
    }
}
