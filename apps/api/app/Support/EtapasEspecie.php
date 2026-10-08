<?php

namespace App\Support;

use App\Models\Club;
use App\Models\ClubRevision;
use App\Models\EspecieEtapa;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * E52 · F2 — Validación y guardado de las etapas de revisión de una convocatoria (asistente y ficha de la convocatoria).
 * Con clubes ya enviados la ESTRUCTURA queda fija (no se agregan, quitan ni reordenan etapas: un club podría quedar en
 * una etapa inexistente); sí se pueden cambiar nombre, quién revisa, plazo y subsanaciones de cada una.
 *
 * E70 (08/10/2026, pedido del usuario): en cada etapa se eligen las personas que revisan (`revisores`, ids) y cuántas
 * aprobaciones hacen falta para pasar a la siguiente (`aprobaciones_requeridas`). Sin personas, la resuelve cualquiera con
 * el rol de `revisa` (como antes) y basta una aprobación.
 */
class EtapasEspecie
{
    public const MAX_ETAPAS = 6;

    public const MAX_REVISORES = 20;

    public static function reglas(string $prefijo = 'etapas'): array
    {
        return [
            $prefijo => 'required|array|min:1|max:'.self::MAX_ETAPAS,
            "{$prefijo}.*.id" => 'nullable|integer',
            "{$prefijo}.*.nombre" => 'required|string|max:120',
            "{$prefijo}.*.revisa" => 'required|in:'.implode(',', EspecieEtapa::REVISA),
            "{$prefijo}.*.plazo_horas" => 'required|integer|min:1|max:720',
            "{$prefijo}.*.max_subsanaciones" => 'required|integer|min:0|max:5',
            "{$prefijo}.*.revisores" => 'sometimes|array|max:'.self::MAX_REVISORES,
            "{$prefijo}.*.revisores.*" => 'integer|min:1|distinct',
            "{$prefijo}.*.aprobaciones_requeridas" => 'sometimes|integer|min:1|max:'.self::MAX_REVISORES,
        ];
    }

    public static function atributos(string $prefijo = 'etapas'): array
    {
        return [
            "{$prefijo}.*.nombre" => 'nombre de la etapa', "{$prefijo}.*.revisa" => 'quién revisa',
            "{$prefijo}.*.plazo_horas" => 'plazo en horas', "{$prefijo}.*.max_subsanaciones" => 'número de correcciones',
            "{$prefijo}.*.revisores" => 'personas que revisan', "{$prefijo}.*.aprobaciones_requeridas" => 'aprobaciones necesarias',
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
            'aprobaciones_requeridas' => max(1, (int) ($e['aprobaciones_requeridas'] ?? 1)),
            'revisores' => array_values(array_unique(array_map('intval', (array) ($e['revisores'] ?? [])))),
        ], $etapas));

        // E70: personas válidas para cada etapa (antes de tocar nada).
        foreach ($limpias as $i => $e) {
            self::validarRevisores($convocatoriaId, $e, $i);
        }
        $sinRevisores = fn (array $e) => array_diff_key($e, ['id' => 1, 'revisores' => 1]);

        $actuales = EspecieEtapa::where('convocatoria_id', $convocatoriaId)->orderBy('orden')->get();
        if (self::estructuraFija($convocatoriaId)) {
            $ids = array_map(fn ($e) => $e['id'], $limpias);
            if ($ids !== $actuales->pluck('id')->all()) {
                throw ValidationException::withMessages(['etapas' => 'Ya hay clubes en revisión: puedes cambiar el nombre, quién revisa, el plazo y las correcciones de cada etapa, pero no agregar, quitar ni reordenar etapas.']);
            }
            foreach ($limpias as $e) {
                $etapa = $actuales->firstWhere('id', $e['id']);
                $etapa->fill($sinRevisores($e))->save();
                self::asignar($convocatoriaId, $etapa, $e['revisores']);
            }

            return;
        }
        EspecieEtapa::where('convocatoria_id', $convocatoriaId)->delete();
        foreach ($limpias as $i => $e) {
            $etapa = new EspecieEtapa($sinRevisores($e) + ['orden' => $i + 1]);
            $etapa->convocatoria_id = $convocatoriaId;
            $etapa->save();
            self::asignar($convocatoriaId, $etapa, $e['revisores']);
        }
    }

    /**
     * E70: cada persona debe estar activa y tener (como rol activo) un rol que la etapa admite; un admin de convocatoria
     * asignado recibe la convocatoria en su alcance. Las aprobaciones no pueden ser más que las personas asignadas.
     */
    private static function validarRevisores(int $convocatoriaId, array $e, int $i): void
    {
        $campo = "etapas.{$i}.revisores";
        $n = count($e['revisores']);
        if ($n > 0 && $e['aprobaciones_requeridas'] > $n) {
            throw ValidationException::withMessages(["etapas.{$i}.aprobaciones_requeridas" => "«{$e['nombre']}»: pides {$e['aprobaciones_requeridas']} aprobaciones pero asignaste {$n} persona(s)."]);
        }
        if ($n === 0) {
            if ($e['aprobaciones_requeridas'] > 1) {
                throw ValidationException::withMessages(["etapas.{$i}.aprobaciones_requeridas" => "«{$e['nombre']}»: para pedir más de una aprobación asigna a las personas que revisan."]);
            }

            return;
        }
        $roles = match ($e['revisa']) {
            'revisor' => ['revisor'], 'admin_convocatoria' => ['admin_convocatoria'], default => ['revisor', 'admin_convocatoria'],
        };
        $usuarios = User::whereIn('id', $e['revisores'])->where('activo', true)->get();
        foreach ($e['revisores'] as $id) {
            $u = $usuarios->firstWhere('id', $id);
            if (! $u || ! $u->tieneRol(...$roles)) {
                throw ValidationException::withMessages([$campo => "«{$e['nombre']}»: una de las personas elegidas no está activa o no tiene el rol que revisa esta etapa."]);
            }
            if ($u->tieneRol('revisor') && ! Alcance::puedeVerConvocatoria($u, $convocatoriaId)) {
                throw ValidationException::withMessages([$campo => "«{$e['nombre']}»: {$u->name} no tiene en sus periodos el de esta convocatoria."]);
            }
        }
    }

    private static function asignar(int $convocatoriaId, EspecieEtapa $etapa, array $ids): void
    {
        $antes = $etapa->revisores()->pluck('users.id')->map(fn ($x) => (int) $x)->sort()->values()->all();
        $etapa->revisores()->sync($ids);
        foreach (User::whereIn('id', $ids)->get() as $u) {
            if ($u->tieneRol('admin_convocatoria')) {
                DB::table('convocatoria_user')->insertOrIgnore(['convocatoria_id' => $convocatoriaId, 'user_id' => $u->id]);
            }
        }
        $despues = collect($ids)->sort()->values()->all();
        if ($antes !== $despues) {
            Audit::log('especie.etapa_revisores', $etapa->convocatoria ?? \App\Models\Convocatoria::find($convocatoriaId), ['etapa_id' => $etapa->id, 'revisores' => $despues]);
        }
    }

    public static function payload(int $convocatoriaId): array
    {
        return EspecieEtapa::where('convocatoria_id', $convocatoriaId)->orderBy('orden')->with('revisores:id,name,rol_id')
            ->get(['id', 'orden', 'nombre', 'revisa', 'plazo_horas', 'max_subsanaciones', 'aprobaciones_requeridas'])
            ->map(fn (EspecieEtapa $e) => [
                'id' => $e->id, 'orden' => $e->orden, 'nombre' => $e->nombre, 'revisa' => $e->revisa, 'plazo_horas' => $e->plazo_horas,
                'max_subsanaciones' => $e->max_subsanaciones, 'aprobaciones_requeridas' => $e->aprobaciones_requeridas,
                'revisores' => $e->revisores->pluck('id')->map(fn ($x) => (int) $x)->values()->all(),
                'revisores_nombres' => $e->revisores->map(fn ($u) => ['id' => (int) $u->id, 'nombre' => $u->name])->values()->all(),
            ])->all();
    }

    /** E70: personas que el admin puede asignar a una etapa (lista blanca: id, nombre y rol). */
    public static function candidatos(): array
    {
        $roles = [config('comecyt.roles.revisor') => 'revisor', config('comecyt.roles.admin_convocatoria') => 'admin_convocatoria'];

        return User::where('activo', true)->whereIn('rol_id', array_keys($roles))->orderBy('name')->get(['id', 'name', 'rol_id'])
            ->map(fn ($u) => ['id' => (int) $u->id, 'nombre' => $u->name, 'rol' => $roles[(int) $u->rol_id]])->values()->all();
    }
}
