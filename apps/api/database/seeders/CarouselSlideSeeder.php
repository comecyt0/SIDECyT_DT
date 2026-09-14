<?php

namespace Database\Seeders;

use App\Models\CarouselSlide;
use Illuminate\Database\Seeder;

class CarouselSlideSeeder extends Seeder
{
    public function run(): void
    {
        CarouselSlide::truncate();

        // Sin imágenes externas: el front-end muestra los slides con gradiente
        // institucional + mesh decorativo cuando `imagen_url` está vacío.
        // El admin sube imágenes propias desde /admin/carrusel y se guardan
        // en apps/web/public/carrusel/ (servidas desde el mismo dominio).
        $slides = [
            [
                'titulo' => 'Gestión de Proyectos de Desarrollo Tecnológico',
                'subtitulo' => 'Plataforma Integral de Vinculación',
                'descripcion' => 'Administra el ciclo completo de tus proyectos de investigación y desarrollo tecnológico con transparencia y eficiencia.',
                'imagen_url' => null,
                'badge_texto' => 'Desarrollo Tecnológico',
                'orden' => 1,
                'activo' => true,
            ],
            [
                'titulo' => 'Vinculación Institucional y Científica',
                'subtitulo' => 'Conectando Instituciones con la Innovación',
                'descripcion' => 'Fortalece la colaboración entre universidades, centros de investigación y el sector productivo.',
                'imagen_url' => null,
                'badge_texto' => 'Red Científica',
                'orden' => 2,
                'activo' => true,
            ],
            [
                'titulo' => 'Evaluación Técnica Transparente',
                'subtitulo' => 'Dictámenes con Rigor Académico',
                'descripcion' => 'Sistema de evaluación por pares especialistas con criterios objetivos, garantizando la calidad de los proyectos apoyados.',
                'imagen_url' => null,
                'badge_texto' => 'Evaluación',
                'orden' => 3,
                'activo' => true,
            ],
            [
                'titulo' => 'Fondos para la Innovación',
                'subtitulo' => 'Ministraciones Ágiles y Seguras',
                'descripcion' => 'Gestión eficiente de recursos públicos para impulsar el desarrollo científico y tecnológico.',
                'imagen_url' => null,
                'badge_texto' => 'Apoyo Institucional',
                'orden' => 4,
                'activo' => true,
            ],
        ];

        foreach ($slides as $slide) {
            CarouselSlide::create($slide);
        }
    }
}
