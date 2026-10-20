<?php

namespace App\Support;

use App\Models\Club;
use App\Models\FolioPublicado;
use App\Models\Solicitud;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * E80/E81 (20/10/2026, pedidos del usuario) — Folios de SIGAE en un solo lugar: solicitudes y clubes de Apoyo en
 * especie (también en captura), con el mismo alcance del panel. Sirve a la lista, a la vista previa (ficha con todos sus
 * datos y etiquetas, incluida «Nueva escuela» / «Ya participó») y a las exportaciones PDF / Excel.
 * Lista blanca: nada de CURP, teléfonos ni datos de contacto de menores; sin rutas de archivos.
 */
class FoliosReporte
{
    public const CLUB_APROBADOS = ['aceptado', 'kit_entregado'];
    public const CLUB_NO_APROBADOS = ['rechazado'];
    public const TOPE = 2000;

    public const ESTADO_CLUB = [
        'borrador' => 'En captura', 'enviado' => 'En revisión', 'observado' => 'Con observaciones', 'vencido' => 'Plazo vencido',
        'subsanado' => 'Corregido, en revisión', 'aprobado_revision' => 'Aprobado en revisión', 'aceptado' => 'Aceptado',
        'kit_entregado' => 'Kit entregado', 'rechazado' => 'No aceptado',
    ];

    public const ESTADO_SOLICITUD = [
        'borrador' => 'Borrador', 'enviada' => 'Enviada', 'en_revision' => 'En revisión', 'observada' => 'Con observaciones',
        'subsanada' => 'Corregida', 'en_evaluacion' => 'En evaluación', 'evaluada' => 'Evaluada', 'aprobada' => 'Aprobada',
        'convenio' => 'Convenio', 'ministracion' => 'Ministración', 'seguimiento' => 'Seguimiento', 'cerrada' => 'Cerrada',
        'rechazada' => 'Rechazada', 'cancelada' => 'Cancelada',
    ];

    public static function estadoTexto(string $tipo, ?string $estado): string
    {
        $mapa = $tipo === 'club' ? self::ESTADO_CLUB : self::ESTADO_SOLICITUD;

        return $mapa[$estado] ?? ucfirst(str_replace('_', ' ', (string) $estado));
    }

    public static function grupoDe(string $tipo, string $estado): string
    {
        if ($tipo === 'club') {
            return in_array($estado, self::CLUB_APROBADOS, true) ? 'aprobados' : (in_array($estado, self::CLUB_NO_APROBADOS, true) ? 'no_aprobados' : 'en_proceso');
        }

        return in_array($estado, Solicitud::ESTADOS_APROBADOS, true) ? 'aprobados' : (in_array($estado, Solicitud::ESTADOS_NO_APROBADOS, true) ? 'no_aprobados' : 'en_proceso');
    }

    /** Filtros comunes (convocatoria, periodo, búsqueda) sobre solicitudes o clubes. */
    private static function filtrar($q, array $f, string $campoTexto): void
    {
        if (! empty($f['convocatoria_id'])) {
            $q->where('convocatoria_id', (int) $f['convocatoria_id']);
        }
        if (! empty($f['periodo_id'])) {
            $q->whereHas('convocatoria', fn ($c) => $c->where('periodo_id', (int) $f['periodo_id']));
        }
        if (! empty($f['search'])) {
            $like = '%'.addcslashes((string) $f['search'], '%_\\').'%';
            $q->where(fn ($w) => $w->where('folio', 'ilike', $like)->orWhere($campoTexto, 'ilike', $like));
        }
    }

    /**
     * Folios normalizados (solicitudes no borrador + clubes) con alcance y filtros. $grupo: aprobados | no_aprobados |
     * en_proceso | todos. $ids (['solicitud-3', 'club-7']) limita a esos folios (exportación parcial o individual).
     */
    public static function items(User $u, array $f, string $grupo = 'todos', ?array $ids = null): Collection
    {
        $idsSol = $ids === null ? null : collect($ids)->filter(fn ($x) => str_starts_with($x, 'solicitud-'))->map(fn ($x) => (int) substr($x, 10))->values()->all();
        $idsClub = $ids === null ? null : collect($ids)->filter(fn ($x) => str_starts_with($x, 'club-'))->map(fn ($x) => (int) substr($x, 5))->values()->all();

        $qs = Alcance::aplicar(Solicitud::query(), $u)->where('estado', '!=', 'borrador')
            ->with(['user:id,name,email,avatar_path', 'empresa:id,nombre', 'convocatoria:id,nombre,periodo_id', 'convocatoria.periodo:id,nombre']);
        self::filtrar($qs, $f, 'titulo_proyecto');
        if ($idsSol !== null) $qs->whereIn('id', $idsSol ?: [0]);

        $qc = Alcance::aplicar(Club::query(), $u)
            ->with(['lider:id,name,email,avatar_path', 'escuela:id,nombre,cct,participo_antes', 'convocatoria:id,nombre,periodo_id', 'convocatoria.periodo:id,nombre', 'convocatoria.especieConfig', 'integrantes:id,club_id']);
        self::filtrar($qc, $f, 'nombre');
        if ($idsClub !== null) $qc->whereIn('id', $idsClub ?: [0]);

        // E84: desde Escuelas → Folios de esa escuela (solo clubes: las solicitudes no tienen escuela).
        if (! empty($f['escuela_id'])) {
            $qc->where('escuela_id', (int) $f['escuela_id']);
            $qs->whereRaw('1 = 0');
        }
        $sol = $qs->orderByDesc('updated_at')->limit(self::TOPE)->get();
        $clubes = $qc->orderByDesc('updated_at')->limit(self::TOPE)->get();
        $pubSol = FolioPublicado::whereIn('solicitud_id', $sol->pluck('id'))->pluck('solicitud_id')->all();
        $pubClub = FolioPublicado::whereIn('club_id', $clubes->pluck('id'))->pluck('club_id')->all();

        $items = $sol->toBase()->map(fn (Solicitud $s) => [
            'tipo' => 'solicitud', 'id' => $s->id, 'clave' => 'solicitud-'.$s->id, 'folio' => $s->folio, 'titulo_proyecto' => $s->titulo_proyecto,
            'estado' => $s->estado, 'estado_texto' => self::estadoTexto('solicitud', $s->estado), 'updated_at' => $s->updated_at, 'user_id' => $s->user_id,
            'user' => $s->user ? ['id' => $s->user->id, 'name' => $s->user->name, 'avatar_url' => $s->user->avatar_url] : null,
            'empresa' => $s->empresa ? ['nombre' => $s->empresa->nombre] : null,
            'convocatoria' => $s->convocatoria ? ['id' => $s->convocatoria->id, 'nombre' => $s->convocatoria->nombre, 'periodo' => $s->convocatoria->periodo?->only(['nombre'])] : null,
            'publicado_en_landing' => in_array($s->id, $pubSol, true), 'escuela_nueva' => null, 'integrantes' => null,
        ])->merge($clubes->toBase()->map(fn (Club $c) => [
            'tipo' => 'club', 'id' => $c->id, 'clave' => 'club-'.$c->id, 'folio' => $c->folio, 'titulo_proyecto' => $c->nombre,
            'estado' => $c->estadoVisible(), 'estado_texto' => self::estadoTexto('club', $c->estadoVisible()), 'updated_at' => $c->updated_at, 'user_id' => $c->lider_id,
            'user' => $c->lider ? ['id' => $c->lider->id, 'name' => $c->lider->name, 'avatar_url' => $c->lider->avatar_url] : null,
            'empresa' => $c->escuela ? ['nombre' => $c->escuela->nombre] : null,
            'convocatoria' => $c->convocatoria ? ['id' => $c->convocatoria->id, 'nombre' => $c->convocatoria->nombre, 'periodo' => $c->convocatoria->periodo?->only(['nombre'])] : null,
            'publicado_en_landing' => in_array($c->id, $pubClub, true),
            // 08/10/2026 (acuerdo con el usuario): identificador de escuela en todo lugar donde aparece.
            'escuela_nueva' => $c->escuela ? ! $c->escuela->participo_antes : null, 'integrantes' => $c->integrantes->count(),
            // E86: qué kit le toca (Kit / Kit Nueva escuela × cantidad).
            'kit' => KitClub::texto(KitClub::resumen($c)),
        ]))->sortByDesc(fn ($x) => (string) $x['updated_at'])->values();

        return $grupo === 'todos' ? $items : $items->filter(fn ($x) => self::grupoDe($x['tipo'], $x['estado']) === $grupo)->values();
    }

    /** Conteos por grupo (mismos filtros, sin la búsqueda de texto: igual que antes). */
    public static function conteos(User $u, array $f): array
    {
        $todos = self::items($u, array_diff_key($f, ['search' => 1]));
        $c = ['aprobados' => 0, 'no_aprobados' => 0, 'en_proceso' => 0];
        foreach ($todos as $x) $c[self::grupoDe($x['tipo'], $x['estado'])]++;

        return $c + ['todos' => $todos->count()];
    }

    /**
     * Ficha completa de un folio (vista previa y PDF individual). Forma genérica para que el panel y el PDF la pinten
     * igual: etiquetas, secciones (pares etiqueta/valor), tablas e historial. null = no existe o fuera del alcance.
     */
    public static function ficha(User $u, string $tipo, int $id): ?array
    {
        return $tipo === 'club' ? self::fichaClub($u, $id) : self::fichaSolicitud($u, $id);
    }

    private static function fecha($d, bool $hora = false): ?string
    {
        return $d ? \Carbon\Carbon::parse($d)->setTimezone('America/Mexico_City')->format($hora ? 'd/m/Y H:i' : 'd/m/Y') : null;
    }

    private static function fichaClub(User $u, int $id): ?array
    {
        $c = Club::with(['escuela', 'escuelaSolicitud', 'lider:id,name,email,cargo', 'integrantes', 'documentos', 'convocatoria.periodo', 'convocatoria.especieConfig', 'etapaActual'])->find($id);
        if (! $c || ! Alcance::puedeVerConvocatoria($u, (int) $c->convocatoria_id)) return null;
        $cfg = FormatosClub::config($c);
        $e = $c->escuela;
        $estado = $c->estadoVisible();
        $menores = $c->integrantes->filter(fn ($i) => $i->menor_de_edad)->count();
        $etiquetas = [
            ['texto' => self::estadoTexto('club', $estado), 'tono' => self::grupoDe('club', $estado) === 'aprobados' ? 'emerald' : (self::grupoDe('club', $estado) === 'no_aprobados' ? 'red' : 'violet')],
            ['texto' => 'Club · Apoyo en especie', 'tono' => 'sky'],
        ];
        if ($e) $etiquetas[] = $e->participo_antes ? ['texto' => 'Ya participó', 'tono' => 'gold'] : ['texto' => 'Nueva escuela', 'tono' => 'mint'];
        elseif ($c->escuelaSolicitud) $etiquetas[] = ['texto' => 'Escuela en revisión', 'tono' => 'gold'];
        $etiquetas[] = ['texto' => ucfirst($cfg->modalidad ?? 'estatal'), 'tono' => 'neutral'];
        if ($menores) $etiquetas[] = ['texto' => "{$menores} menor(es) de edad", 'tono' => 'sky'];
        if (FolioPublicado::where('club_id', $c->id)->exists()) $etiquetas[] = ['texto' => 'En la página pública', 'tono' => 'emerald'];
        $kit = KitClub::resumen($c, $cfg); // E86
        $etiquetas[] = ['texto' => KitClub::texto($kit), 'tono' => $kit['perfil'] === 'nueva' ? 'mint' : 'gold'];
        $nivel = ['primaria' => 'Primaria', 'secundaria' => 'Secundaria', 'media_superior' => 'Media superior', 'superior' => 'Superior'];
        $docs = FormatosClub::lista($c, $cfg, true);

        return [
            'tipo' => 'club', 'id' => $c->id, 'clave' => 'club-'.$c->id, 'folio' => $c->folio, 'titulo' => $c->nombre, 'estado' => $estado,
            'enlace' => '/admin/clubes/'.$c->id, 'etiquetas' => $etiquetas,
            'secciones' => [
                ['titulo' => 'Datos del club', 'campos' => [
                    ['etiqueta' => 'Folio', 'valor' => $c->folio], ['etiqueta' => 'Club', 'valor' => $c->nombre],
                    ['etiqueta' => 'Convocatoria', 'valor' => $c->convocatoria?->nombre], ['etiqueta' => 'Periodo', 'valor' => $c->convocatoria?->periodo?->nombre],
                    ['etiqueta' => 'Estado', 'valor' => self::estadoTexto('club', $estado)], ['etiqueta' => 'Etapa actual', 'valor' => $c->etapaActual?->nombre],
                    ['etiqueta' => 'Integrantes', 'valor' => (string) $c->integrantes->count()],
                    ['etiqueta' => 'Registrado', 'valor' => self::fecha($c->created_at, true)], ['etiqueta' => 'Enviado', 'valor' => self::fecha($c->enviado_at, true)],
                    ['etiqueta' => 'Aceptado', 'valor' => self::fecha($c->aceptado_at, true)], ['etiqueta' => 'Kit entregado', 'valor' => self::fecha($c->kit_entregado_at, true)],
                    ['etiqueta' => 'Descripción', 'valor' => is_string($c->datos['descripcion'] ?? null) ? $c->datos['descripcion'] : null],
                ]],
                ['titulo' => 'Escuela', 'campos' => [
                    ['etiqueta' => 'Escuela', 'valor' => $e?->nombre ?? $c->escuelaSolicitud?->nombre], ['etiqueta' => 'CCT', 'valor' => $e?->cct ?? $c->escuelaSolicitud?->cct],
                    ['etiqueta' => 'Municipio', 'valor' => $e?->municipio ?? $c->escuelaSolicitud?->municipio],
                    ['etiqueta' => 'Nivel', 'valor' => $nivel[$e?->nivel ?? ''] ?? null], ['etiqueta' => 'Subsistema', 'valor' => ['estatal' => 'Estatal', 'federal' => 'Federalizado'][$e?->sistema ?? ''] ?? null],
                    ['etiqueta' => 'Participación', 'valor' => $e ? ($e->participo_antes ? 'Ya participó' : 'Nueva escuela') : 'En revisión'],
                    ['etiqueta' => 'Director(a)', 'valor' => FormatosClub::director($c)],
                ]],
                ['titulo' => 'Kit', 'campos' => [
                    ['etiqueta' => 'Tipo', 'valor' => $kit['etiqueta'].($kit['forzado'] ? ' (asignado por el COMECYT)' : '')], ['etiqueta' => 'Nombre', 'valor' => $kit['nombre']],
                    ['etiqueta' => 'Cantidad', 'valor' => $kit['cantidad'].' kit(s)'.($kit['por'] === 'integrante' ? ', uno por integrante' : ' por club')],
                    ['etiqueta' => 'Incluye', 'valor' => KitClub::contenido($kit) ?: null],
                ]],
                ['titulo' => 'Líder del club', 'campos' => [
                    ['etiqueta' => 'Nombre', 'valor' => $c->lider?->name], ['etiqueta' => 'Correo', 'valor' => $c->lider?->email], ['etiqueta' => 'Cargo', 'valor' => $c->lider?->cargo],
                ]],
            ],
            'tablas' => [
                ['titulo' => 'Integrantes', 'columnas' => ['Nombre', 'Papel', 'Edad', 'Grado y grupo'],
                    'filas' => $c->integrantes->map(fn ($i) => [$i->nombre, $i->es_lider ? 'Líder A' : ($i->es_lider_b ? 'Líder B' : 'Estudiante'),
                        $i->fecha_nacimiento ? ($i->menor_de_edad ? 'Menor de edad' : 'Mayor de edad') : '—',
                        trim(($i->grado ?: '').' '.($i->grupo ?: '')) ?: ($i->grado_grupo ?: '—')])->values()->all()],
                ['titulo' => 'Documentos', 'columnas' => ['Documento', 'Estado'],
                    'filas' => $docs->map(fn ($d) => [$d['nombre'].($d['obligatorio'] ? '' : ' (opcional)'),
                        $d['subido'] ? ['pendiente' => 'Por revisar', 'aprobado' => 'Aprobado', 'rechazado' => 'Rechazado'][$d['subido']['estado']] ?? 'Por revisar' : 'Sin subir'])->values()->all()],
            ],
            'historial' => $c->revisiones()->with(['etapa:id,nombre', 'usuario:id,name'])->get()->map(fn ($r) => [
                'fecha' => self::fecha($r->created_at, true), 'texto' => ucfirst(str_replace('_', ' ', $r->resultado)).($r->etapa ? ' · '.$r->etapa->nombre : ''),
                'detalle' => $r->comentario, 'quien' => $r->usuario?->name,
            ])->values()->all(),
        ];
    }

    private static function fichaSolicitud(User $u, int $id): ?array
    {
        $s = Solicitud::with(['user:id,name,email', 'empresa', 'convocatoria.periodo', 'convocatoria.tipoPrograma:id,nombre', 'documentos', 'historial.user:id,name'])->find($id);
        if (! $s || $s->estado === 'borrador' || ! Alcance::puedeVerSolicitud($u, $s)) return null;
        $grupo = self::grupoDe('solicitud', $s->estado);
        $etiquetas = [
            ['texto' => self::estadoTexto('solicitud', $s->estado), 'tono' => $grupo === 'aprobados' ? 'emerald' : ($grupo === 'no_aprobados' ? 'red' : 'violet')],
            ['texto' => 'Solicitud', 'tono' => 'sky'],
        ];
        if ($s->convocatoria?->tipoPrograma) $etiquetas[] = ['texto' => $s->convocatoria->tipoPrograma->nombre, 'tono' => 'neutral'];
        if (FolioPublicado::where('solicitud_id', $s->id)->exists()) $etiquetas[] = ['texto' => 'En la página pública', 'tono' => 'emerald'];
        $monto = $s->monto_solicitado !== null ? '$'.number_format((float) $s->monto_solicitado, 2) : null;

        return [
            'tipo' => 'solicitud', 'id' => $s->id, 'clave' => 'solicitud-'.$s->id, 'folio' => $s->folio, 'titulo' => $s->titulo_proyecto, 'estado' => $s->estado,
            'enlace' => '/admin/perfiles/'.$s->user_id.'?folio='.$s->id, 'etiquetas' => $etiquetas,
            'secciones' => [
                ['titulo' => 'Datos de la solicitud', 'campos' => [
                    ['etiqueta' => 'Folio', 'valor' => $s->folio], ['etiqueta' => 'Proyecto', 'valor' => $s->titulo_proyecto],
                    ['etiqueta' => 'Convocatoria', 'valor' => $s->convocatoria?->nombre], ['etiqueta' => 'Periodo', 'valor' => $s->convocatoria?->periodo?->nombre],
                    ['etiqueta' => 'Estado', 'valor' => self::estadoTexto('solicitud', $s->estado)], ['etiqueta' => 'Monto solicitado', 'valor' => $monto],
                    ['etiqueta' => 'Inicio', 'valor' => self::fecha($s->fecha_inicio_evento)], ['etiqueta' => 'Fin', 'valor' => self::fecha($s->fecha_fin_evento)],
                    ['etiqueta' => 'Registrada', 'valor' => self::fecha($s->created_at, true)], ['etiqueta' => 'Última actualización', 'valor' => self::fecha($s->updated_at, true)],
                ]],
                ['titulo' => 'Solicitante', 'campos' => [
                    ['etiqueta' => 'Nombre', 'valor' => $s->user?->name], ['etiqueta' => 'Correo', 'valor' => $s->user?->email],
                    ['etiqueta' => 'Empresa', 'valor' => $s->empresa?->nombre],
                ]],
            ],
            'tablas' => [
                ['titulo' => 'Documentos', 'columnas' => ['Documento', 'Subido'],
                    'filas' => $s->documentos->map(fn ($d) => [(string) ($d->nombre ?? $d->tipo_documento ?? $d->clave ?? 'Documento'), self::fecha($d->created_at, true) ?? '—'])->values()->all()],
            ],
            'historial' => $s->historial->map(fn ($h) => [
                'fecha' => self::fecha($h->created_at, true),
                'texto' => ($h->estado_anterior ? self::estadoTexto('solicitud', $h->estado_anterior).' → ' : '').self::estadoTexto('solicitud', $h->estado_nuevo),
                'detalle' => $h->motivo, 'quien' => $h->user?->name,
            ])->values()->all(),
        ];
    }
}
