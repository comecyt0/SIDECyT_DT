'use client';

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent, type ReactNode, type RefObject, type KeyboardEvent as RKeyboardEvent } from 'react';
import Link from 'next/link';
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import {
  ArrowDown, ArrowRight, ArrowUpRight, Briefcase, Building2, FlaskConical, Globe, GraduationCap, Lightbulb, LogIn, Mail, MapPin,
  Megaphone, Phone, Sparkles, UserPlus,
} from 'lucide-react';
import { INSTITUTION, copyrightLine } from '@/lib/institution';
import { useSitio } from '@/lib/sitio';
import { LogoComecyt, BandaInstitucional } from '@/components/branding/Logos';
import OrbitaSistemas, { type SistemaOrbita } from './OrbitaSistemas';

/**
 * Portal de sistemas del COMECYT — https://sidecyt-comecyt.edomex.gob.mx/ (25/09/2026).
 * Puerta común a SIGAE (Apoyo Empresarial, /sigae) y SICEI (Ciencia, Educación e Innovación, /sicei).
 * Estilos: ./portal.css (prefijo .pt-*, tokens dentro de .pt-root). Contenido honesto: sin cifras inventadas; SICEI se
 * anuncia como "Próximamente" hasta que exista.
 */

const COMECYT_SITE = 'https://comecyt.edomex.gob.mx';
const CORREO_PROYECTOS = 'proyectos.comecyt@edomex.gob.mx';
/** Mismo mínimo que la pantalla de carga: la entrada arranca cuando se va el splash. */
const BOOT_MS = 1100;

type SistemaId = 'sigae' | 'sicei';

interface Sistema {
  id: SistemaId;
  sigla: string;
  nombre: string;
  para: string;
  puntos: string[];
  estado: 'disponible' | 'proximamente';
  href: string;
  cta: string;
  icono: ReactNode;
}

const SISTEMAS: Sistema[] = [
  {
    id: 'sigae',
    sigla: 'SIGAE',
    nombre: 'Sistema de Gestión de Apoyo Empresarial',
    para: 'Para empresas, emprendedores e instituciones que postulan a los programas de Apoyo Empresarial.',
    puntos: ['Consulta las convocatorias abiertas', 'Registra tu proyecto y adjunta tus documentos', 'Sigue cada etapa hasta el convenio y el cierre'],
    estado: 'disponible',
    href: '/sigae',
    cta: 'Entrar a SIGAE',
    icono: <Briefcase aria-hidden="true" />,
  },
  {
    id: 'sicei',
    sigla: 'SICEI',
    nombre: 'Sistema de Impulso a la Ciencia, Educación e Innovación',
    para: 'Para estudiantes, docentes, investigadoras e investigadores del Estado de México: becas y estímulos a la investigación.',
    puntos: ['Becas COMECYT para estudiantes mexiquenses', 'Estímulos e impulso a la investigación científica y tecnológica', 'Muy pronto: te avisaremos aquí cuando abra'],
    estado: 'proximamente',
    href: '/sicei',
    cta: 'Conocer SICEI',
    icono: <FlaskConical aria-hidden="true" />,
  },
];

/** "¿Cuál es para mí?": perfil → sistema recomendado. */
const PERFILES: { id: string; etiqueta: string; icono: ReactNode; sistema: SistemaId; motivo: string }[] = [
  { id: 'empresa', etiqueta: 'Tengo una empresa', icono: <Building2 aria-hidden="true" />, sistema: 'sigae', motivo: 'Los programas de Apoyo Empresarial del COMECYT se consultan y postulan en SIGAE.' },
  { id: 'emprendo', etiqueta: 'Emprendo un proyecto', icono: <Lightbulb aria-hidden="true" />, sistema: 'sigae', motivo: 'Los apoyos para emprender un proyecto de innovación son parte del Apoyo Empresarial: entra por SIGAE.' },
  { id: 'investigo', etiqueta: 'Investigo o doy clases', icono: <FlaskConical aria-hidden="true" />, sistema: 'sicei', motivo: 'Los estímulos e impulso a la investigación estarán en SICEI, el sistema de ciencia, educación e innovación.' },
  { id: 'estudio', etiqueta: 'Estudio', icono: <GraduationCap aria-hidden="true" />, sistema: 'sicei', motivo: 'Las becas COMECYT para estudiantes estarán en SICEI.' },
];

const ACCESOS: { href: string; etiqueta: string; detalle: string; icono: ReactNode }[] = [
  { href: '/sigae#convocatorias', etiqueta: 'Convocatorias abiertas', detalle: 'Qué puedes postular hoy en SIGAE', icono: <Megaphone aria-hidden="true" /> },
  { href: '/login', etiqueta: 'Iniciar sesión', detalle: 'Si ya tienes cuenta en SIGAE', icono: <LogIn aria-hidden="true" /> },
  { href: '/registro', etiqueta: 'Crear cuenta', detalle: 'Participante, líder de club o evaluador', icono: <UserPlus aria-hidden="true" /> },
];

/** Nodos de la órbita del héroe (posiciones calculadas sobre sus anillos; ver OrbitaSistemas). */
const NODOS = [
  { id: 'sigae' as const, sigla: 'SIGAE', detalle: 'Apoyo Empresarial', estado: 'disponible' as const, icono: <Briefcase />, x: 87.2, y: 23.9 },
  { id: 'sicei' as const, sigla: 'SICEI', detalle: 'Ciencia, Educación e Innovación', estado: 'proximamente' as const, icono: <FlaskConical />, x: 22.1, y: 69.5 },
];

/** "Cómo funciona": secuencia real del sistema (por eso va numerada). Sin datos inventados. */
const PASOS: { titulo: string; texto: string; icono: ReactNode }[] = [
  { titulo: 'Elige tu sistema', texto: 'SIGAE si tienes una empresa o emprendes; SICEI si estudias, investigas o das clases.', icono: <Sparkles aria-hidden="true" /> },
  { titulo: 'Crea tu cuenta', texto: 'Registra tus datos y elige tu rol: participante, líder de club o evaluador. Un administrador la aprueba y te avisa por correo.', icono: <UserPlus aria-hidden="true" /> },
  { titulo: 'Postula y da seguimiento', texto: 'Registra tu proyecto, adjunta tus documentos y mira en qué etapa va, hasta el convenio.', icono: <Megaphone aria-hidden="true" /> },
];

/**
 * Revelado al entrar en pantalla (una vez). Sin JS o con movimiento reducido todo queda visible: el CSS solo oculta
 * cuando `.pt-root` tiene `data-js` (se pone al montar).
 */
function useRevela<T extends HTMLElement>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); io.disconnect(); }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, visible];
}

/** Resumen en vivo de convocatorias (endpoint público con lista blanca; solo se leen los tamaños de las listas). */
function useResumenConvocatorias(): { abiertas: number; proximas: number } | null {
  const [r, setR] = useState<{ abiertas: number; proximas: number } | null>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/convocatorias/publicas', { credentials: 'omit', signal: ctrl.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((d: unknown) => {
        if (!d || typeof d !== 'object') return;
        const o = d as Record<string, unknown>;
        setR({ abiertas: Array.isArray(o.abiertas) ? o.abiertas.length : 0, proximas: Array.isArray(o.proximas) ? o.proximas.length : 0 });
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);
  return r;
}

/** Número que cuenta desde 0 cuando llega el dato (una vez; sin animación con movimiento reducido). */
function Contador({ valor, animar }: { valor: number; animar: boolean }) {
  const [n, setN] = useState(animar ? 0 : valor);
  useEffect(() => {
    if (!animar) { setN(valor); return; }
    const c = animate(0, valor, { duration: 0.9, ease: [0.23, 1, 0.32, 1], onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [valor, animar]);
  return <span className="pt-contador">{n}</span>;
}

/** ¿Se puede animar con el puntero? (no en táctil ni con movimiento reducido). */
function usePunteroFino(): boolean {
  const [fino, setFino] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const act = () => setFino(mq.matches);
    act();
    mq.addEventListener?.('change', act);
    return () => mq.removeEventListener?.('change', act);
  }, []);
  return fino;
}

function TarjetaSistema({ s, destacado, atenuado, animar, enFoco = false, programas = [] }: { s: Sistema; destacado: boolean; atenuado: boolean; animar: boolean; enFoco?: boolean; programas?: string[] }) {
  const ref = useRef<HTMLElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 160, damping: 18 });
  const sry = useSpring(ry, { stiffness: 160, damping: 18 });

  const mover = (e: RPointerEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    // Foco de luz que sigue al puntero (variables CSS, sin re-render).
    el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
    el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    if (animar) { ry.set((x - 0.5) * 6); rx.set((0.5 - y) * 5); }
  };
  const salir = () => { rx.set(0); ry.set(0); };

  return (
    <motion.article
      ref={ref}
      className="pt-sistema"
      data-sistema={s.id}
      data-destacado={destacado || undefined}
      data-foco={enFoco || undefined}
      data-atenuado={atenuado || undefined}
      onPointerMove={mover}
      onPointerLeave={salir}
      style={animar ? { rotateX: srx, rotateY: sry, transformPerspective: 900 } : undefined}
      aria-labelledby={`pt-${s.id}-titulo`}
    >
      <span className="pt-sistema-luz" aria-hidden="true" />
      <div className="pt-sistema-cabeza">
        <span className="pt-sistema-icono">{s.icono}</span>
        <span className="pt-estado" data-estado={s.estado}>
          <span aria-hidden="true" />{s.estado === 'disponible' ? 'Disponible' : 'Próximamente'}
        </span>
      </div>
      {/* Respuesta visible de "¿Cuál es para mí?": la tarjeta elegida se marca aquí mismo. */}
      <AnimatePresence>
        {destacado && (
          <motion.span
            className="pt-recomendado"
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97, transition: { duration: 0.14 } }}
            transition={{ type: 'spring' as const, duration: 0.45, bounce: 0.2 }}
          >
            <Sparkles aria-hidden="true" /> Recomendado para ti
          </motion.span>
        )}
      </AnimatePresence>
      <h2 id={`pt-${s.id}-titulo`} className="pt-sigla">{s.sigla}</h2>
      <p className="pt-nombre">{s.nombre}</p>
      <p className="pt-para">{s.para}</p>
      <ul className="pt-puntos">
        {s.puntos.map((p) => <li key={p}>{p}</li>)}
      </ul>
      {/* E49: programas vigentes, en vivo desde el panel (/admin/sitio); nada escrito en el código. */}
      {programas.length > 0 && (
        <div className="pt-programas">
          <p className="pt-programas-titulo">{programas.length} programas vigentes</p>
          <ul className="pt-programas-lista">
            {/* Llegan de la API después del primer pintado: entran escalonados, no de golpe. */}
            {programas.slice(0, 4).map((n, i) => <li key={n} className="pt-programa-chip" style={{ '--j': i } as CSSProperties}>{n}</li>)}
            {programas.length > 4 && (
              <li><Link href={`${s.href}#programas`} className="pt-programas-mas">y {programas.length - 4} más</Link></li>
            )}
          </ul>
        </div>
      )}
      <Link href={s.href} className="pt-cta" data-variante={s.estado === 'disponible' ? 'principal' : 'secundario'}>
        <span className="pt-cta-texto">{s.cta}</span>
        <ArrowRight className="pt-cta-flecha" aria-hidden="true" />
      </Link>
    </motion.article>
  );
}

export default function Portal() {
  const reducir = useReducedMotion();
  const fino = usePunteroFino();
  const [listo, setListo] = useState(false);
  const [perfil, setPerfil] = useState<string | null>(null);
  const fondo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setListo(true), BOOT_MS);
    return () => window.clearTimeout(t);
  }, []);

  // `fino` empieza en false (servidor y primer render): no hay diferencia de hidratación (E7).
  const animar = fino && !reducir;

  // Fondo: la retícula y el halo responden al puntero (una variable por cuadro, con requestAnimationFrame).
  useEffect(() => {
    if (!animar) return;
    let raf = 0;
    const mover = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = fondo.current;
        if (!el) return;
        el.style.setProperty('--px', `${e.clientX}px`);
        el.style.setProperty('--py', `${e.clientY}px`);
      });
    };
    window.addEventListener('pointermove', mover, { passive: true });
    return () => { window.removeEventListener('pointermove', mover); cancelAnimationFrame(raf); };
  }, [animar]);

  const elegido = PERFILES.find((p) => p.id === perfil) ?? null;
  // E49: programas activos de SIGAE (administrables). SICEI queda pendiente: sin programas publicados aún.
  const { datos: sigae } = useSitio('sigae');
  const resumen = useResumenConvocatorias();
  const [js, setJs] = useState(false);
  useEffect(() => { setJs(true); }, []);
  const [guiaRef, guiaVisible] = useRevela<HTMLElement>();
  const [pasosRef, pasosVisible] = useRevela<HTMLElement>();
  const [accesosRef, accesosVisible] = useRevela<HTMLElement>();
  const chipsRef = useRef<HTMLDivElement>(null);
  // Nodo de la órbita ↔ tarjeta: el que tiene el cursor o el foco se resalta en ambos lados.
  const [foco, setFoco] = useState<SistemaOrbita | null>(null);
  // La barra se compacta al desplazarse (más sombra, menos alto).
  const [desplazado, setDesplazado] = useState(false);
  useEffect(() => {
    const alDesplazar = () => setDesplazado(window.scrollY > 90);
    alDesplazar();
    window.addEventListener('scroll', alDesplazar, { passive: true });
    return () => window.removeEventListener('scroll', alDesplazar);
  }, []);

  /** Elige un perfil; en teléfono lleva la vista a la tarjeta recomendada (la respuesta queda arriba, fuera de vista). */
  const elegir = (id: string, alternar = true) => {
    const nuevo = alternar && perfil === id ? null : id;
    setPerfil(nuevo);
    const p = PERFILES.find((x) => x.id === nuevo);
    if (p && window.innerWidth < 880) {
      window.setTimeout(() => {
        document.getElementById(`pt-${p.sistema}-titulo`)?.closest('article')
          ?.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth', block: 'center' });
      }, 120);
    }
  };

  /** Radiogroup accesible: flechas mueven el foco y eligen (patrón WAI-ARIA), Inicio/Fin a los extremos. */
  const teclaChips = (e: RKeyboardEvent<HTMLDivElement>) => {
    const teclas = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
    if (!teclas.includes(e.key)) return;
    e.preventDefault();
    const actual = Math.max(0, PERFILES.findIndex((p) => p.id === perfil));
    const n = PERFILES.length;
    const sig = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1
      : (actual + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + n) % n;
    elegir(PERFILES[sig].id, false);
    chipsRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[sig]?.focus();
  };

  return (
    <div className="pt-root" data-listo={listo || reducir ? 'true' : undefined} data-js={js || undefined}>
      <a href="#pt-contenido" className="pt-saltar">Saltar al contenido</a>
      <div ref={fondo} className="pt-fondo" data-vivo={animar || undefined} aria-hidden="true">
        <span className="pt-fondo-reticula" />
        <span className="pt-fondo-halo pt-fondo-halo-a" />
        <span className="pt-fondo-halo pt-fondo-halo-b" />
        <span className="pt-fondo-puntero" />
      </div>

      {/* Convivencia oficial de logos en el encabezado (E50, regla del usuario) */}
      <BandaInstitucional />
      <header className="pt-barra" data-desplazado={desplazado || undefined}>
        <div className="pt-wrap pt-barra-fila">
          <Link href="/" className="pt-marca" aria-label={`SIDECyT, portal de sistemas del ${INSTITUTION.name} — inicio`}>
            <LogoComecyt decorativo />
            <span className="pt-marca-texto">
              <strong>SIDECyT</strong>
              <span className="pt-marca-sub">Portal de sistemas del COMECYT</span>
            </span>
          </Link>
          {/* Secciones de la página (escritorio). En teléfono sobra: todo está a un desplazamiento. */}
          <nav className="pt-barra-nav" aria-label="Secciones">
            <a href="#pt-sistemas">Sistemas</a>
            <a href="#pt-guia">¿Cuál es para mí?</a>
            <a href="#pt-pasos">Cómo funciona</a>
          </nav>
          {/* Botón (no un enlace suelto con la URL): sitio oficial del COMECYT en otra pestaña. */}
          <a href={COMECYT_SITE} target="_blank" rel="noopener noreferrer" className="pt-boton-sitio" aria-label="Sitio del COMECYT (abre en otra pestaña)">
            <Globe className="pt-boton-sitio-icono" aria-hidden="true" />
            <span className="pt-boton-sitio-texto">Sitio COMECYT</span>
            <ArrowUpRight className="pt-boton-sitio-flecha" aria-hidden="true" />
          </a>
        </div>
      </header>

      <main id="pt-contenido">
        <section className="pt-wrap pt-heroe" aria-labelledby="pt-titulo">
          <div className="pt-heroe-texto-col">
          {/* Sello de dos partes: sigla en bloque vino + nombre completo. En teléfono se apila limpio (no una píldora
              que se parte a la mitad). */}
          <p className="pt-sello pt-entra" style={{ '--i': 0 } as CSSProperties}>
            <span className="pt-sello-sigla"><Sparkles aria-hidden="true" />SIDECyT</span>
            <span className="pt-sello-nombre">Sistema Digital de Emprendimiento, Ciencia y Talento Mexiquense</span>
          </p>
          <h1 id="pt-titulo" className="pt-titulo pt-entra" style={{ '--i': 1 } as CSSProperties}>
            ¿A qué sistema <span className="pt-subrayado">quieres entrar</span>?
          </h1>
          <p className="pt-heroe-texto pt-entra" style={{ '--i': 2 } as CSSProperties}>
            SIDECyT es la puerta digital del {INSTITUTION.fullName}: reúne <strong>SIGAE</strong>, para el apoyo a
            empresas y emprendedores, y <strong>SICEI</strong>, para las becas a estudiantes y el impulso a la
            investigación. Elige el tuyo; si no sabes cuál, te ayudamos abajo.
          </p>
          {/* Señal en vivo: solo aparece si hay convocatorias reales (abiertas o por abrir). Nunca una cifra inventada. */}
          <AnimatePresence>
            {resumen && (resumen.abiertas > 0 || resumen.proximas > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              >
                <Link href="/sigae#convocatorias" className="pt-senal" data-tipo={resumen.abiertas > 0 ? 'abiertas' : 'proximas'}>
                  <span className="pt-senal-punto" aria-hidden="true" />
                  {resumen.abiertas > 0 ? (
                    <><Contador valor={resumen.abiertas} animar={!reducir} /> {resumen.abiertas === 1 ? 'convocatoria abierta' : 'convocatorias abiertas'} en SIGAE</>
                  ) : (
                    <><Contador valor={resumen.proximas} animar={!reducir} /> {resumen.proximas === 1 ? 'convocatoria próxima a abrir' : 'convocatorias próximas a abrir'}</>
                  )}
                  <ArrowRight className="pt-senal-flecha" aria-hidden="true" />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="pt-heroe-acciones pt-entra" style={{ '--i': 3 } as CSSProperties}>
            <a href="#pt-sistemas" className="pt-cta" data-variante="principal">
              <span className="pt-cta-texto">Ver los sistemas</span><ArrowDown className="pt-cta-flecha pt-cta-flecha-abajo" aria-hidden="true" />
            </a>
            <a href="#pt-guia" className="pt-cta" data-variante="secundario">
              <span className="pt-cta-texto">¿No sabes cuál? Te ayudamos</span>
            </a>
          </div>
          </div>
          <div className="pt-heroe-visual pt-entra" style={{ '--i': 2 } as CSSProperties}>
            <OrbitaSistemas nodos={NODOS} foco={foco} onFoco={setFoco} />
          </div>
        </section>

        <section id="pt-sistemas" className="pt-wrap pt-sistemas" aria-label="Sistemas del COMECYT">
          {SISTEMAS.map((s, i) => (
            <div
              key={s.id}
              id={`pt-sistema-${s.id}`}
              className="pt-entra pt-sistema-marco"
              style={{ '--i': 4 + i } as CSSProperties}
              onPointerEnter={() => setFoco(s.id)}
              onPointerLeave={() => setFoco(null)}
            >
              <TarjetaSistema
                s={s}
                animar={animar}
                enFoco={foco === s.id}
                destacado={elegido?.sistema === s.id}
                atenuado={Boolean(elegido) && elegido?.sistema !== s.id}
                programas={s.id === 'sigae' ? sigae.programas.map((p) => p.nombre) : []}
              />
            </div>
          ))}
        </section>

        <section id="pt-guia" ref={guiaRef} className="pt-wrap pt-guia pt-revela" data-visible={guiaVisible || undefined} aria-labelledby="pt-guia-titulo">
          <div className="pt-guia-caja">
            <div>
              <h2 id="pt-guia-titulo" className="pt-h2">¿Cuál es para mí?</h2>
              <p className="pt-guia-sub">Elige lo que mejor te describe y marcamos el sistema que te corresponde.</p>
            </div>
            <div ref={chipsRef} className="pt-chips" role="radiogroup" aria-label="¿Quién eres?" onKeyDown={teclaChips}>
              {PERFILES.map((p, i) => {
                const activo = perfil === p.id;
                // Foco itinerante: solo la opción elegida (o la primera) entra con Tab; las flechas recorren el resto.
                const enfocable = activo || (!perfil && i === 0);
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={activo}
                    tabIndex={enfocable ? 0 : -1}
                    className="pt-chip"
                    onClick={() => elegir(p.id)}
                  >
                    {/* Una sola píldora que se desliza de una opción a otra (muestra qué cambió). */}
                    {activo && (
                      <motion.span
                        layoutId="pt-chip-activo"
                        className="pt-chip-fondo"
                        transition={reducir ? { duration: 0 } : { type: 'spring' as const, duration: 0.4, bounce: 0.15 }}
                        aria-hidden="true"
                      />
                    )}
                    <span className="pt-chip-contenido">{p.icono}{p.etiqueta}</span>
                  </button>
                );
              })}
            </div>
            <p className="pt-guia-respuesta" aria-live="polite">
              {elegido ? (
                <>
                  <strong>Te corresponde {elegido.sistema.toUpperCase()}.</strong> {elegido.motivo}{' '}
                  <Link href={elegido.sistema === 'sigae' ? '/sigae' : '/sicei'} className="pt-enlace">
                    Ir a {elegido.sistema.toUpperCase()} <ArrowRight aria-hidden="true" />
                  </Link>
                </>
              ) : (
                <span className="pt-guia-vacio">Toca una opción para ver la recomendación.</span>
              )}
            </p>
          </div>
        </section>

        <section id="pt-pasos" ref={pasosRef} className="pt-wrap pt-pasos pt-revela" data-visible={pasosVisible || undefined} aria-labelledby="pt-pasos-titulo">
          <h2 id="pt-pasos-titulo" className="pt-h2">Cómo funciona</h2>
          <p className="pt-guia-sub">Tres pasos, del primer clic a tu proyecto en marcha.</p>
          {/* La línea que une los pasos es `.pt-pasos-lista::before`: se dibuja al entrar en pantalla. */}
          <ol className="pt-pasos-lista">
            {PASOS.map((p, i) => (
              <li key={p.titulo} className="pt-paso" style={{ '--k': i } as CSSProperties}>
                <span className="pt-paso-num" aria-hidden="true">{i + 1}</span>
                <div className="pt-paso-cuerpo">
                  <h3 className="pt-paso-titulo"><span className="pt-paso-icono">{p.icono}</span>{p.titulo}</h3>
                  <p className="pt-paso-texto">{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section ref={accesosRef} className="pt-wrap pt-accesos pt-revela" data-visible={accesosVisible || undefined} aria-labelledby="pt-accesos-titulo">
          <h2 id="pt-accesos-titulo" className="pt-h2">Accesos rápidos</h2>
          <ul className="pt-accesos-lista">
            {ACCESOS.map((a) => (
              <li key={a.href}>
                <Link href={a.href} className="pt-acceso">
                  <span className="pt-acceso-icono">{a.icono}</span>
                  <span className="pt-acceso-texto">
                    <span className="pt-acceso-etiqueta">{a.etiqueta}</span>
                    <span className="pt-acceso-detalle">{a.detalle}</span>
                  </span>
                  <ArrowRight className="pt-acceso-flecha" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <PiePortal />
    </div>
  );
}

/** Pie con los datos públicos del COMECYT (los mismos del pie de comecyt.edomex.gob.mx y de la landing de SIGAE). */
export function PiePortal() {
  return (
    <footer className="pt-pie">
      <div className="pt-wrap pt-pie-rejilla">
        <div className="pt-pie-marca">
          {/* Pie en vino oficial: versión negativa del logo (manual de identidad, fondos oscuros). */}
          <LogoComecyt variante="negativo" />
          <p className="pt-pie-nombre">{INSTITUTION.fullName}</p>
          <p className="pt-pie-desc">Organismo del Gobierno del {INSTITUTION.state} que impulsa la ciencia, la tecnología y la innovación.</p>
          <p className="pt-pie-sidecyt"><strong>SIDECyT</strong> · Sistema Digital de Emprendimiento, Ciencia y Talento Mexiquense</p>
        </div>
        <nav className="pt-pie-col" aria-label="Sistemas">
          <p className="pt-pie-titulo">Sistemas</p>
          <Link href="/sigae">SIGAE · Apoyo Empresarial</Link>
          <Link href="/sicei">SICEI · Ciencia, Educación e Innovación</Link>
          <Link href="/login">Iniciar sesión</Link>
        </nav>
        <div className="pt-pie-col">
          <p className="pt-pie-titulo">Contacto</p>
          <address className="pt-pie-contacto">
            <span><MapPin aria-hidden="true" />Paseo Colón 112-A, col. Ciprés, C.P. 50120, Toluca, {INSTITUTION.state}</span>
            <a href="tel:+527223190009"><Phone aria-hidden="true" />(722) 319 00 09 al 15</a>
            <a href="tel:8002632628"><Phone aria-hidden="true" />800 2632 628</a>
            {/* El correo se corta en la @ si no cabe (nunca a mitad del dominio). */}
            <a href={`mailto:${CORREO_PROYECTOS}`}><Mail aria-hidden="true" /><span>{CORREO_PROYECTOS.split('@')[0]}<wbr />@{CORREO_PROYECTOS.split('@')[1]}</span></a>
          </address>
        </div>
        <nav className="pt-pie-col" aria-label="Enlaces">
          <p className="pt-pie-titulo">Enlaces</p>
          <a href={COMECYT_SITE} target="_blank" rel="noopener noreferrer">Sitio del COMECYT <ArrowUpRight aria-hidden="true" /></a>
          <Link href="/privacidad">Aviso de privacidad</Link>
          <Link href="/terminos">Términos de uso</Link>
        </nav>
      </div>
      <div className="pt-wrap pt-pie-legal">
        <p>{copyrightLine()}</p>
      </div>
    </footer>
  );
}
