<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContenidoSitio;
use App\Models\ProgramaPublico;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * E49 (25/09/2026) — Contenido público de las landings de SIDECyT, solo admin general.
 * Programas por sistema (sigae | sicei) y listas por clave (sectores, documentos, notas).
 */
class ContenidoSitioController extends Controller
{
    /** Dominios permitidos para el enlace "página oficial" de un programa (https, sin usuario ni puerto). */
    public const HOSTS_ENLACE = ['comecyt.edomex.gob.mx', 'sidecyt-comecyt.edomex.gob.mx', 'edomex.gob.mx'];

    // ───────────── Programas ─────────────

    public function programas(Request $request)
    {
        $sistema = $request->query('sistema');
        // E54: cuántas convocatorias tiene cada programa (el asistente y /admin/sitio lo muestran).
        $q = ProgramaPublico::query()->withCount('convocatorias')->orderBy('sistema')->orderBy('orden')->orderBy('id');
        if (is_string($sistema) && in_array($sistema, ProgramaPublico::SISTEMAS, true)) {
            $q->where('sistema', $sistema);
        }

        return response()->json($q->get());
    }

    public function guardarPrograma(Request $request, ?ProgramaPublico $programa = null)
    {
        $v = $request->validate([
            'sistema' => [$programa ? 'sometimes' : 'required', Rule::in(ProgramaPublico::SISTEMAS)],
            'nombre' => [$programa ? 'sometimes' : 'required', 'string', 'max:255'],
            'dirigido_a' => 'nullable|string|max:400',
            'resumen' => 'nullable|string|max:1200',
            'correo' => 'nullable|email:rfc|max:150',
            'telefono' => ['nullable', 'string', 'max:60', 'regex:/^[0-9+()\s.\-extEXT]*$/'],
            'url_info' => ['nullable', 'string', 'max:500'],
            'icono' => ['sometimes', Rule::in(ProgramaPublico::ICONOS)],
            'tono' => ['sometimes', Rule::in(ProgramaPublico::TONOS)],
            'orden' => 'sometimes|integer|min:0|max:999',
            'activo' => 'sometimes|boolean',
        ], [], [
            'nombre' => 'nombre del programa', 'dirigido_a' => 'a quién va dirigido', 'resumen' => 'descripción',
            'correo' => 'correo de contacto', 'telefono' => 'teléfono', 'url_info' => 'página oficial',
        ]);

        if (array_key_exists('url_info', $v)) {
            $v['url_info'] = self::enlaceSeguro($v['url_info']);
        }
        foreach (['nombre', 'dirigido_a', 'resumen', 'telefono'] as $c) {
            if (isset($v[$c]) && is_string($v[$c])) {
                $v[$c] = trim(strip_tags($v[$c]));
            }
        }

        $nuevo = ! $programa;
        // E54: sin dos programas con el mismo nombre en un sistema (ignora mayúsculas, acentos y espacios).
        $sistemaFinal = $v['sistema'] ?? $programa?->sistema;
        $nombreFinal = $v['nombre'] ?? $programa?->nombre;
        if ($sistemaFinal && $nombreFinal && ProgramaPublico::nombreOcupado($sistemaFinal, $nombreFinal, $programa?->id)) {
            throw ValidationException::withMessages(['nombre' => 'Ya existe un programa con ese nombre en este sistema.']);
        }
        $programa ??= new ProgramaPublico;
        if ($nuevo && ! isset($v['orden'])) {
            $v['orden'] = (int) ProgramaPublico::where('sistema', $v['sistema'])->max('orden') + 1;
        }
        $programa->fill($v);
        $programa->forceFill(['actualizado_por' => $request->user()->id])->save();

        Audit::log($nuevo ? 'sitio.programa_creado' : 'sitio.programa_actualizado', $programa, ['sistema' => $programa->sistema]);

        return response()->json($programa->fresh(), $nuevo ? 201 : 200);
    }

    public function eliminarPrograma(ProgramaPublico $programa)
    {
        // E54: un programa con convocatorias no se borra (perderían su programa); se oculta.
        if ($programa->convocatorias()->exists()) {
            throw ValidationException::withMessages(['programa' => 'Este programa tiene convocatorias asociadas: ocúltalo en lugar de eliminarlo.']);
        }
        Audit::log('sitio.programa_eliminado', $programa, ['nombre' => $programa->nombre, 'sistema' => $programa->sistema]);
        $programa->delete();

        return response()->json(['message' => 'Programa eliminado.']);
    }

    /** Reordena los programas de un sistema: { sistema, ids: [..] } en el orden deseado. */
    public function ordenar(Request $request)
    {
        $v = $request->validate([
            'sistema' => ['required', Rule::in(ProgramaPublico::SISTEMAS)],
            'ids' => 'required|array|max:200',
            'ids.*' => 'integer|distinct',
        ]);
        $propios = ProgramaPublico::where('sistema', $v['sistema'])->pluck('id')->all();
        if (array_diff($v['ids'], $propios)) {
            throw ValidationException::withMessages(['ids' => 'Hay programas que no pertenecen a ese sistema.']);
        }
        DB::transaction(function () use ($v) {
            foreach (array_values($v['ids']) as $i => $id) {
                ProgramaPublico::whereKey($id)->first()?->forceFill(['orden' => $i + 1])->save();
            }
        });
        Audit::log('sitio.programas_ordenados', null, ['sistema' => $v['sistema']]);

        return response()->json(['message' => 'Orden guardado.']);
    }

    // ───────────── Listas por clave ─────────────

    public function contenido(string $clave)
    {
        abort_unless(isset(ContenidoSitio::CLAVES[$clave]), 404);

        return response()->json(['clave' => $clave, 'valor' => ContenidoSitio::valor($clave)]);
    }

    public function guardarContenido(Request $request, string $clave)
    {
        abort_unless(isset(ContenidoSitio::CLAVES[$clave]), 404);
        $def = ContenidoSitio::CLAVES[$clave];
        $reglas = ['valor' => "present|array|max:{$def['max']}"];
        if ($def['tipo'] === 'lista') {
            // nullable: una línea vacía llega como null (ConvertEmptyStringsToNull) y se descarta abajo, no invalida la lista.
            $reglas['valor.*'] = "nullable|string|max:{$def['largo']}";
        } else {
            $reglas['valor.*.titulo'] = 'required|string|max:120';
            $reglas['valor.*.detalle'] = "nullable|string|max:{$def['largo']}";
        }
        $v = $request->validate($reglas, [], ['valor.*' => 'elemento', 'valor.*.titulo' => 'título', 'valor.*.detalle' => 'detalle']);

        // Limpieza: texto plano, sin vacíos ni repetidos.
        $valor = $def['tipo'] === 'lista'
            ? array_values(array_unique(array_filter(array_map(fn ($s) => trim(strip_tags((string) $s)), $v['valor']), fn ($s) => $s !== '')))
            : array_values(array_map(fn ($d) => ['titulo' => trim(strip_tags((string) $d['titulo'])), 'detalle' => trim(strip_tags((string) ($d['detalle'] ?? '')))], $v['valor']));

        $c = ContenidoSitio::firstOrNew(['clave' => $clave]);
        $c->valor = $valor;
        $c->forceFill(['actualizado_por' => $request->user()->id])->save();
        Audit::log('sitio.contenido_actualizado', $c, ['clave' => $clave, 'elementos' => count($valor)]);

        return response()->json(['clave' => $clave, 'valor' => $valor]);
    }

    /** null si vacío; https de un dominio permitido; cualquier otra cosa → 422. */
    public static function enlaceSeguro(?string $url): ?string
    {
        $url = is_string($url) ? trim($url) : '';
        if ($url === '') {
            return null;
        }
        $p = parse_url($url);
        $ok = $p && ($p['scheme'] ?? '') === 'https' && empty($p['user']) && empty($p['pass']) && empty($p['port'])
            && in_array(strtolower($p['host'] ?? ''), self::HOSTS_ENLACE, true);
        if (! $ok) {
            throw ValidationException::withMessages(['url_info' => 'La página oficial debe ser un enlace https de '.implode(', ', self::HOSTS_ENLACE).'.']);
        }

        return $url;
    }
}
