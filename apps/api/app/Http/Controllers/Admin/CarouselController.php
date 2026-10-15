<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Traits\ValidatesBinaryMimeTypes;
use App\Models\CarouselSlide;
use App\Support\ImagenSegura;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CarouselController extends Controller
{
    use ValidatesBinaryMimeTypes;

    /** Carpeta dentro de Storage::disk('public') donde viven las imágenes subidas del carrusel. */
    private const UPLOAD_DIR = 'carousel';

    /**
     * POST /admin/carousel/upload  (multipart: `imagen`)
     *
     * Sube una imagen local del administrador y devuelve la ruta RELATIVA `/storage/carousel/<hash>.<ext>`
     * para pegarla en `imagen_url`. Relativa a propósito: la misma URL sirve por el dominio y por la IP
     * interna, y la CSP `img-src 'self'` la cubre sin abrir orígenes. Se valida el MIME real con
     * finfo (no la extensión) y se renombra con un hash — nunca se conserva el nombre original.
     * 14/09/2026, a pedido del usuario. Ver docs/DISENO_UI.md §Carrusel.
     */
    public function upload(Request $request)
    {
        $request->validate([
            'imagen' => 'required|file|max:8192|mimes:jpg,jpeg,png,webp',
        ]);

        $file = $request->file('imagen');
        // getPathname(), no getRealPath(): en Windows/IIS realpath del temporal puede devolver false.
        $this->validateBinaryMimeType($file->getPathname(), ['image/jpeg', 'image/png', 'image/webp']);

        // E74: siempre WebP re-codificado (sin EXIF/GPS ni metadatos), lado mayor ≤ 2400 px. Es pública en /storage.
        $contenido = ImagenSegura::aWebp($file, 2400, 82);
        $name = Str::lower(Str::random(24)).'.webp';

        // No usar putFileAs(): por dentro hace fopen($file->getRealPath()) y en este IIS realpath()
        // del temporal devuelve false → "Path must not be empty" (E28). Se escribe el contenido directo.
        Storage::disk('public')->put(self::UPLOAD_DIR.'/'.$name, $contenido);

        return response()->json([
            'message' => 'Imagen subida.',
            'imagen_url' => '/storage/'.self::UPLOAD_DIR.'/'.$name,
            'mime' => 'image/webp',
            'size' => strlen($contenido),
        ], 201);
    }

    /**
     * SEV-1 — Allowlist de hostnames permitidos en `imagen_url`.
     * Mitiga SSRF y abuso del carrusel público (login) como vector de tracking
     * cross-site / oracle de SSRF interno.
     *
     * Para subir imágenes propias, preferir upload a Storage::disk('public') y
     * servir desde el dominio institucional (sin URL externa).
     */
    protected function allowedImageHosts(): array
    {
        $appHost = parse_url((string) config('app.url'), PHP_URL_HOST);

        $hosts = array_filter([
            'picsum.photos',
            'images.comecyt.gob.mx',
            $appHost,
        ]);

        // Permitir subdominios *.edomex.gob.mx mediante callback abajo.
        return array_values(array_unique($hosts));
    }

    protected function imageUrlRules(bool $required = false): array
    {
        $rule = [
            $required ? 'required' : 'nullable',
            'string',
            'max:500',
            function ($attr, $value, $fail) {
                if (! $value) {
                    return;
                }
                // Imagen subida desde el panel: ruta relativa propia, sin host → no hay SSRF posible.
                if (preg_match('#^/storage/'.self::UPLOAD_DIR.'/[a-z0-9]+\.(jpg|png|webp)$#', $value)) {
                    return;
                }
                if (! filter_var($value, FILTER_VALIDATE_URL)) {
                    $fail('Debe ser una URL http(s) o una imagen subida desde el panel.');
                    return;
                }
                $parsed = parse_url($value);
                if (! $parsed || empty($parsed['scheme']) || empty($parsed['host'])) {
                    $fail('URL de imagen inválida.');
                    return;
                }
                if (! in_array(strtolower($parsed['scheme']), ['http', 'https'], true)) {
                    $fail('Esquema de URL no permitido. Sólo http/https.');
                    return;
                }
                $host = strtolower($parsed['host']);
                $allowed = $this->allowedImageHosts();
                $matchesExact = in_array($host, $allowed, true);
                $matchesEdomex = (bool) preg_match('/^[a-z0-9-]+\.edomex\.gob\.mx$/i', $host)
                    || $host === 'edomex.gob.mx';
                if (! $matchesExact && ! $matchesEdomex) {
                    $fail('Dominio de imagen no autorizado. Hosts permitidos: '.implode(', ', $allowed).' o *.edomex.gob.mx');
                }
            },
        ];

        return $rule;
    }

    /**
     * Público (login): diapositivas activas en orden. 28/09/2026 (E50): lista blanca de campos armada a mano
     * (antes serializaba el modelo completo, contra la regla §0 de endpoints públicos) y throttle en la ruta.
     */
    public function publicIndex()
    {
        $slides = CarouselSlide::where('activo', true)->orderBy('orden')->limit(20)->get()
            ->map(fn (CarouselSlide $s) => [
                'id' => $s->id,
                'titulo' => $s->titulo,
                'subtitulo' => $s->subtitulo,
                'descripcion' => $s->descripcion,
                'imagen_url' => $s->imagen_url,
                'badge_texto' => $s->badge_texto,
                'orden' => $s->orden,
                'activo' => true,
                'ajuste' => $s->ajuste ?? 'completa',
                'foco_x' => $s->foco_x ?? 50,
                'foco_y' => $s->foco_y ?? 50,
                'zoom' => $s->zoom ?? 100,
                'fondo' => $s->fondo ?? 'desenfoque',
                'margen' => $s->margen ?? 0,
                'mostrar_textos' => (bool) ($s->mostrar_textos ?? true),
            ])->values();

        return response()->json($slides);
    }

    /** E50: reglas del encuadre (compartidas por alta y edición). */
    private function reglasEncuadre(): array
    {
        return [
            'ajuste' => ['sometimes', 'in:'.implode(',', CarouselSlide::AJUSTES)],
            'foco_x' => 'sometimes|integer|min:0|max:100',
            'foco_y' => 'sometimes|integer|min:0|max:100',
            'zoom' => 'sometimes|integer|min:100|max:300',
            'fondo' => ['sometimes', 'in:'.implode(',', CarouselSlide::FONDOS)],
            'margen' => 'sometimes|integer|min:0|max:30',
            'mostrar_textos' => 'sometimes|boolean',
        ];
    }

    /** Admin: list all slides */
    public function index()
    {
        return response()->json(CarouselSlide::orderBy('orden')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'titulo' => 'required|string|max:150',
            'subtitulo' => 'nullable|string|max:200',
            'descripcion' => 'nullable|string',
            'imagen_url' => $this->imageUrlRules(false),
            'badge_texto' => 'nullable|string|max:100',
            'orden' => 'nullable|integer|min:0',
            'activo' => 'boolean',
        ] + $this->reglasEncuadre());

        $slide = CarouselSlide::create($validated);

        return response()->json(['message' => 'Slide creado.', 'slide' => $slide], 201);
    }

    public function update(Request $request, CarouselSlide $carouselSlide)
    {
        $validated = $request->validate([
            'titulo' => 'string|max:150',
            'subtitulo' => 'nullable|string|max:200',
            'descripcion' => 'nullable|string',
            'imagen_url' => $this->imageUrlRules(false),
            'badge_texto' => 'nullable|string|max:100',
            'orden' => 'nullable|integer|min:0',
            'activo' => 'boolean',
        ] + $this->reglasEncuadre());

        $carouselSlide->update($validated);

        return response()->json(['message' => 'Slide actualizado.', 'slide' => $carouselSlide]);
    }

    public function destroy(CarouselSlide $carouselSlide)
    {
        $carouselSlide->delete();

        return response()->json(['message' => 'Slide eliminado.']);
    }
}
