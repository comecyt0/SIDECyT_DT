<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Traits\ValidatesBinaryMimeTypes;
use App\Models\Convocatoria;
use App\Models\TipoPrograma;
use App\Support\Audit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Banner (imagen representativa) de convocatorias y programas — E40, 24/09/2026. SOLO ADMIN: las rutas
 * viven en el grupo `prefix admin / middleware admin` de routes/api.php.
 *
 * Dos formas, mutuamente excluyentes:
 *  1. Archivo local (`banner`, multipart): JPG/PNG/WebP, ≤ 5 MB. Se valida el MIME REAL con finfo (no la
 *     extensión), las dimensiones reales con getimagesize (mínimo 600×200, máximo 6000 px por lado para no
 *     aceptar "bombas" de descompresión) y se guarda con nombre aleatorio en el disco public
 *     (`/storage/banners/{convocatorias|programas}/…`). Nunca se conserva el nombre original. SVG no:
 *     puede llevar scripts.
 *  2. Enlace (`banner_url`): solo https y solo dominios de config('comecyt.banners.hosts'), que coinciden
 *     con la CSP img-src. El servidor NO descarga la URL (sin SSRF): el navegador la pide directo.
 *
 * Al reemplazar o quitar, se borra el archivo anterior solo si era nuestro (ruta /storage/banners/…).
 */
class BannerController extends Controller
{
    use ValidatesBinaryMimeTypes;

    private const MIMES = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];

    public function storeConvocatoria(Request $request, Convocatoria $convocatoria): JsonResponse
    {
        return $this->store($request, $convocatoria, 'convocatorias', 'convocatoria');
    }

    public function destroyConvocatoria(Convocatoria $convocatoria): JsonResponse
    {
        return $this->destroy($convocatoria, 'convocatoria');
    }

    public function storePrograma(Request $request, TipoPrograma $tipoPrograma): JsonResponse
    {
        return $this->store($request, $tipoPrograma, 'programas', 'programa');
    }

    public function destroyPrograma(TipoPrograma $tipoPrograma): JsonResponse
    {
        return $this->destroy($tipoPrograma, 'programa');
    }

    private function store(Request $request, Model $model, string $dir, string $label): JsonResponse
    {
        $cfg = config('comecyt.banners');
        $hosts = $cfg['hosts'] ?? [];

        $request->validate([
            'banner' => ['nullable', 'required_without:banner_url', 'prohibits:banner_url', 'file', 'max:'.($cfg['max_kb'] ?? 5120), 'mimes:jpg,jpeg,png,webp'],
            'banner_url' => ['nullable', 'required_without:banner', 'string', 'max:500', function ($attr, $value, $fail) use ($hosts) {
                if ($value === null || $value === '') {
                    return;
                }
                $p = parse_url($value);
                if (! filter_var($value, FILTER_VALIDATE_URL) || ! $p || empty($p['host'])) {
                    $fail('Escribe un enlace completo, por ejemplo https://comecyt.edomex.gob.mx/imagen.jpg');

                    return;
                }
                if (strtolower($p['scheme'] ?? '') !== 'https') {
                    $fail('El enlace debe empezar con https://');

                    return;
                }
                if (isset($p['user']) || isset($p['pass']) || isset($p['port'])) {
                    $fail('El enlace no puede llevar usuario, contraseña ni puerto.');

                    return;
                }
                if (! in_array(strtolower($p['host']), $hosts, true)) {
                    $fail('Ese dominio no está autorizado. Usa uno de: '.implode(', ', $hosts).', o sube la imagen desde tu equipo.');
                }
            }],
        ], [
            'banner.max' => 'La imagen pesa más de '.round(($cfg['max_kb'] ?? 5120) / 1024).' MB.',
            'banner.mimes' => 'La imagen debe ser JPG, PNG o WebP.',
            'banner.prohibits' => 'Elige una sola opción: subir archivo o pegar enlace.',
            'banner.required_without' => 'Sube una imagen o pega un enlace.',
            'banner_url.required_without' => 'Sube una imagen o pega un enlace.',
        ]);

        $anterior = $model->getAttribute('banner_url');

        if ($request->hasFile('banner')) {
            $file = $request->file('banner');
            // getPathname(): en este IIS realpath() del temporal puede ser false (E28).
            $mime = $this->validateBinaryMimeType($file->getPathname(), array_keys(self::MIMES));

            $dims = @getimagesize($file->getPathname());
            if (! $dims) {
                return response()->json(['message' => 'No se pudo leer la imagen.'], 422);
            }
            [$w, $h] = $dims;
            if ($w < ($cfg['min_width'] ?? 600) || $h < ($cfg['min_height'] ?? 200)) {
                return response()->json(['message' => "La imagen es muy pequeña ({$w}×{$h}). Mínimo {$cfg['min_width']}×{$cfg['min_height']} px."], 422);
            }
            if ($w > ($cfg['max_side'] ?? 6000) || $h > ($cfg['max_side'] ?? 6000)) {
                return response()->json(['message' => "La imagen es demasiado grande ({$w}×{$h}). Máximo {$cfg['max_side']} px por lado."], 422);
            }

            $contenido = file_get_contents($file->getPathname());
            if ($contenido === false || $contenido === '') {
                return response()->json(['message' => 'No se pudo leer el archivo subido.'], 422);
            }
            $name = Str::lower(Str::random(32)).'.'.self::MIMES[$mime];
            Storage::disk('public')->put("banners/{$dir}/{$name}", $contenido);
            $nuevo = "/storage/banners/{$dir}/{$name}";
            $origen = 'archivo';
        } else {
            $nuevo = trim((string) $request->input('banner_url'));
            $origen = 'enlace';
        }

        $model->forceFill(['banner_url' => $nuevo])->save();
        $this->borrarSiEsNuestro($anterior, $nuevo);
        $this->limpiarCatalogo($model);

        Audit::log("{$label}.banner_actualizado", $model, ['origen' => $origen, 'anterior' => $anterior, 'nuevo' => $nuevo]);

        return response()->json(['message' => 'Banner actualizado.', 'banner_url' => $nuevo]);
    }

    private function destroy(Model $model, string $label): JsonResponse
    {
        $anterior = $model->getAttribute('banner_url');
        $model->forceFill(['banner_url' => null])->save();
        $this->borrarSiEsNuestro($anterior, null);
        $this->limpiarCatalogo($model);

        Audit::log("{$label}.banner_eliminado", $model, ['anterior' => $anterior]);

        return response()->json(['message' => 'Banner eliminado.', 'banner_url' => null]);
    }

    /** La ficha de programa lee del catálogo cacheado (ProgramaCatalogController, 5 min): se invalida. */
    private function limpiarCatalogo(Model $model): void
    {
        if ($model instanceof TipoPrograma) {
            \Illuminate\Support\Facades\Cache::forget("programa_config_{$model->id}");
        }
    }

    /** Borra del disco un banner anterior solo si lo subimos nosotros (ruta /storage/banners/…). */
    private function borrarSiEsNuestro(?string $anterior, ?string $nuevo): void
    {
        // La landing usa el banner del programa como respaldo: cualquier cambio invalida su caché.
        \App\Http\Controllers\Convocatorias\ConvocatoriaPublicaController::forgetCache();

        if ($anterior && $anterior !== $nuevo
            && preg_match('#^/storage/(banners/(convocatorias|programas)/[a-z0-9]+\.(jpg|png|webp))$#', $anterior, $m)) {
            Storage::disk('public')->delete($m[1]);
        }
    }
}
