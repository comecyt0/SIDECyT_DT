<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CarouselSlide;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CarouselController extends Controller
{
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
            'url',
            function ($attr, $value, $fail) {
                if (! $value) {
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

    /** Public: list active slides ordered */
    public function publicIndex()
    {
        $slides = CarouselSlide::where('activo', true)
            ->orderBy('orden')
            ->get();

        return response()->json($slides);
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
        ]);

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
        ]);

        $carouselSlide->update($validated);

        return response()->json(['message' => 'Slide actualizado.', 'slide' => $carouselSlide]);
    }

    public function destroy(CarouselSlide $carouselSlide)
    {
        $carouselSlide->delete();

        return response()->json(['message' => 'Slide eliminado.']);
    }
}
