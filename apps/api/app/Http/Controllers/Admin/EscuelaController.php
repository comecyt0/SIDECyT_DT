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
            $q->where(fn ($w) => $w->where('nombre', 'ilike', "%{$t}%")->orWhere('cct', 'ilike', "%{$t}%")->orWhere('municipio', 'ilike', "%{$t}%"));
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
        ], ['cct.regex' => 'La CCT debe ser del Estado de México (p. ej. 15EPR0001A).'], ['temporadas' => 'temporadas', 'temporadas.*' => 'temporada']);
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
            $datos['temporadas'] = $participo ? $temporadas : [];
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
        $nivelPorEtiqueta = [];
        foreach (self::ETIQUETA_NIVEL as $k => $v) { $nivelPorEtiqueta[self::clave($v)] = $k; $nivelPorEtiqueta[$k] = $k; }

        $creadas = 0; $actualizadas = 0; $errores = [];
        DB::transaction(function () use ($filas, $pos, $nivelPorEtiqueta, &$creadas, &$actualizadas, &$errores) {
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
                if ($prob) {
                    if (count($errores) < 200) $errores[] = ['fila' => $fila, 'cct' => mb_substr($cct, 0, 12), 'problemas' => $prob];
                    continue;
                }
                $e = Escuela::firstOrNew(['cct' => $cct]);
                $nuevo = ! $e->exists;
                $e->fill(['nombre' => $nombre, 'municipio' => $mun, 'nivel' => $nivel, 'sistema' => $sistema, 'activo' => true])->save();
                $nuevo ? $creadas++ : $actualizadas++;
            }
        });
        Audit::log('escuela.importadas', null, ['creadas' => $creadas, 'actualizadas' => $actualizadas, 'con_error' => count($errores)]);

        return response()->json(['creadas' => $creadas, 'actualizadas' => $actualizadas, 'errores' => $errores]);
    }

    /** Plantilla .xlsx con el formato y una hoja de instrucciones (valores permitidos y municipios). */
    public function plantilla()
    {
        $libro = new Spreadsheet();
        $hoja = $libro->getActiveSheet()->setTitle('Escuelas');
        $hoja->fromArray([['CCT', 'NOMBRE', 'MUNICIPIO', 'NIVEL', 'SISTEMA'], ['15EPR0001A', 'Escuela Primaria Ejemplo', 'Toluca', 'Primaria', 'Estatal']]);
        foreach (['A' => 14, 'B' => 48, 'C' => 28, 'D' => 18, 'E' => 12] as $col => $w) $hoja->getColumnDimension($col)->setWidth($w);
        $hoja->getStyle('A1:E1')->getFont()->setBold(true);
        $ins = $libro->createSheet()->setTitle('Instrucciones');
        $lineas = [
            ['Llena la hoja «Escuelas» (borra la fila de ejemplo). Una escuela por fila; la CCT no se repite.'],
            ['CCT: clave del Estado de México, 10 caracteres (p. ej. 15EPR0001A).'],
            ['NIVEL: Primaria, Secundaria, Media superior o Superior.'],
            ['SISTEMA: Estatal o Federal (define si aplica transporte y box lunch).'],
            ['MUNICIPIO: uno de los 125 municipios del Estado de México (lista abajo).'],
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
