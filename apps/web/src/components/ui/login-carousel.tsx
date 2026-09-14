'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { INSTITUTION } from '@/lib/institution';

interface CarouselSlide {
  id: number;
  titulo: string;
  subtitulo?: string;
  descripcion?: string;
  imagen_url?: string;
  badge_texto?: string;
  orden: number;
  activo: boolean;
}

/**
 * Slides default — sin imágenes externas. El gradient + decorative mesh
 * dan suficiente impacto visual. El admin sube imágenes reales vía /admin/carrusel.
 */
const DEFAULT_SLIDES: CarouselSlide[] = [
  {
    id: 1,
    titulo: 'Gestión de Proyectos Tecnológicos',
    subtitulo: INSTITUTION.tagline,
    descripcion: 'Administre el ciclo completo de convocatorias, evaluaciones y ministración de apoyos científicos.',
    badge_texto: 'Desarrollo Tecnológico',
    orden: 1,
    activo: true,
  },
  {
    id: 2,
    titulo: 'Vinculación Científica e Institucional',
    subtitulo: 'Red de Colaboración',
    descripcion: 'Conectamos instituciones académicas y de investigación para potenciar el desarrollo regional.',
    badge_texto: 'Vinculación',
    orden: 2,
    activo: true,
  },
  {
    id: 3,
    titulo: 'Evaluación Técnica Transparente',
    subtitulo: 'Dictaminación Rigurosa',
    descripcion: 'Proceso de evaluación por expertos con criterios objetivos y trazabilidad completa.',
    badge_texto: 'Evaluación',
    orden: 3,
    activo: true,
  },
];

export function LoginCarousel() {
  const [slides, setSlides] = useState<CarouselSlide[]>(DEFAULT_SLIDES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Fetch slides from API (public endpoint, no auth needed)
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace('/api', '');
    fetch(`${baseUrl}/api/carousel/slides`)
      .then((r) => r.json())
      .then((data) => {
        const items = Array.isArray(data) ? data : [];
        if (items.length > 0) setSlides(items);
      })
      .catch(() => {
        // Keep defaults if API unavailable
      });
  }, []);

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioning || index === currentIndex) return;
      setIsTransitioning(true);
      setCurrentIndex(index);
      setTimeout(() => setIsTransitioning(false), 700);
    },
    [currentIndex, isTransitioning]
  );

  const next = useCallback(() => {
    goTo((currentIndex + 1) % slides.length);
  }, [currentIndex, slides.length, goTo]);

  const prev = useCallback(() => {
    goTo((currentIndex - 1 + slides.length) % slides.length);
  }, [currentIndex, slides.length, goTo]);

  // Auto-play
  useEffect(() => {
    if (!isPaused && slides.length > 1) {
      intervalRef.current = setInterval(next, 5000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [next, isPaused, slides.length]);

  const current = slides[currentIndex];
  if (!current) return null;

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides */}
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            i === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          {/* Background Image */}
          {slide.imagen_url && (
            <Image
              src={slide.imagen_url}
              alt={slide.titulo}
              fill
              unoptimized
              sizes="(max-width: 1280px) 100vw, 50vw"
              priority={i === 0}
              className="absolute inset-0 w-full h-full object-cover scale-105 transition-transform duration-[8000ms] ease-linear"
              style={{ transform: i === currentIndex ? 'scale(1.05)' : 'scale(1)' }}
            />
          )}

          {/* Gradient overlay — brand institucional */}
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-vino-900)]/90 via-primary/80 to-[var(--brand-vino-800)]/85 z-10" />

          {/* Decorative mesh — usa var(--brand-gold) para que respete cambios de paleta */}
          <div className="absolute inset-0 z-10 opacity-20"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, color-mix(in srgb, var(--brand-gold) 20%, transparent) 0%, transparent 50%),
                                radial-gradient(circle at 80% 20%, rgba(255,255,255,0.07) 0%, transparent 40%)`,
            }}
          />
        </div>
      ))}

      {/* Content */}
      <div className="relative z-20 flex flex-col h-full justify-between p-10 xl:p-14 text-white">
        {/* Top: Logo + Badge */}
        <div className="animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-3 mb-6">
            <Image src="/logo.png" alt={INSTITUTION.name} width={62} height={48} priority className="h-12 w-auto object-contain drop-shadow-lg brightness-0 invert" />
          </div>
          {current.badge_texto && (
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/20 border border-accent/40 text-accent text-xs font-semibold tracking-widest uppercase backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-accent glow-fade" />
              {current.badge_texto}
            </span>
          )}
        </div>

        {/* Middle: Slide text */}
        <div
          key={currentIndex}
          className="animate-in fade-in slide-in-from-bottom-6 duration-700 flex-1 flex flex-col justify-end pb-10"
        >
          <h2 className="text-3xl xl:text-4xl font-extrabold leading-tight mb-3 drop-shadow-xl">
            {current.titulo}
          </h2>
          {current.subtitulo && (
            <p className="text-accent font-semibold text-base mb-3 drop-shadow">{current.subtitulo}</p>
          )}
          {current.descripcion && (
            <p className="text-white/80 text-sm leading-relaxed max-w-sm border-l-2 border-accent/60 pl-4">
              {current.descripcion}
            </p>
          )}
        </div>

        {/* Bottom: Controls */}
        <div className="flex items-center justify-between">
          {/* Dot indicators */}
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`transition-all duration-300 rounded-full ${
                  i === currentIndex
                    ? 'w-6 h-2 bg-accent'
                    : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Ir a slide ${i + 1}`}
              />
            ))}
          </div>

          {/* Arrow navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              className="w-9 h-9 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-200 hover:scale-110"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={next}
              className="w-9 h-9 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-200 hover:scale-110"
              aria-label="Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
