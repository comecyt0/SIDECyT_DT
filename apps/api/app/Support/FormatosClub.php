<?php

namespace App\Support;

use App\Models\Club;
use App\Models\ClubDocumento;
use App\Models\ClubIntegrante;
use App\Models\EspecieConfig;
use App\Models\ProgramaDocumento;
use Illuminate\Support\Collection;

/**
 * E79 (20/10/2026) — Formatos institucionales de los clubes (originales en F:\Formatos, decisiones del usuario):
 *  - Carta de la escuela, formatos A, B y C del STEAM EDOMEX y permiso de uso de imagen (infantil o de adulto, uno por
 *    integrante). Cada uno con casillas «Pedir» y «Obligatorio» en la configuración de la convocatoria.
 *  - El sistema los genera llenos con lo que exista; lo que falte queda como línea para llenar a mano. Llevan la franja
 *    de convivencia arriba y se descargan en PDF sin permiso de edición. El líder los firma, sella y sube en PDF.
 *  - Cada documento subido se revisa (aprobar o rechazar con motivo); el club no se aprueba con documentos pendientes.
 */
class FormatosClub
{
    public const MAX_MB = 10;

    public const VISTAS = [
        'carta_escuela' => 'pdfs.carta_escuela_club',
        'formato_a' => 'pdfs.formatos.formato_a',
        'formato_b' => 'pdfs.formatos.formato_b',
        'formato_c' => 'pdfs.formatos.formato_c',
    ];

    public const ARCHIVO = [
        'carta_escuela' => 'carta-escuela', 'formato_a' => 'formato-a-carta-de-interes', 'formato_b' => 'formato-b-constancia',
        'formato_c' => 'formato-c-integracion',
    ];

    public const AYUDA = 'Descárgalo ya llenado, recaba firmas y sello, y súbelo escaneado en PDF.';

    public const ESTADOS = ['pendiente', 'aprobado', 'rechazado'];

    public static function config(Club $club): EspecieConfig
    {
        return $club->convocatoria->especieConfig ?? new EspecieConfig(['min_integrantes' => 1, 'max_integrantes' => 10, 'participan_menores' => true]);
    }

    /** Docente = líder A o líder B del club (los demás integrantes son estudiantes). */
    public static function esDocente(ClubIntegrante $i): bool
    {
        return (bool) $i->es_lider || (bool) $i->es_lider_b;
    }

    /** Permiso infantil para estudiantes menores o sin fecha de nacimiento; de adulto para docentes y mayores de edad. */
    public static function esMenor(ClubIntegrante $i): bool
    {
        return ! self::esDocente($i) && $i->menor_de_edad !== false;
    }

    public static function claveImagen(ClubIntegrante $i): string
    {
        return Especie::PREFIJO_IMAGEN.$i->id;
    }

    /** Nombre de la persona titular de la escuela: su cuenta en el club, lo capturado o la solicitud de la escuela. */
    public static function director(Club $club): ?string
    {
        if (! $club->exists) {
            return trim((string) ($club->datos['director_nombre'] ?? '')) ?: null; // club de ejemplo (vista previa)
        }
        if ($club->dueno_director) {
            return $club->lider?->name;
        }
        $acceso = $club->accesos()->where('tipo', 'director')->with('usuario:id,name')->first();
        if ($acceso?->usuario?->name) {
            return $acceso->usuario->name;
        }
        $capturado = trim((string) ($club->datos['director_nombre'] ?? ''));
        if ($capturado !== '') {
            return $capturado;
        }

        return $club->escuelaSolicitud?->director ?: null;
    }

    /** Datos comunes de los formatos del club (lo que no exista va en null y la vista dibuja la línea para llenar). */
    public static function datos(Club $club): array
    {
        $club->loadMissing(['escuela', 'escuelaSolicitud', 'lider:id,name', 'integrantes', 'convocatoria:id,nombre,tipo_programa_id']);
        $escuela = $club->escuela ?? $club->escuelaSolicitud;
        $docentes = $club->integrantes->filter(fn ($i) => self::esDocente($i))->values();
        $estudiantes = $club->integrantes->reject(fn ($i) => self::esDocente($i))->values();
        $lugar = trim((string) ($club->datos['lugar'] ?? ''));

        return [
            'club' => $club,
            'escuela' => $escuela,
            'nivel' => $escuela?->nivel,
            'sistema' => $escuela?->sistema,
            'docentes' => $docentes,
            'estudiantes' => $estudiantes,
            'director' => self::director($club),
            'lugar' => $lugar !== '' ? $lugar : null,
            'fecha' => now('America/Mexico_City'),
            'director_general' => config('comecyt.director_general'),
        ];
    }

    /** Dato llenado, o línea en blanco para escribir a mano (decisión del usuario). El texto siempre se escapa. */
    public static function campo(mixed $valor, int $ancho = 200): \Illuminate\Support\HtmlString
    {
        $v = is_string($valor) ? trim($valor) : $valor;
        if ($v === null || $v === '') {
            return new \Illuminate\Support\HtmlString('<span class="linea" style="width:'.$ancho.'px">&nbsp;</span>');
        }

        return new \Illuminate\Support\HtmlString('<span class="dato">'.e((string) $v).'</span>');
    }

    /** Casilla dibujada (Helvetica no trae ☐/☒). */
    public static function casilla(bool $marcada): \Illuminate\Support\HtmlString
    {
        return new \Illuminate\Support\HtmlString('<span class="caja">'.($marcada ? 'X' : '&nbsp;').'</span>');
    }

    public static function fechaLarga(\Carbon\CarbonInterface $f): string
    {
        $meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

        return $f->day.' de '.$meses[$f->month - 1].' de '.$f->year;
    }

    /**
     * 20/10/2026 (pedido del usuario: vista previa al crear o editar la convocatoria) — Club de ejemplo en memoria (no se
     * guarda) para ver cómo sale cada formato. Datos ficticios y evidentes; los vacíos muestran la línea para llenar a mano.
     */
    public static function ejemplo(): Club
    {
        $club = new Club(['nombre' => 'Club de ejemplo', 'datos' => ['director_nombre' => 'Nombre del Director(a) de Ejemplo', 'lugar' => 'Toluca, Estado de México']]);
        $club->forceFill(['id' => 0, 'folio' => 'CLUB-EJEMPLO-000000', 'dueno_director' => false]);
        $club->setRelation('escuela', new \App\Models\Escuela(['nombre' => 'Escuela de ejemplo', 'cct' => '15EPR0000A', 'municipio' => 'Toluca', 'nivel' => 'primaria', 'sistema' => 'estatal']));
        $club->setRelation('escuelaSolicitud', null);
        $club->setRelation('lider', new \App\Models\User(['name' => 'Docente Líder A de Ejemplo']));
        $club->setRelation('convocatoria', new \App\Models\Convocatoria(['nombre' => 'Convocatoria de ejemplo']));
        $mk = function (int $id, string $nombre, array $extra = []) {
            $i = new ClubIntegrante(['nombre' => $nombre] + $extra);
            $i->forceFill(['id' => $id, 'es_lider' => $extra['_a'] ?? false, 'es_lider_b' => $extra['_b'] ?? false]);
            unset($i->_a, $i->_b);

            return $i;
        };
        $club->setRelation('integrantes', new \Illuminate\Database\Eloquent\Collection([
            $mk(1, 'Docente Líder A de Ejemplo', ['_a' => true]),
            $mk(2, 'Docente Líder B de Ejemplo', ['_b' => true]),
            $mk(3, 'Estudiante Uno de Ejemplo', ['grado' => '5°', 'grupo' => 'A', 'fecha_nacimiento' => now()->subYears(11)->toDateString(), 'tutor_nombre' => 'Madre o Padre de Ejemplo', 'domicilio' => 'Calle Ejemplo 123, Toluca']),
            $mk(4, 'Estudiante Dos de Ejemplo', ['grado' => '5°', 'grupo' => 'B']),
        ]));
        $club->setRelation('documentos', new \Illuminate\Database\Eloquent\Collection());

        return $club;
    }

    /** Franja de convivencia como data URI (DomPDF no tiene red). */
    public static function franja(): ?string
    {
        $png = @file_get_contents(base_path('../web/public/identidad/convivencia-color.png'));

        return $png ? 'data:image/png;base64,'.base64_encode($png) : null;
    }

    /**
     * PDF para descargar SIN permiso de edición (pedido del usuario): se cifra con una contraseña de propietario aleatoria
     * que no se guarda; solo se permite imprimir. Se abre sin contraseña.
     */
    public static function descargar(string $vista, array $datos, string $nombre)
    {
        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView($vista, $datos + ['franja' => self::franja()])->setPaper('letter');
        $dom = $pdf->getDomPDF();
        $dom->render();
        $canvas = $dom->getCanvas();
        if (method_exists($canvas, 'get_cpdf')) {
            $canvas->get_cpdf()->setEncryption('', bin2hex(random_bytes(16)), ['print']);
        }

        return response($dom->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$nombre.'.pdf"',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    /** Estado de revisión de un documento subido (lista blanca). */
    public static function subido(?ClubDocumento $d, mixed $limite = null): ?array
    {
        if (! $d) {
            return null;
        }

        return [
            // E90: los datos que llenan el formato cambiaron después de subirlo → hay que descargarlo y subirlo de nuevo.
            'desactualizado' => $limite !== null && $d->updated_at && $d->updated_at->lt($limite),
            'nombre_original' => $d->nombre_original, 'subido_at' => $d->updated_at,
            'estado' => in_array($d->estado, self::ESTADOS, true) ? $d->estado : 'pendiente',
            'motivo' => $d->estado === 'rechazado' ? $d->motivo : null,
        ];
    }

    /**
     * Documentos que pide el club: formatos marcados (carta, A, B, C), luego los del programa. Con $conImagen se agregan
     * los permisos de imagen de cada integrante (para la revisión del personal).
     */
    public static function lista(Club $club, EspecieConfig $cfg, bool $conImagen = false): Collection
    {
        $club->loadMissing(['documentos', 'integrantes', 'convocatoria']);
        $docs = $club->documentos->keyBy('clave');
        $f = Especie::formatos($cfg);
        $lista = collect();
        foreach (Especie::FORMATOS_CLUB as $k) {
            if (! $f[$k]['pedir']) {
                continue;
            }
            $lista->push(['clave' => $k, 'nombre' => Especie::FORMATOS[$k], 'descripcion' => self::AYUDA, 'obligatorio' => $f[$k]['obligatorio'],
                'formatos' => ['pdf'], 'max_mb' => self::MAX_MB, 'generable' => true]);
        }
        foreach (ProgramaDocumento::where('tipo_programa_id', $club->convocatoria->tipo_programa_id)->where('activo', true)->orderBy('orden')->get() as $d) {
            $lista->push(['clave' => $d->clave, 'nombre' => $d->nombre, 'descripcion' => $d->descripcion, 'obligatorio' => (bool) $d->obligatorio,
                'formatos' => TiposArchivo::normalizar($d->formato_permitido), 'max_mb' => TiposArchivo::limiteMb((int) $d->{'tamaño_maximo_mb'}), 'generable' => false]);
        }
        if ($conImagen && $f['uso_imagen']['pedir']) {
            foreach ($club->integrantes as $i) {
                $lista->push(['clave' => self::claveImagen($i), 'nombre' => 'Permiso de uso de imagen'.(self::esMenor($i) ? ' (menor)' : '').' · '.$i->nombre,
                    'descripcion' => null, 'obligatorio' => $f['uso_imagen']['obligatorio'], 'formatos' => ['pdf'], 'max_mb' => self::MAX_MB,
                    'generable' => true, 'integrante_id' => $i->id]);
            }
        }

        $limite = self::ultimoCambio($club);
        $porId = $club->integrantes->keyBy('id');

        return $lista->map(fn ($d) => $d + ['subido' => self::subido($docs[$d['clave']] ?? null, empty($d['generable']) ? null
            : (isset($d['integrante_id']) ? self::ultimoCambio($club, $porId[$d['integrante_id']] ?? null) : $limite))])->values();
    }

    /** Permiso de imagen de cada integrante: {integrante_id: {tipo, subido}} (solo si la convocatoria lo pide). */
    public static function permisosImagen(Club $club, EspecieConfig $cfg): array
    {
        $f = Especie::formatos($cfg);
        if (! $f['uso_imagen']['pedir']) {
            return [];
        }
        $club->loadMissing(['documentos', 'integrantes']);
        $docs = $club->documentos->keyBy('clave');
        $out = [];
        foreach ($club->integrantes as $i) {
            $out[$i->id] = ['tipo' => self::esMenor($i) ? 'menor' : 'adulto', 'obligatorio' => $f['uso_imagen']['obligatorio'],
                'subido' => self::subido($docs[self::claveImagen($i)] ?? null, self::ultimoCambio($club, $i))];
        }

        return $out;
    }

    /**
     * E90: último cambio de los datos que llenan los formatos del club (o de un integrante, para su permiso de imagen):
     * datos del club, escuela e integrantes.
     */
    public static function ultimoCambio(Club $club, ?ClubIntegrante $i = null): ?\Carbon\CarbonInterface
    {
        $club->loadMissing(['escuela', 'integrantes']);
        $fechas = collect([$club->datos_cambiados_at, $club->escuela?->updated_at])
            ->merge($i ? [$i->updated_at] : $club->integrantes->pluck('updated_at'))->filter();

        return $fechas->max();
    }

    /** Lo que falta de los formatos para poder enviar (textos para el líder). */
    public static function faltantes(Club $club, EspecieConfig $cfg): array
    {
        $f = [];
        foreach (self::lista($club, $cfg, true) as $d) {
            $quien = isset($d['integrante_id']) ? $d['nombre'] : "«{$d['nombre']}»";
            if (! $d['subido']) {
                if ($d['obligatorio']) {
                    $f[] = isset($d['integrante_id']) ? "Sube el {$d['nombre']} (firmado)." : "Sube el documento {$quien}.";
                }
            } elseif ($d['subido']['desactualizado'] ?? false) {
                $f[] = "Los datos de {$quien} cambiaron después de subirlo: descárgalo de nuevo, fírmalo y súbelo.";
            } elseif ($d['subido']['estado'] === 'rechazado') {
                $f[] = "El COMECYT rechazó {$quien}".($d['subido']['motivo'] ? ": {$d['subido']['motivo']}" : '').'. Súbelo de nuevo.';
            }
        }

        return $f;
    }

    /** ¿Hay documentos subidos sin aprobar? (el club no se aprueba así). */
    public static function hayPorRevisar(Club $club): bool
    {
        // E92: el permiso de imagen de quien salió por un cambio aprobado ya no cuenta.
        return $club->documentos()->where('estado', '!=', 'aprobado')
            ->where(fn ($q) => $q->whereNull('integrante_id')->orWhereIn('integrante_id', $club->integrantes()->select('id')))->exists();
    }
}
