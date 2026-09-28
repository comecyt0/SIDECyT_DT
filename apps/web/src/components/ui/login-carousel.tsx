'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react';
import { INSTITUTION } from '@/lib/institution';
import { useT } from '@/i18n/I18nProvider';
import BannerImagen, { fondoEsClaro, normalizarEncuadre, type Encuadre } from '@/components/ui/BannerImagen';
import { LogoComecyt } from '@/components/branding/Logos';

interface CarouselSlide {
  id: number;
  titulo: string;
  subtitulo?: string;
  descripcion?: string;
  imagen_url?: string | null;
  badge_texto?: string;
  orden: number;
  activo: boolean;
  // E50: encuadre de la imagen y si se muestra la tarjeta de textos.
  encuadre?: Encuadre;
  mostrar_textos?: boolean;
}

/** Solo imágenes propias (/storage/carousel/…) o https: el front no pinta otra cosa aunque la API la mandara. */
function imagenSegura(v: unknown): string | null {
  if (typeof v !== 'string' || !v) return null;
  if (/^\/storage\/carousel\/[a-z0-9]+\.(jpg|png|webp)$/.test(v)) return v;
  try { return new URL(v).protocol === 'https:' ? v : null; } catch { return null; }
}

/**
 * Slides default — sin imágenes externas. Las manchas de color del fondo dan el
 * impacto visual. El admin sube imágenes reales vía /admin/carrusel.
 */
const DEFAULT_SLIDES: CarouselSlide[] = [
  {
    id: 1,
    titulo: 'Gestión de Proyectos Tecnológicos',
    subtitulo: INSTITUTION.tagline,
    descripcion: 'Administre el ciclo completo de convocatorias, evaluaciones y ministración de apoyos empresariales.',
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

/** Tiempo por diapositiva. Debe coincidir con --auth-slide-ms (globals.css). */
const SLIDE_MS = 6500;

/** Arrastre horizontal mínimo (px) para cambiar de diapositiva con el dedo o el mouse. */
const SWIPE_PX = 60;

/**
 * Posición de las tres manchas de color por diapositiva. El fondo solo se reacomoda
 * al cambiar de diapositiva: marca el cambio sin moverse por su cuenta.
 */
const BLOB_LAYOUTS = [
  [{ x: '-12%', y: '-18%', s: 1 }, { x: '48%', y: '8%', s: 0.9 }, { x: '8%', y: '52%', s: 1.1 }],
  [{ x: '40%', y: '-22%', s: 1.1 }, { x: '-8%', y: '30%', s: 1 }, { x: '52%', y: '48%', s: 0.85 }],
  [{ x: '18%', y: '-10%', s: 0.9 }, { x: '56%', y: '34%', s: 1.15 }, { x: '-16%', y: '44%', s: 1 }],
  [{ x: '-4%', y: '6%', s: 1.15 }, { x: '44%', y: '-16%', s: 0.9 }, { x: '30%', y: '58%', s: 1 }],
];

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

function textVariants(reduceMotion: boolean): Variants {
  if (reduceMotion) {
    return {
      enter: { opacity: 0 },
      center: { opacity: 1, transition: { duration: 0.15 } },
      exit: { opacity: 0, transition: { duration: 0.1 } },
    };
  }
  // `transform` completo en vez de x/y: Framer lo acelera por hardware
  return {
    enter: (dir: number) => ({ opacity: 0, transform: `translateX(${dir * 24}px)`, filter: 'blur(6px)' }),
    center: {
      opacity: 1,
      transform: 'translateX(0px)',
      filter: 'blur(0px)',
      transition: { duration: 0.5, ease: EASE_OUT },
    },
    exit: (dir: number) => ({
      opacity: 0,
      transform: `translateX(${dir * -16}px)`,
      filter: 'blur(4px)',
      transition: { duration: 0.26, ease: EASE_OUT },
    }),
  };
}

export function LoginCarousel() {
  const { t } = useT();
  const prefersReducedMotion = useReducedMotion();
  // En el servidor useReducedMotion da null: la preferencia se aplica después de montar
  // para que el HTML hidrate igual (mismo caso que E7 en CLAUDE.md)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const reduceMotion = mounted && Boolean(prefersReducedMotion);
  const [slides, setSlides] = useState<CarouselSlide[]>(DEFAULT_SLIDES);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  // null = sin decisión del usuario: con "reducir movimiento" arranca en pausa
  const [userPaused, setUserPaused] = useState<boolean | null>(null);
  const [hovered, setHovered] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const pointerStartX = useRef<number | null>(null);

  useEffect(() => {
    // Fetch slides from API (public endpoint, no auth needed)
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace('/api', '');
    fetch(`${baseUrl}/api/carousel/slides`)
      .then((r) => r.json())
      .then((data) => {
        const items: CarouselSlide[] = (Array.isArray(data) ? data : [])
          .filter((s) => s && typeof s === 'object' && typeof s.titulo === 'string')
          .map((s) => ({
            ...s,
            imagen_url: imagenSegura(s.imagen_url),
            encuadre: normalizarEncuadre(s),
            mostrar_textos: s.mostrar_textos !== false,
          }));
        if (items.length > 0) {
          setSlides(items);
          setIndex(0);
        }
      })
      .catch(() => {
        // Keep defaults if API unavailable
      });
  }, []);

  // No avanzar mientras la pestaña no está visible
  useEffect(() => {
    const onVisibility = () => setTabHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const count = slides.length;
  const manualPaused = userPaused ?? reduceMotion;
  const isPaused = manualPaused || hovered || keyboardFocus || tabHidden;

  const goTo = useCallback(
    (target: number, dir: 1 | -1) => {
      if (count === 0) return;
      setDirection(dir);
      setIndex(((target % count) + count) % count);
    },
    [count]
  );

  const next = useCallback(() => goTo(index + 1, 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1, -1), [goTo, index]);

  // Con "reducir movimiento" la barra no se anima, así que el avance va por temporizador
  useEffect(() => {
    if (!reduceMotion || isPaused || count < 2) return;
    const id = setTimeout(next, SLIDE_MS);
    return () => clearTimeout(id);
  }, [reduceMotion, isPaused, count, next]);

  const current = slides[index] ?? slides[0];
  if (!current) return null;

  const layout = BLOB_LAYOUTS[index % BLOB_LAYOUTS.length];
  const variants = textVariants(reduceMotion);
  // E50: con imagen, se ve la imagen tal cual (sin velo ni manchas); sin imagen, el fondo institucional de manchas.
  const conImagen = Boolean(current.imagen_url);
  const claro = conImagen && current.encuadre ? fondoEsClaro(current.encuadre) : false;
  const mostrarTextos = current.mostrar_textos !== false;

  return (
    <section
      className="auth-banner h-full w-full select-none"
      aria-roledescription="carousel"
      aria-label={t('auth.carousel_label')}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={(e) => {
        if ((e.target as HTMLElement).matches(':focus-visible')) setKeyboardFocus(true);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setKeyboardFocus(false);
      }}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        pointerStartX.current = e.clientX;
      }}
      onPointerUp={(e) => {
        if (pointerStartX.current === null) return;
        const dx = e.clientX - pointerStartX.current;
        pointerStartX.current = null;
        if (Math.abs(dx) < SWIPE_PX || count < 2) return;
        if (dx < 0) next();
        else prev();
      }}
    >
      {/* Fondo: imagen del admin con su encuadre (E50) o, sin imagen, manchas de color + grano */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        {slides.map((slide, i) =>
          slide.imagen_url ? (
            <BannerImagen
              key={slide.id}
              src={slide.imagen_url}
              encuadre={slide.encuadre ?? normalizarEncuadre(null)}
              activo={i === index}
              className="auth-banner-image"
            />
          ) : null
        )}
        {!conImagen && layout.map((blob, i) => (
          <span
            key={i}
            className={`auth-blob auth-blob-${i + 1}`}
            style={{ transform: `translate(${blob.x}, ${blob.y}) scale(${blob.s})` }}
          />
        ))}
        {!conImagen && <span className="auth-grain" />}
        {/* Degradado oscuro solo abajo: los controles (y los textos, si se muestran) se leen sobre cualquier imagen */}
        {conImagen && <span className="auth-banner-scrim" data-textos={mostrarTextos} />}
      </div>

      <div className="relative flex h-full flex-col p-8 text-white xl:p-10">
        {/* Arriba: logo oficial (negativo sobre fondos oscuros, a color sobre fondo claro). Sin sello de texto (28/09/2026). */}
        <div className="auth-reveal flex items-start justify-between gap-6" style={{ '--i': 0 } as React.CSSProperties}>
          <LogoComecyt variante={claro ? 'color' : 'negativo'} className="h-24 xl:h-28" />
        </div>

        {/* Abajo: texto de la diapositiva. pr deja libre el recorte de los botones */}
        <div className="auth-reveal mt-auto pr-[152px]" style={{ '--i': 1 } as React.CSSProperties}>
          <div aria-live={isPaused ? 'polite' : 'off'} aria-atomic="true">
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.div
                key={current.id}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                {mostrarTextos ? (
                  <>
                    {current.badge_texto && <p className="auth-tag mb-4">{current.badge_texto}</p>}
                    <div className="auth-glass p-7 xl:p-8">
                      <h2 className="auth-banner-title">{current.titulo}</h2>
                      {current.subtitulo && (
                        <p className="mt-3 text-[15px] font-semibold text-white/90">{current.subtitulo}</p>
                      )}
                      {current.descripcion && (
                        <p className="mt-2 max-w-[52ch] text-[15px] leading-relaxed text-white/80">
                          {current.descripcion}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  // La imagen ya trae su texto: el título queda solo para lectores de pantalla.
                  <h2 className="sr-only">{current.titulo}</h2>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {count > 1 && (
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                className="auth-icon-btn"
                onClick={() => setUserPaused(!manualPaused)}
                aria-label={manualPaused ? t('auth.carousel_play') : t('auth.carousel_pause')}
              >
                {manualPaused ? (
                  <Play className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Pause className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              <div className="auth-progress flex-1" data-paused={isPaused} data-reduced={reduceMotion}>
                {slides.map((slide, i) => (
                  <button
                    key={slide.id}
                    type="button"
                    className="auth-progress-seg"
                    data-state={i < index ? 'done' : i === index ? 'active' : 'idle'}
                    onClick={() => goTo(i, i >= index ? 1 : -1)}
                    aria-label={`${t('auth.carousel_go_to')} ${i + 1}: ${slide.titulo}`}
                    aria-current={i === index ? 'true' : undefined}
                  >
                    <span className="auth-progress-track">
                      {/* key cambia con el índice para reiniciar la animación del segmento activo */}
                      <span
                        key={i === index ? `activo-${index}` : 'fijo'}
                        className="auth-progress-fill"
                        onAnimationEnd={i === index && !reduceMotion ? next : undefined}
                      />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {count > 1 && (
        <div className="auth-notch">
          <button type="button" className="auth-nav-btn" onClick={prev} aria-label={t('auth.carousel_prev')}>
            <ArrowLeft className="auth-nav-prev h-5 w-5" aria-hidden="true" />
          </button>
          <button type="button" className="auth-nav-btn" onClick={next} aria-label={t('auth.carousel_next')}>
            <ArrowRight className="auth-nav-next h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}
