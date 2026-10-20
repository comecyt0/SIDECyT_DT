<?php

namespace App\Support;

use App\Models\Club;
use App\Models\ClubFirmado;
use App\Models\ClubLogistica;
use App\Models\EspecieConfig;
use Illuminate\Support\Carbon;

/**
 * E71 (08/10/2026, pedido del usuario) — Apoyos de logística que da una convocatoria de Apoyo en especie: transporte,
 * box lunch, los dos o ninguno. Decisiones: lo que no da **desaparece** (líder, formatos, escaneo, reporte); se puede
 * cambiar **siempre** — al quitar un apoyo, las solicitudes que ya lo pedían lo pierden (si ya no queda nada, se cancelan),
 * su formato firmado deja de valer y se avisa por correo a los líderes; las convocatorias existentes quedan con los dos.
 * El admin define en la convocatoria el punto y la hora de salida y de regreso del transporte y la fecha límite para pedir
 * (`fecha_limite_logistica`, la misma del panel de logística).
 */
class ApoyosLogistica
{
    public static function reglas(string $p = ''): array
    {
        $k = fn (string $c) => $p === '' ? $c : "{$p}.{$c}";

        return [
            $k('incluye_transporte') => 'sometimes|boolean',
            $k('incluye_lunch') => 'sometimes|boolean',
            $k('transporte_salida_lugar') => 'nullable|string|max:300',
            $k('transporte_salida_hora') => 'nullable|date',
            $k('transporte_regreso_lugar') => 'nullable|string|max:300',
            // E87: la salida ya la define cada líder; el regreso no se compara con una salida de la convocatoria.
            $k('transporte_regreso_hora') => 'nullable|date',
            $k('transporte_regreso_maps') => ['nullable', 'string', 'max:500', fn ($a, $v, $fail) => $v && ! self::esMapa($v) ? $fail('El enlace debe ser de Google Maps (https://maps.app.goo.gl/… o https://www.google.com/maps/…).') : null],
            $k('fecha_limite_logistica') => 'nullable|date_format:Y-m-d',
        ];
    }

    /**
     * E87: enlace de Google Maps válido (https y dominio de Google Maps). Evita guardar enlaces a cualquier sitio
     * (phishing): solo se aceptan maps.app.goo.gl, goo.gl/maps, maps.google.com y google.com/maps.
     */
    public static function esMapa(?string $url): bool
    {
        if (! is_string($url) || strlen($url) > 500 || ! filter_var($url, FILTER_VALIDATE_URL)) return false;
        $p = parse_url($url);
        if (($p['scheme'] ?? '') !== 'https' || isset($p['user']) || isset($p['pass'])) return false;
        $h = strtolower($p['host'] ?? '');
        $ruta = $p['path'] ?? '';

        return in_array($h, ['maps.app.goo.gl', 'maps.google.com', 'maps.google.com.mx'], true)
            || ($h === 'goo.gl' && str_starts_with($ruta, '/maps'))
            || (in_array($h, ['google.com', 'www.google.com', 'google.com.mx', 'www.google.com.mx'], true) && str_starts_with($ruta, '/maps'));
    }

    public static function atributos(string $p = ''): array
    {
        $k = fn (string $c) => $p === '' ? $c : "{$p}.{$c}";

        return [
            $k('transporte_salida_lugar') => 'punto de salida', $k('transporte_salida_hora') => 'hora de salida',
            $k('transporte_regreso_lugar') => 'punto de regreso', $k('transporte_regreso_hora') => 'hora de regreso',
            $k('fecha_limite_logistica') => 'fecha límite para pedir',
        ];
    }

    /**
     * Escribe los apoyos en la configuración (sin guardar). Devuelve qué se quitó respecto de lo anterior, para que quien
     * llama ajuste las solicitudes después de guardar (`alQuitar`). Campos ausentes = no cambian.
     */
    public static function aplicar(EspecieConfig $cfg, array $v): array
    {
        $antesT = $cfg->exists ? (bool) ($cfg->incluye_transporte ?? true) : true;
        $antesL = $cfg->exists ? (bool) ($cfg->incluye_lunch ?? true) : true;
        $t = array_key_exists('incluye_transporte', $v) ? (bool) $v['incluye_transporte'] : $antesT;
        $l = array_key_exists('incluye_lunch', $v) ? (bool) $v['incluye_lunch'] : $antesL;
        $texto = fn ($x) => $x !== null && trim((string) $x) !== '' ? mb_substr(trim(strip_tags((string) $x)), 0, 300) : null;
        $hora = fn ($x) => $x ? Carbon::parse($x, RevisionClub::ZONA)->utc() : null;
        $datos = ['incluye_transporte' => $t, 'incluye_lunch' => $l];
        foreach (['transporte_salida_lugar', 'transporte_regreso_lugar'] as $c) if (array_key_exists($c, $v)) $datos[$c] = $t ? $texto($v[$c]) : null;
        if (array_key_exists('transporte_regreso_maps', $v)) $datos['transporte_regreso_maps'] = $t && self::esMapa($v['transporte_regreso_maps'] ?? null) ? $v['transporte_regreso_maps'] : null; // E87
        foreach (['transporte_salida_hora', 'transporte_regreso_hora'] as $c) if (array_key_exists($c, $v)) $datos[$c] = $t ? $hora($v[$c]) : null;
        if (! $t) { $datos += ['transporte_salida_lugar' => null, 'transporte_salida_hora' => null, 'transporte_regreso_lugar' => null, 'transporte_regreso_hora' => null]; }
        if (array_key_exists('fecha_limite_logistica', $v)) $datos['fecha_limite_logistica'] = $v['fecha_limite_logistica'] ?: null;
        $cfg->forceFill($datos);

        return ['transporte' => $antesT && ! $t, 'lunch' => $antesL && ! $l];
    }

    /** Quita el apoyo de las solicitudes vigentes de la convocatoria y avisa a los líderes. Devuelve cuántas cambió. */
    public static function alQuitar(int $convocatoriaId, array $quitado): int
    {
        if (! $quitado['transporte'] && ! $quitado['lunch']) return 0;
        $n = 0;
        $logs = ClubLogistica::whereIn('estado', ClubLogistica::APARTAN)
            ->whereHas('club', fn ($q) => $q->where('convocatoria_id', $convocatoriaId))
            ->where(fn ($q) => $q->when($quitado['transporte'], fn ($w) => $w->orWhere('transporte', '>', 0))->when($quitado['lunch'], fn ($w) => $w->orWhere('lunch', '>', 0)))
            ->with('club')->get();
        $porClub = [];
        foreach ($logs as $log) {
            $cambios = [];
            if ($quitado['transporte']) $cambios['transporte'] = 0;
            if ($quitado['lunch']) $cambios['lunch'] = 0;
            $queda = ($cambios['transporte'] ?? $log->transporte) + ($cambios['lunch'] ?? $log->lunch);
            $log->forceFill($cambios + ($queda === 0 ? ['estado' => 'cancelada'] : ['estado' => 'enviada']))->save();
            // Lo firmado ya no corresponde a lo pedido.
            ClubFirmado::where('logistica_id', $log->id)->whereIn('estado', ['pendiente', 'aprobado'])->update(['estado' => 'reemplazado', 'updated_at' => now()]);
            $porClub[$log->club_id] = $log->club;
            $n++;
        }
        $que = $quitado['transporte'] && $quitado['lunch'] ? 'el transporte y el box lunch' : ($quitado['transporte'] ? 'el transporte' : 'el box lunch');
        foreach ($porClub as $club) {
            if ($club instanceof Club) RevisionClub::avisarLider($club, 'logistica_ajustada', ['que' => $que]);
        }
        if ($n > 0) Audit::log('especie.apoyos_quitados', \App\Models\Convocatoria::find($convocatoriaId), ['quitado' => $quitado, 'solicitudes' => $n]);

        return $n;
    }

    /** Lo que ven el líder y el personal (lista blanca). */
    public static function payload(EspecieConfig $cfg): array
    {
        $fmt = fn ($f) => $f ? Carbon::parse($f)->setTimezone(RevisionClub::ZONA)->format('Y-m-d\TH:i') : null;
        $t = (bool) ($cfg->incluye_transporte ?? true);

        return [
            'incluye_transporte' => $t,
            'incluye_lunch' => (bool) ($cfg->incluye_lunch ?? true),
            'transporte_salida_lugar' => $t ? $cfg->transporte_salida_lugar : null,
            'transporte_salida_hora' => $t ? $fmt($cfg->transporte_salida_hora) : null,
            'transporte_regreso_lugar' => $t ? $cfg->transporte_regreso_lugar : null,
            'transporte_regreso_hora' => $t ? $fmt($cfg->transporte_regreso_hora) : null,
            'transporte_regreso_maps' => $t ? $cfg->transporte_regreso_maps : null, // E87
            'fecha_limite_logistica' => $cfg->fecha_limite_logistica?->format('Y-m-d'),
        ];
    }
}
