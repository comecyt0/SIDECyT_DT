<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Convocatoria;
use App\Models\ConvocatoriaBorrador;
use App\Models\ProgramaCampo;
use App\Models\ProgramaCriterioEvaluacion;
use App\Models\ProgramaDocumento;
use App\Models\ProgramaRubro;
use App\Models\TipoPrograma;
use App\Support\Audit;
use App\Support\TiposArchivo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * E47 (24/09/2026) — Asistente "Nueva convocatoria": guardado ATÓMICO y borradores.
 *
 * Antes el asistente hacía 6+ peticiones seguidas (programa, cada campo, documento, rubro, criterio y al final la
 * convocatoria). Si una fallaba a medio camino (p. ej. un criterio de más de 255 caracteres) el programa ya estaba
 * creado y quedaba huérfano, y al reintentar la clave del programa "ya existía": no había forma de terminar. Además
 * se perdían datos en silencio (opciones de las listas y % de los rubros viajaban con nombres que el backend no leía).
 *
 * Ahora: una sola petición, validación completa con errores por campo (ruta tipo `criterios.0.nombre`) y todo en una
 * transacción — se crea todo o nada. Los borradores guardan lo capturado en el servidor, por usuario.
 */
class AsistenteConvocatoriaController extends Controller
{
    /** Tope del JSON de un borrador (evita usar la tabla como almacenamiento arbitrario). */
    private const MAX_BORRADOR_BYTES = 262144;

    private const MAX_BORRADORES_POR_USUARIO = 20;

    // ─────────────────────────── Borradores ───────────────────────────

    public function borradores(Request $request)
    {
        return response()->json(
            ConvocatoriaBorrador::where('user_id', $request->user()->id)
                ->orderByDesc('updated_at')
                ->get(['id', 'nombre', 'paso', 'created_at', 'updated_at'])
        );
    }

    public function borrador(Request $request, int $id)
    {
        return response()->json($this->propio($request, $id));
    }

    public function guardarBorrador(Request $request, ?int $id = null)
    {
        // Primero la propiedad: un borrador ajeno da 404 antes de mirar el cuerpo.
        $existente = $id ? $this->propio($request, $id) : null;

        $data = $request->validate([
            'paso' => 'required|integer|min:1|max:7',
            'datos' => 'required|array',
        ]);
        $json = json_encode($data['datos']);
        if ($json === false || strlen($json) > self::MAX_BORRADOR_BYTES) {
            throw ValidationException::withMessages(['datos' => 'El borrador es demasiado grande para guardarse.']);
        }

        // El asistente envía {v, state: {...}}; se acepta también el estado suelto.
        $nombre = data_get($data['datos'], 'state.convocatoria.nombre', data_get($data['datos'], 'convocatoria.nombre', ''));
        $nombre = trim(is_string($nombre) ? $nombre : '');
        $nombre = $nombre !== '' ? mb_substr(strip_tags($nombre), 0, 255) : null;

        if ($existente) {
            $b = $existente;
        } else {
            if (ConvocatoriaBorrador::where('user_id', $request->user()->id)->count() >= self::MAX_BORRADORES_POR_USUARIO) {
                throw ValidationException::withMessages(['datos' => 'Tienes demasiados borradores. Elimina alguno en Convocatorias → Borradores.']);
            }
            $b = new ConvocatoriaBorrador;
            $b->forceFill(['user_id' => $request->user()->id]);
        }
        $b->fill(['nombre' => $nombre, 'paso' => $data['paso'], 'datos' => $data['datos']])->save();

        return response()->json(['id' => $b->id, 'updated_at' => $b->updated_at], $id ? 200 : 201);
    }

    public function eliminarBorrador(Request $request, int $id)
    {
        $this->propio($request, $id)->delete();

        return response()->json(['message' => 'Borrador eliminado.']);
    }

    /** Solo el dueño; a cualquier otro 404 (no confirma que exista). */
    private function propio(Request $request, int $id): ConvocatoriaBorrador
    {
        return ConvocatoriaBorrador::where('id', $id)->where('user_id', $request->user()->id)->firstOrFail();
    }

    // ─────────────────────────── Crear (atómico) ───────────────────────────

    public function crear(Request $request)
    {
        // Reglas por campo + reglas entre campos en UNA pasada: el admin ve todos los errores juntos.
        $validator = Validator::make($request->all(), $this->reglas(), [], $this->atributos());
        $validator->after(function ($validator) use ($request) {
            foreach ($this->erroresDeCoherencia($request->all()) as $campo => $mensaje) {
                $validator->errors()->add($campo, $mensaje);
            }
        });
        $v = $validator->validate();

        $resultado = DB::transaction(function () use ($v) {
            $p = $v['programa'];
            $programa = TipoPrograma::create([
                'clave' => $p['clave'],
                'nombre' => $p['nombre'],
                'tipo_apoyo' => $p['tipo_apoyo'],
                'monto_maximo' => $p['monto_maximo'],
                'tiene_etapas' => (bool) ($p['tiene_etapas'] ?? false),
                'num_etapas' => ($p['tiene_etapas'] ?? false) ? (int) $p['num_etapas'] : 1,
                'tiene_equipo' => (bool) ($p['tiene_equipo'] ?? false),
                'min_miembros_equipo' => ($p['tiene_equipo'] ?? false) ? (int) $p['min_miembros_equipo'] : null,
                'max_miembros_equipo' => ($p['tiene_equipo'] ?? false) ? (int) $p['max_miembros_equipo'] : null,
                'requiere_evaluacion_tecnica' => (bool) ($p['requiere_evaluacion_tecnica'] ?? true),
                'puntaje_minimo_aprobatorio' => $p['puntaje_minimo_aprobatorio'],
                'activo' => true,
            ]);

            foreach ($v['campos'] as $i => $c) {
                ProgramaCampo::create([
                    'tipo_programa_id' => $programa->id,
                    'nombre_campo' => $c['nombre_campo'],
                    'etiqueta' => $c['etiqueta'],
                    'tipo_campo' => $c['tipo_campo'],
                    // Mismo formato que lee el formulario del solicitante (DynamicFieldRenderer): [{id, label}]
                    'opciones_json' => $c['tipo_campo'] === 'select' ? self::opciones($c['opciones'] ?? '') : null,
                    'orden' => (int) ($c['orden'] ?? $i + 1),
                    'requerido' => (bool) ($c['requerido'] ?? false),
                    'activo' => true,
                ]);
            }

            foreach ($v['documentos'] as $i => $d) {
                ProgramaDocumento::create([
                    'tipo_programa_id' => $programa->id,
                    'clave' => $d['clave'],
                    'nombre' => $d['nombre'],
                    'descripcion' => $d['descripcion'] ?? null,
                    'obligatorio' => (bool) ($d['obligatorio'] ?? false),
                    'orden' => (int) ($d['orden'] ?? $i + 1),
                    'formato_permitido' => implode(',', TiposArchivo::normalizar($d['formatos'] ?? null)),
                    'tamaño_maximo_mb' => TiposArchivo::limiteMb($d['tamano_mb'] ?? 5),
                    'activo' => true,
                ]);
            }

            foreach ($v['rubros'] as $r) {
                ProgramaRubro::create([
                    'tipo_programa_id' => $programa->id,
                    'clave' => $r['clave'],
                    'nombre' => $r['nombre'],
                    'descripcion' => $r['descripcion'] ?? null,
                    'porcentaje_maximo' => $r['porcentaje_maximo'] ?? null,
                    'activo' => true,
                ]);
            }

            foreach ($v['criterios'] as $i => $c) {
                ProgramaCriterioEvaluacion::create([
                    'tipo_programa_id' => $programa->id,
                    'nombre' => $c['nombre'],
                    'descripcion' => $c['descripcion'] ?? null,
                    'ponderacion' => $c['ponderacion'],
                    'puntaje_maximo' => $c['puntaje_maximo'],
                    'orden' => (int) ($c['orden'] ?? $i + 1),
                    'activo' => true,
                ]);
            }

            $cv = $v['convocatoria'];
            // E40: se publica como 'activa'; lo que ve el público (próxima/abierta/cerrada) sale de las fechas.
            $convocatoria = Convocatoria::create([
                'nombre' => $cv['nombre'],
                'ejercicio_fiscal' => $cv['ejercicio_fiscal'],
                'periodo_id' => $cv['periodo_id'] ?? null,
                'descripcion' => $cv['descripcion'] ?? null,
                'fecha_apertura' => $cv['fecha_apertura'],
                'fecha_cierre' => $cv['fecha_cierre'],
                'monto_maximo_apoyo' => $cv['monto_maximo_apoyo'],
                'porcentaje_aportacion_minima' => $cv['porcentaje_aportacion_minima'],
                'estado' => 'activa',
                'tipo_programa_id' => $programa->id,
            ]);

            return [$convocatoria, $programa];
        });

        [$convocatoria, $programa] = $resultado;

        // El borrador ya cumplió su función (solo si es del mismo usuario).
        if (! empty($v['borrador_id'])) {
            ConvocatoriaBorrador::where('id', $v['borrador_id'])->where('user_id', $request->user()->id)->delete();
        }

        Audit::log('convocatoria.creada_asistente', $convocatoria, ['tipo_programa_id' => $programa->id]);

        return response()->json([
            'message' => 'Convocatoria creada con éxito',
            'convocatoria' => ['id' => $convocatoria->id, 'nombre' => $convocatoria->nombre],
        ], 201);
    }

    /** "Opción 1\nOpción 2" (o lista) → [{id:1,label:"Opción 1"}, ...], sin vacíos ni repetidas, máx. 100. */
    public static function opciones(string|array $texto): array
    {
        $lineas = is_array($texto) ? $texto : preg_split('/\R/u', $texto);
        $vistas = [];
        $out = [];
        foreach ($lineas as $l) {
            $l = trim(strip_tags(is_array($l) ? (string) ($l['label'] ?? '') : (string) $l));
            if ($l === '' || isset($vistas[mb_strtolower($l)])) {
                continue;
            }
            $vistas[mb_strtolower($l)] = true;
            $out[] = ['id' => count($out) + 1, 'label' => mb_substr($l, 0, 255)];
            if (count($out) >= 100) {
                break;
            }
        }

        return $out;
    }

    private function reglas(): array
    {
        $slug = 'regex:/^[a-z0-9_]+$/';

        return [
            'borrador_id' => 'nullable|integer',

            'convocatoria' => 'required|array',
            'convocatoria.nombre' => 'required|string|max:255',
            'convocatoria.ejercicio_fiscal' => 'required|digits:4',
            'convocatoria.periodo_id' => 'nullable|integer|exists:periodos,id',
            'convocatoria.descripcion' => 'nullable|string|max:10000',
            'convocatoria.fecha_apertura' => 'required|date_format:Y-m-d',
            'convocatoria.fecha_cierre' => 'required|date_format:Y-m-d|after_or_equal:convocatoria.fecha_apertura',
            'convocatoria.monto_maximo_apoyo' => 'required|numeric|min:1|max:9999999999',
            'convocatoria.porcentaje_aportacion_minima' => 'required|numeric|min:0|max:100',

            'programa' => 'required|array',
            'programa.clave' => ['required', 'string', 'max:20', 'regex:/^[A-Za-z0-9_\-\/.]+$/', Rule::unique('tipo_programas', 'clave')],
            'programa.nombre' => 'required|string|max:255',
            'programa.tipo_apoyo' => 'required|in:reembolso,concurrente,honorarios',
            'programa.monto_maximo' => 'required|numeric|min:1000|max:9999999999',
            'programa.tiene_etapas' => 'boolean',
            'programa.num_etapas' => 'required_if:programa.tiene_etapas,true|nullable|integer|min:1|max:10',
            'programa.tiene_equipo' => 'boolean',
            'programa.min_miembros_equipo' => 'required_if:programa.tiene_equipo,true|nullable|integer|min:1|max:50',
            'programa.max_miembros_equipo' => 'required_if:programa.tiene_equipo,true|nullable|integer|min:1|max:50',
            'programa.requiere_evaluacion_tecnica' => 'boolean',
            'programa.puntaje_minimo_aprobatorio' => 'required|numeric|min:0|max:100',

            'campos' => 'required|array|min:1|max:100',
            'campos.*.nombre_campo' => ['required', 'string', 'max:100', $slug, 'distinct'],
            'campos.*.etiqueta' => 'required|string|max:255',
            'campos.*.tipo_campo' => 'required|in:text,number,textarea,date,select',
            'campos.*.requerido' => 'boolean',
            'campos.*.orden' => 'nullable|integer|min:1|max:1000',
            'campos.*.opciones' => 'nullable|string|max:10000|required_if:campos.*.tipo_campo,select',

            'documentos' => 'required|array|min:1|max:50',
            'documentos.*.clave' => ['required', 'string', 'max:100', $slug, 'distinct'],
            'documentos.*.nombre' => 'required|string|max:255',
            'documentos.*.descripcion' => 'nullable|string|max:5000',
            'documentos.*.obligatorio' => 'boolean',
            'documentos.*.orden' => 'nullable|integer|min:0|max:1000',
            'documentos.*.formatos' => 'nullable|array|max:4',
            'documentos.*.formatos.*' => 'string|in:'.implode(',', TiposArchivo::TIPOS),
            'documentos.*.tamano_mb' => 'nullable|integer|min:1|max:'.TiposArchivo::TAMANO_MAX_MB,

            'rubros' => 'required|array|min:1|max:50',
            'rubros.*.clave' => ['required', 'string', 'max:50', 'distinct'],
            'rubros.*.nombre' => 'required|string|max:255',
            'rubros.*.descripcion' => 'nullable|string|max:5000',
            'rubros.*.porcentaje_maximo' => 'nullable|numeric|min:0|max:100',

            'criterios' => 'required|array|min:1|max:50',
            'criterios.*.nombre' => 'required|string|max:255',
            'criterios.*.descripcion' => 'nullable|string|max:10000',
            'criterios.*.ponderacion' => 'required|numeric|min:0|max:100',
            'criterios.*.puntaje_maximo' => 'required|numeric|min:1|max:100',
            'criterios.*.orden' => 'nullable|integer|min:1|max:1000',
        ];
    }

    /**
     * Reglas entre campos que la validación por regla no cubre. Recibe la entrada cruda (puede venir incompleta o con
     * tipos raros): todo se lee con comprobaciones de tipo.
     */
    private function erroresDeCoherencia(array $in): array
    {
        $errores = [];
        $criterios = is_array($in['criterios'] ?? null) ? $in['criterios'] : [];
        if ($criterios) {
            $suma = 0.0;
            foreach ($criterios as $c) {
                $suma += is_array($c) && is_numeric($c['ponderacion'] ?? null) ? (float) $c['ponderacion'] : 0;
            }
            if (abs($suma - 100) > 0.01) {
                $errores['criterios'] = 'La suma de las ponderaciones de los criterios debe ser 100 (ahora es '.round($suma, 2).').';
            }
        }
        $p = is_array($in['programa'] ?? null) ? $in['programa'] : [];
        if (filter_var($p['tiene_equipo'] ?? false, FILTER_VALIDATE_BOOLEAN)
            && is_numeric($p['min_miembros_equipo'] ?? null) && is_numeric($p['max_miembros_equipo'] ?? null)
            && (int) $p['min_miembros_equipo'] > (int) $p['max_miembros_equipo']) {
            $errores['programa.max_miembros_equipo'] = 'El máximo de integrantes no puede ser menor que el mínimo.';
        }
        foreach ((is_array($in['campos'] ?? null) ? $in['campos'] : []) as $i => $c) {
            if (is_array($c) && ($c['tipo_campo'] ?? null) === 'select'
                && is_string($c['opciones'] ?? null) && count(self::opciones($c['opciones'])) === 0) {
                $errores["campos.$i.opciones"] = 'La pregunta de lista necesita al menos una opción.';
            }
        }

        return $errores;
    }

    private function atributos(): array
    {
        return [
            'convocatoria.nombre' => 'nombre de la convocatoria',
            'convocatoria.ejercicio_fiscal' => 'ejercicio fiscal',
            'convocatoria.periodo_id' => 'periodo',
            'convocatoria.fecha_apertura' => 'fecha de apertura',
            'convocatoria.fecha_cierre' => 'fecha de cierre',
            'convocatoria.monto_maximo_apoyo' => 'apoyo máximo',
            'convocatoria.porcentaje_aportacion_minima' => 'aportación concurrente',
            'programa.clave' => 'clave del programa',
            'programa.nombre' => 'nombre del programa',
            'programa.tipo_apoyo' => 'forma del apoyo',
            'programa.monto_maximo' => 'monto máximo del programa',
            'programa.num_etapas' => 'número de etapas',
            'programa.min_miembros_equipo' => 'mínimo de integrantes',
            'programa.max_miembros_equipo' => 'máximo de integrantes',
            'programa.puntaje_minimo_aprobatorio' => 'calificación mínima',
            'campos' => 'preguntas',
            'campos.*.nombre_campo' => 'identificador de la pregunta',
            'campos.*.etiqueta' => 'texto de la pregunta',
            'campos.*.tipo_campo' => 'tipo de respuesta',
            'campos.*.opciones' => 'opciones de la lista',
            'documentos' => 'documentos',
            'documentos.*.clave' => 'identificador del documento',
            'documentos.*.nombre' => 'nombre del documento',
            'documentos.*.descripcion' => 'descripción del documento',
            'documentos.*.tamano_mb' => 'tamaño máximo del documento',
            'rubros' => 'conceptos de gasto',
            'rubros.*.clave' => 'clave del concepto de gasto',
            'rubros.*.nombre' => 'nombre del concepto de gasto',
            'rubros.*.porcentaje_maximo' => 'porcentaje máximo del concepto de gasto',
            'criterios' => 'criterios',
            'criterios.*.nombre' => 'nombre del criterio',
            'criterios.*.descripcion' => 'descripción del criterio',
            'criterios.*.ponderacion' => 'ponderación del criterio',
            'criterios.*.puntaje_maximo' => 'puntaje máximo del criterio',
        ];
    }
}
