<?php

namespace App\Support;

use App\Models\Club;
use App\Models\ClubRevision;
use App\Models\EspecieEtapa;
use App\Models\User;
use App\Notifications\ClubAviso;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * E52 · F2 — Reglas de la revisión de clubes (docs/APOYO_EN_ESPECIE.md §6.3, §6.4, §12). Un solo lugar para:
 *  - quién puede resolver una etapa (rol + configuración de la etapa + alcance),
 *  - las transiciones (enviar, aprobar, observar, rechazar, prórroga, corrección del líder, visto bueno, comité),
 *  - el historial (`club_revisiones`) y los avisos.
 * Cada transición bloquea la fila del club (`lockForUpdate`) y revisa el estado dentro de la transacción: si dos
 * personas resuelven a la vez ("ambos"), la segunda recibe 422 en lugar de pisar la primera.
 */
class RevisionClub
{
    public const ZONA = 'America/Mexico_City';

    /** Etapas por defecto de una convocatoria nueva (decisión del usuario: 2 revisiones, 1 subsanación, 24 h). */
    public const ETAPAS_DEFECTO = [
        ['nombre' => 'Primera revisión', 'revisa' => 'ambos', 'plazo_horas' => 24, 'max_subsanaciones' => 1],
        ['nombre' => 'Segunda revisión', 'revisa' => 'ambos', 'plazo_horas' => 24, 'max_subsanaciones' => 1],
    ];

    public static function rolDe(User $u): ?string
    {
        foreach (['admin', 'admin_convocatoria', 'revisor'] as $slug) {
            if ($u->tieneRol($slug)) return $slug;
        }

        return null;
    }

    public static function etapas(int $convocatoriaId): Collection
    {
        return EspecieEtapa::where('convocatoria_id', $convocatoriaId)->orderBy('orden')->get();
    }

    /** ¿Ve esta persona los clubes de la convocatoria? (admin de convocatoria: solo las asignadas; revisor: sus periodos). */
    public static function veConvocatoria(User $u, int $convocatoriaId): bool
    {
        return Alcance::puedeVerConvocatoria($u, $convocatoriaId);
    }

    /** ¿Puede resolver ahora la etapa actual del club? */
    public static function puedeResolver(User $u, Club $club): bool
    {
        $rol = self::rolDe($u);
        $etapa = $club->etapaActual;

        return $rol !== null && $etapa !== null && self::veConvocatoria($u, $club->convocatoria_id)
            && (in_array($club->estado, Club::EN_REVISION, true) || $club->vencido())
            && $etapa->permiteRol($rol);
    }

    /** ¿Puede dar visto bueno y registrar el comité? (admin o admin de convocatoria con alcance). */
    public static function puedeAceptar(User $u, int $convocatoriaId): bool
    {
        return ($u->tieneRol('admin') || $u->tieneRol('admin_convocatoria')) && self::veConvocatoria($u, $convocatoriaId);
    }

    public static function fechaLegible(?\DateTimeInterface $f): ?string
    {
        // E56 (pedido del usuario): hora en 12 h con a. m. / p. m., p. ej. «15/10/2026 a las 10:30 a. m. (hora del centro)».
        if (! $f) return null;
        $c = \Carbon\Carbon::instance($f)->setTimezone(self::ZONA);

        return $c->format('d/m/Y').' a las '.$c->format('g:i').' '.($c->format('A') === 'AM' ? 'a. m.' : 'p. m.').' (hora del centro)';
    }

    // ───────────────────────── Transiciones ─────────────────────────

    /** Primer envío del líder (borrador → enviado en la etapa 1). */
    public static function enviar(Club $club, User $lider): Club
    {
        $club = DB::transaction(function () use ($club, $lider) {
            $c = Club::whereKey($club->id)->lockForUpdate()->first();
            if ($c->estado !== 'borrador') self::falla('Tu club ya se envió.');
            $etapa = self::etapas($c->convocatoria_id)->first();
            if (! $etapa) self::falla('La convocatoria aún no tiene etapas de revisión. Avisa al COMECYT.');
            $c->forceFill(['estado' => 'enviado', 'enviado_at' => now(), 'etapa_actual_id' => $etapa->id, 'ronda' => 0, 'vence_at' => null,
                'aviso_privacidad_at' => now()])->save();
            self::historial($c, $etapa, 'enviado', null, $lider, 'lider_club');

            return $c;
        });
        self::avisarRevisores($club->fresh('etapaActual'), 'por_revisar');

        return $club;
    }

    /** El líder termina de subsanar (observado dentro del plazo → subsanado, misma etapa). */
    public static function subsanar(Club $club, User $lider): Club
    {
        $club = DB::transaction(function () use ($club, $lider) {
            $c = Club::whereKey($club->id)->lockForUpdate()->first();
            if ($c->estado !== 'observado') self::falla('Tu club no tiene correcciones pendientes.');
            if ($c->vencido()) self::falla('El plazo para corregir ya venció. El COMECYT decidirá si te da una prórroga.');
            $c->forceFill(['estado' => 'subsanado', 'vence_at' => null])->save();
            self::historial($c, $c->etapaActual, 'subsanado', null, $lider, 'lider_club');

            return $c;
        });
        self::avisarRevisores($club->fresh('etapaActual'), 'subsanado');

        return $club;
    }

    /** Resolución de la etapa actual: aprobar, observar (con plazo) o rechazar. */
    public static function resolver(Club $club, User $u, string $resultado, ?string $comentario): Club
    {
        $comentario = $comentario !== null ? trim(strip_tags($comentario)) : null;
        $evento = null;
        $club = DB::transaction(function () use ($club, $u, $resultado, $comentario, &$evento) {
            $c = Club::with('etapaActual')->whereKey($club->id)->lockForUpdate()->first();
            if (! self::puedeResolver($u, $c)) self::falla('Este club ya no está esperando tu revisión (otra persona pudo resolverlo).');
            $etapa = $c->etapaActual;
            $vencido = $c->vencido();
            if ($vencido && $resultado !== 'rechazar') self::falla('El plazo de corrección venció: rechaza el club o da una prórroga.');

            if ($resultado === 'aprobar') {
                $siguiente = self::etapas($c->convocatoria_id)->first(fn ($e) => $e->orden > $etapa->orden);
                self::historial($c, $etapa, 'aprobado', $comentario, $u);
                if ($siguiente) {
                    $c->forceFill(['estado' => 'enviado', 'etapa_actual_id' => $siguiente->id, 'ronda' => 0, 'vence_at' => null])->save();
                    $evento = 'etapa_aprobada';
                } else {
                    $c->forceFill(['estado' => 'aprobado_revision', 'etapa_actual_id' => null, 'ronda' => 0, 'vence_at' => null])->save();
                    $evento = 'aprobado_revision';
                }
            } elseif ($resultado === 'observar') {
                if (! $comentario) self::falla('Escribe qué debe corregir el líder.', 'comentario');
                if ($c->ronda >= $etapa->max_subsanaciones) {
                    $n = $etapa->max_subsanaciones;
                    self::falla(($n === 0 ? 'Esta etapa no permite correcciones' : ($n === 1 ? 'Esta etapa permite 1 corrección y ya se usó' : "Esta etapa permite {$n} correcciones y ya se usaron"))
                        .': aprueba o rechaza el club.');
                }
                $vence = now()->addHours($etapa->plazo_horas);
                $c->forceFill(['estado' => 'observado', 'ronda' => $c->ronda + 1, 'vence_at' => $vence])->save();
                self::historial($c, $etapa, 'observado', $comentario, $u, null, null, $vence);
                $evento = 'observado';
            } elseif ($resultado === 'rechazar') {
                if (! $comentario) self::falla('Escribe el motivo del rechazo.', 'comentario');
                $c->forceFill(['estado' => 'rechazado', 'etapa_actual_id' => null, 'vence_at' => null, 'rechazo_origen' => 'revision', 'rechazo_motivo' => $comentario])->save();
                self::historial($c, $etapa, 'rechazado', $comentario, $u);
                $evento = 'rechazado';
            } else {
                self::falla('Resultado no válido.', 'resultado');
            }

            return $c;
        });
        Audit::log('club.revision_'.$resultado, $club, ['folio' => $club->folio]);

        $club->refresh()->load('etapaActual');
        match ($evento) {
            'observado' => self::avisarLider($club, 'observado', ['vence' => self::fechaLegible($club->vence_at), 'comentario' => $comentario]),
            'rechazado' => self::avisarLider($club, 'rechazado', ['motivo' => $comentario]),
            'etapa_aprobada' => [self::avisarLider($club, 'etapa_aprobada'), self::avisarRevisores($club, 'por_revisar')],
            'aprobado_revision' => [self::avisarLider($club, 'etapa_aprobada'), self::avisarAdmins($club, 'aprobado_revision')],
            default => null,
        };

        return $club;
    }

    /** Prórroga cuando el plazo de corrección venció (el revisor escribe las horas). */
    public static function prorroga(Club $club, User $u, int $horas, string $motivo): Club
    {
        $motivo = trim(strip_tags($motivo));
        $club = DB::transaction(function () use ($club, $u, $horas, $motivo) {
            $c = Club::with('etapaActual')->whereKey($club->id)->lockForUpdate()->first();
            if (! self::puedeResolver($u, $c) || ! $c->vencido()) self::falla('Solo se da prórroga a un club con el plazo de corrección vencido.');
            $vence = now()->addHours($horas);
            $c->forceFill(['vence_at' => $vence])->save();
            self::historial($c, $c->etapaActual, 'prorroga', $motivo, $u, null, $horas, $vence);

            return $c;
        });
        Audit::log('club.prorroga', $club, ['horas' => $horas]);
        self::avisarLider($club->refresh(), 'prorroga', ['vence' => self::fechaLegible($club->vence_at), 'comentario' => $motivo]);

        return $club;
    }

    /** Visto bueno del admin de convocatoria (primera de las dos marcas de aceptación). */
    public static function vistoBueno(Club $club, User $u): Club
    {
        $club = DB::transaction(function () use ($club, $u) {
            $c = Club::whereKey($club->id)->lockForUpdate()->first();
            if ($c->estado !== 'aprobado_revision') self::falla('El visto bueno se da a clubes que ya pasaron todas las revisiones.');
            if ($c->visto_bueno_at) self::falla('Este club ya tiene visto bueno.');
            $c->forceFill(['visto_bueno_at' => now(), 'visto_bueno_por' => $u->id])->save();
            self::historial($c, null, 'visto_bueno', null, $u);

            return $c;
        });
        Audit::log('club.visto_bueno', $club, ['folio' => $club->folio]);

        return $club;
    }

    /** Decisión del comité (segunda marca). Requiere acta cargada y visto bueno. */
    public static function comite(Club $club, User $u, string $resultado, ?string $motivo): Club
    {
        $motivo = $motivo !== null ? trim(strip_tags($motivo)) : null;
        $club = DB::transaction(function () use ($club, $u, $resultado, $motivo) {
            $c = Club::with('convocatoria.especieConfig')->whereKey($club->id)->lockForUpdate()->first();
            if ($c->estado !== 'aprobado_revision') self::falla('Solo se decide en comité un club aprobado en revisión.');
            if (! $c->visto_bueno_at) self::falla('Primero el admin de convocatoria debe dar su visto bueno.');
            if (! $c->convocatoria?->especieConfig?->acta_comite) self::falla('Sube primero el acta del comité de esta convocatoria.');
            if ($resultado === 'aceptado') {
                $c->forceFill(['estado' => 'aceptado', 'comite_resultado' => 'aceptado', 'comite_at' => now(), 'comite_por' => $u->id, 'aceptado_at' => now()])->save();
            } elseif ($resultado === 'no_aceptado') {
                $c->forceFill(['estado' => 'rechazado', 'comite_resultado' => 'no_aceptado', 'comite_at' => now(), 'comite_por' => $u->id,
                    'rechazo_origen' => 'comite', 'rechazo_motivo' => $motivo ?: null])->save();
            } else {
                self::falla('Resultado no válido.', 'resultado');
            }
            self::historial($c, null, 'comite_'.$resultado, $motivo, $u);

            return $c;
        });
        Audit::log('club.comite_'.$resultado, $club, ['folio' => $club->folio]);
        $resultado === 'aceptado'
            ? self::avisarLider($club->refresh(), 'aceptado')
            : self::avisarLider($club->refresh(), 'rechazado', ['motivo' => $motivo]);

        return $club;
    }

    // ───────────────────────── Apoyos ─────────────────────────

    private static function historial(Club $c, ?EspecieEtapa $e, string $resultado, ?string $comentario, User $u, ?string $rol = null, ?int $horas = null, $vence = null): void
    {
        ClubRevision::create([
            'club_id' => $c->id, 'etapa_id' => $e?->id, 'ronda' => $c->ronda, 'resultado' => $resultado,
            'comentario' => $comentario ? mb_substr($comentario, 0, 3000) : null, 'horas' => $horas, 'vence_at' => $vence,
            'user_id' => $u->id, 'rol' => $rol ?? self::rolDe($u),
        ]);
    }

    private static function falla(string $mensaje, string $campo = 'club'): never
    {
        throw ValidationException::withMessages([$campo => $mensaje]);
    }

    /** Personas que pueden resolver la etapa actual (admins, admins de la convocatoria y revisores con alcance). */
    public static function revisoresDe(Club $club): Collection
    {
        $etapa = $club->etapaActual;
        if (! $etapa) return collect();
        $roles = [config('comecyt.roles.admin')];
        if ($etapa->permiteRol('admin_convocatoria')) $roles[] = config('comecyt.roles.admin_convocatoria');
        if ($etapa->permiteRol('revisor')) $roles[] = config('comecyt.roles.revisor');

        return User::where('activo', true)->whereIn('rol_id', $roles)->get()
            ->filter(fn (User $u) => $u->tieneRol('admin') || self::veConvocatoria($u, $club->convocatoria_id))->values();
    }

    public static function adminsDe(Club $club): Collection
    {
        return User::where('activo', true)->whereIn('rol_id', [config('comecyt.roles.admin'), config('comecyt.roles.admin_convocatoria')])->get()
            ->filter(fn (User $u) => $u->tieneRol('admin') || self::veConvocatoria($u, $club->convocatoria_id))->values();
    }

    private static function avisarRevisores(Club $club, string $evento): void
    {
        foreach (self::revisoresDe($club) as $u) $u->notify(new ClubAviso($club, $evento, ['etapa' => $club->etapaActual?->nombre]));
    }

    private static function avisarAdmins(Club $club, string $evento): void
    {
        foreach (self::adminsDe($club) as $u) $u->notify(new ClubAviso($club, $evento));
    }

    private static function avisarLider(Club $club, string $evento, array $extra = []): void
    {
        $club->loadMissing('lider');
        if ($club->lider && $club->lider->activo) $club->lider->notify(new ClubAviso($club, $evento, $extra));
    }
}
