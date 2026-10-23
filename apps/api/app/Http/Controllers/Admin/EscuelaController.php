<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Escuela;
use App\Support\Audit;
use App\Support\TiposArchivo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

/**
 * E52 · F1 — Catálogo de escuelas (solo admin). Alta una por una o por Excel (plantilla descargable). La escuela define
 * el sistema (estatal/federal) que decide transporte y box lunch en la logística (F3).
 * Validación: CCT del Estado de México (15 + 3 letras + 4 dígitos + 1 letra), municipio del catálogo oficial (los 125
 * municipios de SEPOMEX), nivel y sistema de listas cerradas. Importación: upsert por CCT, informe por fila.
 */
class EscuelaController extends Controller
{
    public const PATRON_CCT = '/^15[A-Z]{3}\d{4}[A-Z]$/';
    public const MAX_FILAS = 20000;
    public const ETIQUETA_NIVEL = ['primaria' => 'Primaria', 'secundaria' => 'Secundaria', 'media_superior' => 'Media superior', 'superior' => 'Superior'];

    public function index(Request $request)
    {
        $request->validate([
            'q' => 'nullable|string|max:120',
            'nivel' => ['nullable', Rule::in(Escuela::NIVELES)],
            'sistema' => ['nullable', Rule::in(Escuela::SISTEMAS)],
            'activo' => 'nullable|in:0,1',
            'participo' => 'nullable|in:0,1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);
        $q = Escuela::query();
        if ($t = trim((string) $request->input('q'))) {
            // E94: por palabras, sin acentos y también por nombre de equipo.
            $q->buscar($t);
        }
        foreach (['nivel', 'sistema'] as $f) {
            if ($request->filled($f)) $q->where($f, $request->input($f));
        }
        // E55: filtrar por participación previa.
        if ($request->filled('participo')) $q->where('participo_antes', (bool) $request->input('participo'));
        if ($request->filled('activo')) $q->where('activo', (bool) $request->input('activo'));

        $p = $q->orderBy('nombre')->paginate((int) $request->input('per_page', 25));
        // E84 (20/10/2026, pedido del usuario): folios de los clubes de cada escuela con su estado (enlace a Folios).
        // Con el alcance de quien mira; solo folio, estado y convocatoria.
        $ids = collect($p->items())->pluck('id');
        $clubes = \App\Support\Alcance::aplicar(\App\Models\Club::query(), $request->user())->whereIn('escuela_id', $ids)
            ->with('convocatoria:id,nombre')->orderByDesc('updated_at')->get(['id', 'folio', 'estado', 'escuela_id', 'convocatoria_id', 'vence_at'])
            ->groupBy('escuela_id');
        $p->getCollection()->transform(function ($e) use ($clubes) {
            $e->setAttribute('clubes', ($clubes[$e->id] ?? collect())->map(fn ($c) => [
                'id' => $c->id, 'folio' => $c->folio, 'estado' => $c->estadoVisible(),
                'estado_texto' => \App\Support\FoliosReporte::estadoTexto('club', $c->estadoVisible()),
                'grupo' => \App\Support\FoliosReporte::grupoDe('club', $c->estadoVisible()), 'convocatoria' => $c->convocatoria?->nombre,
            ])->values());

            return $e;
        });

        return response()->json($p);
    }

    public function store(Request $request)
    {
        $datos = $this->validar($request);
        $e = Escuela::create($datos);
        Audit::log('escuela.creada', $e, ['cct' => $e->cct]);

        return response()->json($e, 201);
    }

    public function update(Request $request, Escuela $escuela)
    {
        $datos = $this->validar($request, $escuela);
        $escuela->update($datos);
        Audit::log('escuela.actualizada', $escuela, ['cct' => $escuela->cct]);

        return response()->json($escuela);
    }

    private function validar(Request $request, ?Escuela $e = null): array
    {
        $request->merge(['cct' => mb_strtoupper(trim((string) $request->input('cct')))]);
        $datos = $request->validate([
            'cct' => ['required', 'string', 'size:10', 'regex:'.self::PATRON_CCT, Rule::unique('escuelas', 'cct')->ignore($e?->id)],
            'nombre' => 'required|string|max:255',
            'municipio' => 'required|string|max:120',
            'nivel' => ['required', Rule::in(Escuela::NIVELES)],
            'sistema' => ['required', Rule::in(Escuela::SISTEMAS)],
            'activo' => 'sometimes|boolean',
            // E55: participación previa (identificador que el admin escribe).
            'participo_antes' => 'sometimes|boolean',
            'temporadas' => 'sometimes|nullable|array|max:'.Escuela::MAX_TEMPORADAS,
            'temporadas.*' => 'nullable|string|max:60',
            // E94: datos de la escuela y de su equipo (opcionales; el admin los ve todos, el líder solo equipo, domicilio y matrícula).
            'equipo_nombre' => 'sometimes|nullable|string|max:255',
            'domicilio' => 'sometimes|nullable|string|max:400',
            'ubicacion_url' => 'sometimes|nullable|string|max:1000',
            'latitud' => 'sometimes|nullable|numeric|between:18.3,20.4',
            'longitud' => 'sometimes|nullable|numeric|between:-100.7,-98.5',
            'matricula_total' => 'sometimes|nullable|integer|min:0|max:100000',
            'matricula_hombres' => 'sometimes|nullable|integer|min:0|max:100000',
            'matricula_mujeres' => 'sometimes|nullable|integer|min:0|max:100000',
            'tipo_secundaria' => ['sometimes', 'nullable', Rule::in(array_keys(Escuela::TIPOS_SECUNDARIA))],
            'zona' => 'sometimes|nullable|string|max:60',
            'subsistema_detalle' => 'sometimes|nullable|string|max:60',
            'observaciones' => 'sometimes|nullable|string|max:500',
        ], ['cct.regex' => 'La CCT debe ser del Estado de México (p. ej. 15EPR0001A).', 'latitud.between' => 'La latitud no cae en el Estado de México.', 'longitud.between' => 'La longitud no cae en el Estado de México.'],
            ['temporadas' => 'temporadas', 'temporadas.*' => 'temporada']);
        foreach (['equipo_nombre', 'domicilio', 'zona', 'subsistema_detalle', 'observaciones'] as $c) {
            if (array_key_exists($c, $datos)) {
                $t = $datos[$c] === null ? '' : preg_replace('/\s+/', ' ', Escuela::textoSeguro((string) $datos[$c]));
                $datos[$c] = $t === '' ? null : $t;
            }
        }
        if (array_key_exists('ubicacion_url', $datos)) {
            $u = trim((string) $datos['ubicacion_url']);
            if ($u !== '' && ! Escuela::urlMapaSegura($u)) {
                throw \Illuminate\Validation\ValidationException::withMessages(['ubicacion_url' => 'Escribe un enlace https de Google Maps o Apple Maps.']);
            }
            $datos['ubicacion_url'] = $u === '' ? null : $u;
        }
        if (isset($datos['latitud']) xor isset($datos['longitud'])) {
            throw \Illuminate\Validation\ValidationException::withMessages(['latitud' => 'Escribe latitud y longitud juntas, o ninguna.']);
        }
        if (($datos['nivel'] ?? null) !== 'secundaria') $datos['tipo_secundaria'] = null;
        $mun = Escuela::municipioCanonico($datos['municipio']);
        if (! $mun) {
            throw \Illuminate\Validation\ValidationException::withMessages(['municipio' => 'Ese municipio no existe en el Estado de México.']);
        }
        $datos['municipio'] = $mun;
        $datos['nombre'] = Escuela::textoSeguro($datos['nombre']);
        if (array_key_exists('participo_antes', $datos) || array_key_exists('temporadas', $datos)) {
            $participo = (bool) ($datos['participo_antes'] ?? $e?->participo_antes ?? false);
            $temporadas = Escuela::normalizarTemporadas($datos['temporadas'] ?? ($e?->temporadas ?? []));
            if ($participo && ! $temporadas) {
                throw \Illuminate\Validation\ValidationException::withMessages(['temporadas' => 'Escribe al menos una temporada en la que participó la escuela.']);
            }
            $datos['participo_antes'] = $participo;
            // E94: una «Nueva escuela» conserva su temporada actual (p. ej. 2026-2027); solo «Ya participó» exige al menos una.
            $datos['temporadas'] = $temporadas;
        }

        return $datos;
    }

    private function municipioCanonico(string $texto): ?string
    {
        return Escuela::municipioCanonico($texto);
    }

    private static function clave(string $s): string
    {
        return Escuela::clave($s);
    }

    /** Importa un Excel (.xlsx) con columnas CCT, NOMBRE, MUNICIPIO, NIVEL, SISTEMA. Upsert por CCT; informe por fila. */
    public function importar(Request $request)
    {
        $request->validate(['archivo' => 'required|file|max:5120']);
        $ext = TiposArchivo::validar($request->file('archivo'), ['office'], 5, 'archivo');
        if ($ext !== 'xlsx') {
            throw \Illuminate\Validation\ValidationException::withMessages(['archivo' => 'Sube el Excel en formato .xlsx (usa la plantilla).']);
        }
        $reader = IOFactory::createReader('Xlsx');
        $reader->setReadDataOnly(true);
        $reader->setLoadSheetsOnly([0 => $reader->listWorksheetNames($request->file('archivo')->getPathname())[0]]);
        $libro = $reader->load($request->file('archivo')->getPathname());
        $filas = $libro->getActiveSheet()->toArray(null, false, false, false); // sin evaluar fórmulas
        if (count($filas) < 2) {
            throw \Illuminate\Validation\ValidationException::withMessages(['archivo' => 'El Excel no tiene filas de escuelas.']);
        }
        if (count($filas) - 1 > self::MAX_FILAS) {
            throw \Illuminate\Validation\ValidationException::withMessages(['archivo' => 'El Excel tiene más de '.self::MAX_FILAS.' filas.']);
        }
        $enc = array_map(fn ($h) => self::clave((string) $h), $filas[0]);
        $pos = [];
        foreach (['cct', 'nombre', 'municipio', 'nivel', 'sistema'] as $c) {
            $i = array_search($c, $enc, true);
            if ($i === false) {
                throw \Illuminate\Validation\ValidationException::withMessages(['archivo' => "Falta la columna «".mb_strtoupper($c)."». Usa la plantilla."]);
            }
            $pos[$c] = $i;
        }
        // E94: columnas opcionales (si no vienen, la escuela conserva lo que ya tiene).
        $opc = [];
        foreach (self::COLUMNAS_OPCIONALES as $campo => $alias) {
            foreach ($alias as $a) { if (($i = array_search($a, $enc, true)) !== false) { $opc[$campo] = $i; break; } }
        }
        $nivelPorEtiqueta = [];
        foreach (self::ETIQUETA_NIVEL as $k => $v) { $nivelPorEtiqueta[self::clave($v)] = $k; $nivelPorEtiqueta[$k] = $k; }

        $creadas = 0; $actualizadas = 0; $errores = [];
        DB::transaction(function () use ($filas, $pos, $opc, $nivelPorEtiqueta, &$creadas, &$actualizadas, &$errores) {
            foreach (array_slice($filas, 1) as $n => $f) {
                $fila = $n + 2;
                $cct = mb_strtoupper(trim((string) ($f[$pos['cct']] ?? '')));
                $nombre = ltrim(trim(strip_tags((string) ($f[$pos['nombre']] ?? ''))), "=+-@ \t"); // sin fórmulas
                if ($cct === '' && $nombre === '') continue; // fila vacía
                $mun = $this->municipioCanonico((string) ($f[$pos['municipio']] ?? ''));
                $nivel = $nivelPorEtiqueta[self::clave((string) ($f[$pos['nivel']] ?? ''))] ?? null;
                $sistema = self::clave((string) ($f[$pos['sistema']] ?? ''));
                $prob = [];
                if (! preg_match(self::PATRON_CCT, $cct)) $prob[] = 'CCT inválida';
                if ($nombre === '' || mb_strlen($nombre) > 255) $prob[] = 'nombre vacío o muy largo';
                if (! $mun) $prob[] = 'municipio no reconocido';
                if (! $nivel) $prob[] = 'nivel inválido';
                if (! in_array($sistema, Escuela::SISTEMAS, true)) $prob[] = 'sistema debe ser Estatal o Federal';
                [$extra, $probExtra] = $this->extrasDeFila($f, $opc, $nivel);
                $prob = array_merge($prob, $probExtra);
                if ($prob) {
                    if (count($errores) < 200) $errores[] = ['fila' => $fila, 'cct' => mb_substr($cct, 0, 12), 'problemas' => $prob];
                    continue;
                }
                $e = Escuela::firstOrNew(['cct' => $cct]);
                $nuevo = ! $e->exists;
                $e->fill(['nombre' => $nombre, 'municipio' => $mun, 'nivel' => $nivel, 'sistema' => $sistema, 'activo' => true] + $extra)->save();
                $nuevo ? $creadas++ : $actualizadas++;
            }
        });
        Audit::log('escuela.importadas', null, ['creadas' => $creadas, 'actualizadas' => $actualizadas, 'con_error' => count($errores)]);

        return response()->json(['creadas' => $creadas, 'actualizadas' => $actualizadas, 'errores' => $errores]);
    }

    /** E94: columnas opcionales del Excel → campo (encabezados normalizados con `clave()`). */
    public const COLUMNAS_OPCIONALES = [
        'equipo_nombre' => ['equipo', 'nombre de equipo', 'nombre del equipo'],
        'domicilio' => ['domicilio'],
        'ubicacion_url' => ['ubicacion', 'ubicacion en maps', 'ubicacion url'],
        'matricula_total' => ['matricula', 'matricula gral.', 'matricula general'],
        'matricula_hombres' => ['hombres', 'matricula hombres'],
        'matricula_mujeres' => ['mujeres', 'matricula mujeres'],
        'tipo_secundaria' => ['tipo de secundaria', 'tipo secundaria'],
        'zona' => ['zona'],
        'subsistema_detalle' => ['subsistema'],
        'temporadas' => ['temporadas'],
        'participo_antes' => ['ya participo', 'participo antes'],
    ];

    /**
     * E94: valores opcionales de una fila → [campos a guardar, problemas]. Solo trae las columnas que el Excel incluye;
     * mismos candados que el formulario (texto sin HTML ni fórmulas, mapas https conocidos, números acotados).
     */
    private function extrasDeFila(array $f, array $opc, ?string $nivel): array
    {
        $out = []; $prob = [];
        $txt = fn (string $c) => preg_replace('/\s+/', ' ', Escuela::textoSeguro((string) ($f[$opc[$c]] ?? '')));
        foreach (['equipo_nombre' => 255, 'domicilio' => 400, 'zona' => 60, 'subsistema_detalle' => 60] as $c => $max) {
            if (! isset($opc[$c])) continue;
            $t = $txt($c);
            if (mb_strlen($t) > $max) { $prob[] = "{$c} muy largo"; continue; }
            $out[$c] = $t === '' ? null : $t;
        }
        if (isset($opc['ubicacion_url'])) {
            $u = trim((string) ($f[$opc['ubicacion_url']] ?? ''));
            if ($u !== '' && ! Escuela::urlMapaSegura($u)) $prob[] = 'ubicación: solo enlaces https de Google Maps o Apple Maps';
            else $out['ubicacion_url'] = $u === '' ? null : $u;
        }
        foreach (['matricula_total', 'matricula_hombres', 'matricula_mujeres'] as $c) {
            if (! isset($opc[$c])) continue;
            $v = $f[$opc[$c]] ?? null;
            if ($v === null || trim((string) $v) === '') { $out[$c] = null; continue; }
            if (! is_numeric($v) || (float) $v < 0 || (float) $v > 100000 || (float) $v != (int) $v) { $prob[] = "{$c} no es un número válido"; continue; }
            $out[$c] = (int) $v;
        }
        if (isset($opc['tipo_secundaria'])) {
            $t = self::clave((string) ($f[$opc['tipo_secundaria']] ?? ''));
            $mapa = ['general' => 'general', 'tecnica' => 'tecnica', 'telesecundaria' => 'telesecundaria'];
            if ($t === '' || $nivel !== 'secundaria') $out['tipo_secundaria'] = null;
            elseif (isset($mapa[$t])) $out['tipo_secundaria'] = $mapa[$t];
            else $prob[] = 'tipo de secundaria: General, Técnica o Telesecundaria';
        }
        if (isset($opc['temporadas'])) {
            $lista = Escuela::normalizarTemporadas(preg_split('/[,;]+/', (string) ($f[$opc['temporadas']] ?? '')) ?: []);
            rsort($lista); // de la más reciente a la más antigua, como el resto del sistema
            $out['temporadas'] = $lista;
            $out['participo_antes'] = $lista !== [];
        }
        if (isset($opc['participo_antes'])) {
            $p = self::clave((string) ($f[$opc['participo_antes']] ?? ''));
            if (in_array($p, ['si', 'sí', '1', 'true'], true)) $out['participo_antes'] = true;
            elseif (in_array($p, ['no', '0', 'false', ''], true)) $out['participo_antes'] = false;
            else $prob[] = '«Ya participó» debe ser Sí o No';
            if (($out['participo_antes'] ?? false) && empty($out['temporadas'] ?? [])) $prob[] = 'si ya participó, escribe sus temporadas';
        }

        return [$out, $prob];
    }

    /** Plantilla .xlsx con el formato y una hoja de instrucciones (valores permitidos y municipios). */
    public function plantilla()
    {
        $libro = new Spreadsheet();
        $hoja = $libro->getActiveSheet()->setTitle('Escuelas');
        $hoja->fromArray([
            ['CCT', 'NOMBRE', 'MUNICIPIO', 'NIVEL', 'SISTEMA', 'EQUIPO', 'DOMICILIO', 'UBICACION', 'MATRICULA', 'HOMBRES', 'MUJERES', 'TIPO DE SECUNDARIA', 'ZONA', 'SUBSISTEMA', 'TEMPORADAS', 'YA PARTICIPO'],
            ['15EPR0001A', 'Escuela Primaria Ejemplo', 'Toluca', 'Primaria', 'Estatal', 'Los Ejemplares', 'Calle Reforma 1, Centro, Toluca', 'https://maps.app.goo.gl/XXXX', 120, 60, 60, '', '', 'ESTATAL (SEB)', '2025-2026, 2026-2027', 'Sí'],
        ]);
        foreach (['A' => 14, 'B' => 48, 'C' => 28, 'D' => 18, 'E' => 12, 'F' => 28, 'G' => 48, 'H' => 36, 'I' => 11, 'J' => 10, 'K' => 10, 'L' => 20, 'M' => 16, 'N' => 18, 'O' => 24, 'P' => 14] as $col => $w) $hoja->getColumnDimension($col)->setWidth($w);
        $hoja->getStyle('A1:P1')->getFont()->setBold(true);
        $ins = $libro->createSheet()->setTitle('Instrucciones');
        $lineas = [
            ['Llena la hoja «Escuelas» (borra la fila de ejemplo). Una escuela por fila; la CCT no se repite.'],
            ['CCT: clave del Estado de México, 10 caracteres (p. ej. 15EPR0001A).'],
            ['NIVEL: Primaria, Secundaria, Media superior o Superior.'],
            ['SISTEMA: Estatal o Federal (define si aplica transporte y box lunch).'],
            ['MUNICIPIO: uno de los 125 municipios del Estado de México (lista abajo).'],
            ['Las demás columnas son opcionales: si las quitas, la escuela conserva lo que ya tiene. Una columna que dejes vacía borra ese dato.'],
            ['UBICACION: solo enlaces https de Google Maps o Apple Maps. MATRICULA, HOMBRES y MUJERES: números enteros.'],
            ['TIPO DE SECUNDARIA: General, Técnica o Telesecundaria (solo si el nivel es Secundaria).'],
            ['TEMPORADAS: periodos escolares separados por coma (p. ej. 2025-2026, 2026-2027). YA PARTICIPO: Sí o No (si es Sí, escribe sus temporadas).'],
            [''],
            ['Municipios válidos:'],
        ];
        foreach (DB::table('codigos_postales')->distinct()->orderBy('municipio')->pluck('municipio') as $m) $lineas[] = [$m];
        $ins->fromArray($lineas);
        $ins->getColumnDimension('A')->setWidth(90);
        $libro->setActiveSheetIndex(0);

        return response()->streamDownload(function () use ($libro) {
            (new Xlsx($libro))->save('php://output');
        }, 'plantilla_escuelas_sidecyt.xlsx', ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
    }
}
