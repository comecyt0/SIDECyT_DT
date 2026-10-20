<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Convocatoria;
use App\Models\EspecieCampo;
use App\Models\EspecieConfig;
use App\Models\ProgramaDocumento;
use App\Support\Audit;
use App\Support\Especie;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * E52 · F1 — Configuración de una convocatoria de Apoyo en especie (solo admin: define la convocatoria, regla E45).
 * Límites de integrantes (incluyen al líder), clubes por escuela, participación de menores, kit, campos predefinidos
 * (pedir / obligatorio) y campos personalizados del club y del integrante. Los documentos del club son los del programa
 * (pestaña Documentos) más la carta de la escuela, que siempre se pide.
 */
class EspecieConfigController extends Controller
{
    public function show(Request $request, Convocatoria $convocatoria)
    {
        abort_unless(Especie::esEspecie($convocatoria->loadMissing('tipoPrograma')), 404);
        \App\Support\Alcance::exigirConvocatoria($request->user(), $convocatoria->id);
        $cfg = $convocatoria->especieConfig ?? new EspecieConfig();

        return response()->json(self::payloadPersonal($convocatoria, $cfg));
    }

    public function update(Request $request, Convocatoria $convocatoria)
    {
        abort_unless(Especie::esEspecie($convocatoria->loadMissing('tipoPrograma')), 404);
        $slug = 'regex:/^[a-z0-9_]+$/';
        $v = $request->validate([
            'min_integrantes' => 'required|integer|min:1|max:200',
            'max_integrantes' => 'required|integer|min:1|max:200|gte:min_integrantes',
            'clubes_por_escuela' => 'nullable|integer|min:1|max:1000',
            'participan_menores' => 'boolean',
            'modalidad' => 'sometimes|in:'.implode(',', EspecieConfig::MODALIDADES),
            'kit_nombre' => 'nullable|required_unless:modalidad,nacional,internacional|string|max:255', // 20/10/2026: sin kit fuera de estatal
            'kit_descripcion' => 'nullable|string|max:5000',
            'campos_club' => 'nullable|array',
            'campos_integrante' => 'nullable|array',
            'formatos' => 'nullable|array', // E79
            'campos' => 'present|array|max:100',
            'campos.*.ambito' => 'required|in:club,integrante',
            'campos.*.nombre_campo' => ['required', 'string', 'max:60', $slug],
            'campos.*.etiqueta' => 'required|string|max:255',
            'campos.*.tipo_campo' => 'required|in:'.implode(',', Especie::TIPOS_CAMPO),
            'campos.*.requerido' => 'boolean',
            'campos.*.opciones' => 'nullable|string|max:10000|required_if:campos.*.tipo_campo,select',
        ] + \App\Support\KitClub::reglas() // E86
            + array_map(fn ($r) => str_replace('required|array', 'sometimes|array', $r), \App\Support\EtapasEspecie::reglas())
            + \App\Support\ApoyosLogistica::reglas(),
            ['max_integrantes.gte' => 'El máximo de integrantes no puede ser menor que el mínimo.'],
            \App\Support\EtapasEspecie::atributos() + \App\Support\ApoyosLogistica::atributos());

        $vistos = [];
        foreach ($v['campos'] as $i => $c) {
            $k = $c['ambito'].'|'.$c['nombre_campo'];
            if (isset($vistos[$k])) {
                throw \Illuminate\Validation\ValidationException::withMessages(["campos.$i.nombre_campo" => 'Ese nombre ya se usa en el mismo ámbito.']);
            }
            $vistos[$k] = true;
        }

        $quitado = ['transporte' => false, 'lunch' => false];
        DB::transaction(function () use ($convocatoria, $v, &$quitado) {
            $cfg = $convocatoria->especieConfig ?? new EspecieConfig();
            // E71: transporte / box lunch / salida y fecha límite (al quitar un apoyo se ajustan las solicitudes, abajo).
            $quitado = \App\Support\ApoyosLogistica::aplicar($cfg, $v);
            $cfg->fill([
                'min_integrantes' => (int) $v['min_integrantes'],
                'max_integrantes' => (int) $v['max_integrantes'],
                'clubes_por_escuela' => $v['clubes_por_escuela'] ?? null,
                'participan_menores' => (bool) ($v['participan_menores'] ?? true),
                'modalidad' => $v['modalidad'] ?? ($cfg->modalidad ?? 'estatal'),
                'kit_nombre' => trim(strip_tags((string) ($v['kit_nombre'] ?? ''))),
                'kit_descripcion' => isset($v['kit_descripcion']) ? trim(strip_tags($v['kit_descripcion'])) : null,
                'campos_club' => Especie::normalizarPredefinidos($v['campos_club'] ?? null, Especie::CAMPOS_CLUB, Especie::DEFAULT_CLUB),
                'campos_integrante' => Especie::normalizarPredefinidos($v['campos_integrante'] ?? null, Especie::CAMPOS_INTEGRANTE, Especie::DEFAULT_INTEGRANTE),
                // E79: si el panel no manda formatos, se conservan los guardados.
                'formatos' => Especie::normalizarPredefinidos($v['formatos'] ?? $cfg->formatos, Especie::FORMATOS, Especie::DEFAULT_FORMATOS),
            ]);
            // E86: kit diferenciado (si el panel no lo manda, se conserva lo guardado). Se guarda ya normalizado.
            if (array_key_exists('kit_diferenciado', $v)) $cfg->kit_diferenciado = (bool) $v['kit_diferenciado'];
            if (array_key_exists('kits', $v)) {
                $cfg->kits = $v['kits'];
                $cfg->kits = \App\Support\KitClub::kits($cfg);
            }
            $cfg->convocatoria_id = $convocatoria->id;
            $cfg->save();

            // Los campos se reemplazan; los valores ya capturados se conservan en los JSON de cada club/integrante.
            EspecieCampo::where('convocatoria_id', $convocatoria->id)->delete();
            foreach ($v['campos'] as $i => $c) {
                $campo = new EspecieCampo([
                    'ambito' => $c['ambito'], 'nombre_campo' => $c['nombre_campo'], 'etiqueta' => trim(strip_tags($c['etiqueta'])),
                    'tipo_campo' => $c['tipo_campo'],
                    'opciones_json' => $c['tipo_campo'] === 'select' ? AsistenteConvocatoriaController::opciones($c['opciones'] ?? '') : null,
                    'requerido' => (bool) ($c['requerido'] ?? false), 'orden' => $i + 1,
                ]);
                $campo->convocatoria_id = $convocatoria->id;
                $campo->save();
            }

            // E52 · F2: etapas de revisión (con clubes ya enviados solo cambian sus datos, no la estructura).
            if (isset($v['etapas'])) {
                \App\Support\EtapasEspecie::guardar($convocatoria->id, $v['etapas']);
            }
            \App\Support\ApoyosLogistica::alQuitar($convocatoria->id, $quitado);
        });
        Audit::log('especie.config_actualizada', $convocatoria);

        return response()->json(self::payloadPersonal($convocatoria->fresh(), $convocatoria->fresh()->especieConfig));
    }

    /**
     * 20/10/2026 (pedido del usuario) — Vista previa de un formato institucional con un club de ejemplo (no se guarda nada),
     * para verlo al crear o editar la convocatoria. Se muestra dentro de la página (inline).
     */
    public function vistaPreviaFormato(Request $request, string $formato)
    {
        $club = \App\Support\FormatosClub::ejemplo();
        $datos = \App\Support\FormatosClub::datos($club);
        [$vista, $extra] = match ($formato) {
            'formato_a', 'formato_b', 'formato_c' => [\App\Support\FormatosClub::VISTAS[$formato], []],
            'carta_escuela' => ['pdfs.carta_escuela_club', []],
            'uso_imagen' => ['pdfs.formatos.uso_imagen_menor', ['persona' => $club->integrantes[2]]],
            'uso_imagen_adulto' => ['pdfs.formatos.uso_imagen_adulto', ['persona' => $club->integrantes[0]]],
            default => abort(404),
        };
        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView($vista, $datos + $extra + ['franja' => \App\Support\FormatosClub::franja()])->setPaper('letter');

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="vista-previa-'.$formato.'.pdf"',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    /** Forma común (admin y líder) de la configuración con etiquetas de los predefinidos. */
    public static function payload(Convocatoria $c, EspecieConfig $cfg): array
    {
        return [
            'convocatoria' => ['id' => $c->id, 'nombre' => $c->nombre],
            'min_integrantes' => $cfg->min_integrantes ?? 1,
            'max_integrantes' => $cfg->max_integrantes ?? 10,
            'clubes_por_escuela' => $cfg->clubes_por_escuela,
            'participan_menores' => (bool) ($cfg->participan_menores ?? true),
            'modalidad' => $cfg->modalidad ?? 'estatal',
            'kit_nombre' => $cfg->kit_nombre,
            'kit_descripcion' => $cfg->kit_descripcion,
            'campos_club' => Especie::normalizarPredefinidos($cfg->campos_club, Especie::CAMPOS_CLUB, Especie::DEFAULT_CLUB),
            'campos_integrante' => Especie::normalizarPredefinidos($cfg->campos_integrante, Especie::CAMPOS_INTEGRANTE, Especie::DEFAULT_INTEGRANTE),
            'formatos' => Especie::formatos($cfg),
            'kit_diferenciado' => (bool) $cfg->kit_diferenciado, // E86
            'kits' => \App\Support\KitClub::kits($cfg),
            'etiquetas' => ['club' => Especie::CAMPOS_CLUB, 'integrante' => Especie::CAMPOS_INTEGRANTE, 'formatos' => Especie::FORMATOS],
            'campos' => EspecieCampo::where('convocatoria_id', $c->id)->orderBy('orden')->get(['ambito', 'nombre_campo', 'etiqueta', 'tipo_campo', 'opciones_json', 'requerido', 'orden']),
            'documentos' => ProgramaDocumento::where('tipo_programa_id', $c->tipo_programa_id)->where('activo', true)->orderBy('orden')
                ->get(['clave', 'nombre', 'descripcion', 'obligatorio', 'formato_permitido', 'tamaño_maximo_mb']),
            'etapas' => \App\Support\EtapasEspecie::payload($c->id),
            'etapas_fijas' => \App\Support\EtapasEspecie::estructuraFija($c->id),
        ] + \App\Support\ApoyosLogistica::payload($cfg);
    }

    /** Para el personal: además del payload común, el estado del acta del comité (nunca el nombre interno del archivo). */
    public static function payloadPersonal(Convocatoria $c, EspecieConfig $cfg): array
    {
        return self::payload($c, $cfg) + ['acta_comite' => $cfg->acta_comite ? [
            'nombre' => $cfg->acta_comite_nombre, 'subida_at' => $cfg->acta_comite_at,
        ] : null];
    }
}
