'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject, type KeyboardEvent as RKeyboardEvent } from 'react';
import Link from 'next/link';
import { AnimatePresence, animate, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Briefcase, Building2, Check, CircleCheck, FlaskConical, Globe, GraduationCap, Lightbulb,
  LogIn, MapPin, Megaphone, Phone, Sparkles, UserPlus,
} from 'lucide-react';
import { INSTITUTION, copyrightLine } from '@/lib/institution';
import { useSitio } from '@/lib/sitio';
import { LogoComecyt, BandaInstitucional } from '@/components/branding/Logos';
import { GrupoCompacto, GrupoDerecho, GrupoIzquierdo } from './IlustracionesCiencia';
import { AparecerScroll, BarraProgreso, PasosSecuencia, TextoScroll, useSalidaHeroe, type PasoSecuencia } from './ScrollPortal';

/**
 * Portal de sistemas del COMECYT — https://sidecyt-comecyt.edomex.gob.mx/ (25/09/2026).
 * Puerta común a SIGAE (Apoyo Empresarial, /sigae) y SICEI (Ciencia, Educación e Innovación, /sicei).
 * 15/10/2026: rediseño con la referencia "Family" (design.md del usuario) — lienzo crema, contorno fino, vino como
 * botón principal, acentos derivados del vino, personajes de ciencia en SVG. Estilos: ./portal.css (prefijo .pt-*,
 * ilustraciones .il-*). Contenido honesto: sin cifras inventadas. /sicei lo sirve OTRA app (Next de SICEI, basePath
 * /sicei, vía IIS): sus enlaces son <a> con navegación completa, nunca <Link> (el router de SIGAE la resolvería aquí).
 */

const COMECYT_SITE = 'https://comecyt.edomex.gob.mx';
/** Mismo mínimo que la pantalla de carga: la entrada arranca cuando se va el splash. */
const BOOT_MS = 1100;

type SistemaId = 'sigae' | 'sicei';
type Tono = 'azul' | 'terracota' | 'ciruela' | 'ocre';

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
    puntos: ['Becas COMECYT para estudiantes mexiquenses', 'Estímulos e impulso a la investigación científica y tecnológica', 'Regístrate, postula y da seguimiento en línea'],
    estado: 'disponible',
    href: '/sicei',
    cta: 'Entrar a SICEI',
    icono: <FlaskConical aria-hidden="true" />,
  },
];

/** "¿Cuál es para mí?": perfil → sistema recomendado. Cada fila lleva su círculo de color (Family "Action Row"). */
const PERFILES: { id: string; etiqueta: string; ayuda: string; tono: Tono; icono: ReactNode; sistema: SistemaId; motivo: string }[] = [
  { id: 'empresa', etiqueta: 'Tengo una empresa', ayuda: 'Programas de Apoyo Empresarial', tono: 'azul', icono: <Building2 aria-hidden="true" />, sistema: 'sigae', motivo: 'Los programas de Apoyo Empresarial del COMECYT se consultan y postulan en SIGAE.' },
  { id: 'emprendo', etiqueta: 'Emprendo un proyecto', ayuda: 'Apoyos para innovar', tono: 'terracota', icono: <Lightbulb aria-hidden="true" />, sistema: 'sigae', motivo: 'Los apoyos para emprender un proyecto de innovación son parte del Apoyo Empresarial: entra por SIGAE.' },
  { id: 'investigo', etiqueta: 'Investigo o doy clases', ayuda: 'Estímulos a la investigación', tono: 'ciruela', icono: <FlaskConical aria-hidden="true" />, sistema: 'sicei', motivo: 'Los estímulos e impulso a la investigación están en SICEI, el sistema de ciencia, educación e innovación.' },
  { id: 'estudio', etiqueta: 'Estudio', ayuda: 'Becas COMECYT', tono: 'ocre', icono: <GraduationCap aria-hidden="true" />, sistema: 'sicei', motivo: 'Las becas COMECYT para estudiantes están en SICEI.' },
];

/** SICEI vive en otra app bajo /sicei: navegación completa (<a>); lo demás, <Link> del router de SIGAE. */
function EnlaceSistema({ href, children, ...resto }: { href: string; children: ReactNode; className?: string; 'data-variante'?: string }) {
  if (href === '/sicei' || href.startsWith('/sicei/') || href.startsWith('/sicei#')) return <a href={href} {...resto}>{children}</a>;
  return <Link href={href} {...resto}>{children}</Link>;
}

/**
 * Accesos rápidos por sistema (pedido del usuario 15/10/2026): solo botones a apartados que existen.
 * SIGAE: secciones de /sigae, /login y /registro. SICEI (otra app): secciones de su landing (#convocatorias,
 * #programas) y /sicei/portal, donde se entra o se crea la cuenta.
 */
const ACCESOS: { sistema: SistemaId; sigla: string; detalle: string; icono: ReactNode; items: { href: string; etiqueta: string; detalle: string; icono: ReactNode }[] }[] = [
  {
    sistema: 'sigae', sigla: 'SIGAE', detalle: 'Apoyo Empresarial', icono: <Briefcase aria-hidden="true" />,
    items: [
      { href: '/sigae#convocatorias', etiqueta: 'Convocatorias abiertas', detalle: 'Qué puedes postular hoy', icono: <Megaphone aria-hidden="true" /> },
      { href: '/login', etiqueta: 'Iniciar sesión', detalle: 'Si ya tienes cuenta en SIGAE', icono: <LogIn aria-hidden="true" /> },
      { href: '/registro', etiqueta: 'Crear cuenta', detalle: 'Participante, líder de club o evaluador', icono: <UserPlus aria-hidden="true" /> },
    ],
  },
  {
    sistema: 'sicei', sigla: 'SICEI', detalle: 'Ciencia, Educación e Innovación', icono: <FlaskConical aria-hidden="true" />,
    items: [
      { href: '/sicei#convocatorias', etiqueta: 'Convocatorias', detalle: 'Becas y estímulos vigentes', icono: <Megaphone aria-hidden="true" /> },
      { href: '/sicei#programas', etiqueta: 'Programas', detalle: 'Becas a estudiantes e impulso a la investigación', icono: <BookOpen aria-hidden="true" /> },
      { href: '/sicei/portal', etiqueta: 'Entrar o crear cuenta', detalle: 'Tu registro y el seguimiento de tus solicitudes', icono: <LogIn aria-hidden="true" /> },
    ],
  },
];

/** "Cómo funciona": secuencia real del sistema (por eso va numerada). Sin datos inventados. */
const PASOS: PasoSecuencia[] = [
  { titulo: 'Elige tu sistema', texto: 'SIGAE si tienes una empresa o emprendes; SICEI si estudias, investigas o das clases.', tono: 'azul', icono: <Sparkles aria-hidden="true" /> },
  { titulo: 'Crea tu cuenta', texto: 'Registra tus datos y elige tu rol: participante, líder de club o evaluador. Un administrador la aprueba y te avisa por correo.', tono: 'ciruela', icono: <UserPlus aria-hidden="true" /> },
  { titulo: 'Postula y da seguimiento', texto: 'Registra tu proyecto, adjunta tus documentos y mira en qué etapa va, hasta el convenio.', tono: 'terracota', icono: <Megaphone aria-hidden="true" /> },
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

function TarjetaSistema({ s, destacado, atenuado, programas = [] }: { s: Sistema; destacado: boolean; atenuado: boolean; programas?: string[] }) {
  return (
    <article
      className="pt-sistema"
      data-sistema={s.id}
      data-destacado={destacado || undefined}
      data-atenuado={atenuado || undefined}
      aria-labelledby={`pt-${s.id}-titulo`}
    >
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
      <h3 id={`pt-${s.id}-titulo`} className="pt-sigla">{s.sigla}</h3>
      <p className="pt-nombre">{s.nombre}</p>
      <p className="pt-para">{s.para}</p>
      <ul className="pt-puntos">
        {s.puntos.map((p) => <li key={p}><CircleCheck aria-hidden="true" />{p}</li>)}
      </ul>
      {/* E49: programas vigentes, en vivo desde el panel (/admin/sitio); nada escrito en el código. */}
      {programas.length > 0 && (
        <div className="pt-programas">
          <p className="pt-programas-titulo">{programas.length} programas vigentes</p>
          <ul className="pt-programas-lista">
            {/* Llegan de la API después del primer pintado: entran escalonados, no de golpe. */}
            {programas.slice(0, 4).map((n, i) => <li key={n} className="pt-programa-chip" style={{ '--j': i } as CSSProperties}>{n}</li>)}
            {programas.length > 4 && (
              <li><EnlaceSistema href={`${s.href}#programas`} className="pt-programas-mas">y {programas.length - 4} más</EnlaceSistema></li>
            )}
          </ul>
        </div>
      )}
      <EnlaceSistema href={s.href} className="pt-cta" data-variante={s.estado === 'disponible' ? 'principal' : 'secundario'}>
        <span>{s.cta}</span>
        <ArrowRight className="pt-cta-flecha" aria-hidden="true" />
      </EnlaceSistema>
    </article>
  );
}

export default function Portal() {
  const reducir = useReducedMotion();
  const [listo, setListo] = useState(false);
  const [perfil, setPerfil] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setListo(true), BOOT_MS);
    return () => window.clearTimeout(t);
  }, []);

  const elegido = PERFILES.find((p) => p.id === perfil) ?? null;
  // E49: programas activos de SIGAE (administrables). SICEI: sin programas publicados en el portal.
  const { datos: sigae } = useSitio('sigae');
  const resumen = useResumenConvocatorias();
  const [js, setJs] = useState(false);
  useEffect(() => { setJs(true); }, []);
  const [guiaRef, guiaVisible] = useRevela<HTMLElement>();
  const { ref: heroeRef, texto: estiloTexto, ilustracion: estiloIlus } = useSalidaHeroe();
  const chipsRef = useRef<HTMLDivElement>(null);
  // La barra se compacta al desplazarse.
  const [desplazado, setDesplazado] = useState(false);
  useEffect(() => {
    const alDesplazar = () => setDesplazado(window.scrollY > 90);
    alDesplazar();
    window.addEventListener('scroll', alDesplazar, { passive: true });
    return () => window.removeEventListener('scroll', alDesplazar);
  }, []);

  /** Elige un perfil; en teléfono lleva la vista a la tarjeta de resultado (queda debajo de las opciones). */
  const elegir = (id: string, alternar = true) => {
    const nuevo = alternar && perfil === id ? null : id;
    setPerfil(nuevo);
    if (nuevo && window.innerWidth < 960) {
      window.setTimeout(() => {
        document.getElementById('pt-guia-resultado')?.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth', block: 'nearest' });
      }, 260);
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

      {/* Convivencia oficial de logos en el encabezado (E50, regla del usuario) */}
      <BandaInstitucional />
      <header className="pt-barra" data-desplazado={desplazado || undefined}>
        <BarraProgreso />
        <div className="pt-wrap">
          <div className="pt-barra-fila">
            <Link href="/" className="pt-marca" aria-label={`SIDECyT, portal de sistemas del ${INSTITUTION.name} — inicio`}>
              {/* 16/10/2026 (pedido del usuario): sin el logo COMECYT en la barra; solo el nombre del sistema como logotipo
                  tipográfico. El logo institucional sigue en la franja de arriba y en el pie. */}
              <span className="pt-marca-texto">
                <strong className="pt-marca-nombre">SIDE<span>CyT</span></strong>
                <span className="pt-marca-sub">Portal de sistemas del COMECYT</span>
              </span>
            </Link>
            {/* Secciones de la página (escritorio). En teléfono sobra: todo está a un desplazamiento. */}
            <nav className="pt-barra-nav" aria-label="Secciones">
              <a href="#pt-sistemas">Sistemas</a>
              <a href="#pt-guia">¿Cuál es para mí?</a>
              <a href="#pt-pasos">Cómo funciona</a>
            </nav>
            {/* Family: botón fantasma + una sola píldora de acción (en vino). */}
            <div className="pt-barra-acciones">
              <a href={COMECYT_SITE} target="_blank" rel="noopener noreferrer" className="pt-boton-fantasma" aria-label="Sitio del COMECYT (abre en otra pestaña)">
                <Globe aria-hidden="true" />
                <span className="pt-boton-fantasma-texto">Sitio COMECYT</span>
                <ArrowUpRight className="pt-boton-fantasma-flecha" aria-hidden="true" />
              </a>
              <a href="#pt-sistemas" className="pt-boton-barra">
                <span>Entrar</span><ArrowDown aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </header>

      <main id="pt-contenido">
        <section ref={heroeRef} className="pt-wrap pt-heroe" aria-labelledby="pt-titulo">
          {/* Personajes de ciencia a los lados (escritorio ancho); en teléfono y tableta, una fila compacta arriba.
              Al bajar, el héroe se desvanece (los personajes un poco antes que el texto). */}
          <div className="pt-heroe-lado pt-heroe-lado-izq pt-ilus-entra" style={{ '--i': 1 } as CSSProperties}>
            <motion.div style={estiloIlus}><GrupoIzquierdo /></motion.div>
          </div>
          <motion.div className="pt-heroe-centro" style={estiloTexto}>
            <div className="pt-heroe-compacto pt-ilus-entra" style={{ '--i': 0 } as CSSProperties}><GrupoCompacto /></div>
            <p className="pt-sello pt-entra" style={{ '--i': 0 } as CSSProperties}>
              <span className="pt-sello-sigla"><Sparkles aria-hidden="true" />SIDECyT</span>
              <span>Sistema Digital de Emprendimiento, Ciencia y Talento Mexiquense</span>
            </p>
            <h1 id="pt-titulo" className="pt-titulo pt-entra" style={{ '--i': 1 } as CSSProperties}>
              ¿A qué sistema{' '}
              <span className="pt-subrayado">
                quieres entrar
                <svg className="pt-subrayado-trazo" viewBox="0 0 200 16" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                  <path pathLength={1} d="M3 11 C 50 4, 110 3, 197 8" />
                </svg>
              </span>?
            </h1>
            <p className="pt-heroe-texto pt-entra" style={{ '--i': 2 } as CSSProperties}>
              SIDECyT es la puerta digital del {INSTITUTION.fullName}: reúne <strong>SIGAE</strong>, para el apoyo a
              empresas y emprendedores, y <strong>SICEI</strong>, para las becas a estudiantes y el impulso a la
              investigación. Elige el tuyo; si no sabes cuál, te ayudamos abajo.
            </p>
            <div className="pt-heroe-acciones pt-entra" style={{ '--i': 3 } as CSSProperties}>
              <a href="#pt-sistemas" className="pt-cta" data-variante="principal">
                <span>Ver los sistemas</span><ArrowDown className="pt-cta-flecha pt-cta-flecha-abajo" aria-hidden="true" />
              </a>
              <a href="#pt-guia" className="pt-cta" data-variante="secundario">
                <span>¿No sabes cuál? Te ayudamos</span>
              </a>
            </div>
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
                      <span><Contador valor={resumen.abiertas} animar={!reducir} /> {resumen.abiertas === 1 ? 'convocatoria abierta' : 'convocatorias abiertas'} en SIGAE</span>
                    ) : (
                      <span><Contador valor={resumen.proximas} animar={!reducir} /> {resumen.proximas === 1 ? 'convocatoria próxima a abrir' : 'convocatorias próximas a abrir'}</span>
                    )}
                    <ArrowRight className="pt-senal-flecha" aria-hidden="true" />
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          <div className="pt-heroe-lado pt-heroe-lado-der pt-ilus-entra" style={{ '--i': 2 } as CSSProperties}>
            <motion.div style={estiloIlus}><GrupoDerecho /></motion.div>
          </div>
        </section>

        {/* Lo principal de la página: entra con el héroe (no espera al scroll, que en pantallas bajas no llega). */}
        <section id="pt-sistemas" className="pt-wrap" aria-labelledby="pt-sistemas-titulo">
          <div className="pt-seccion-cabeza pt-entra" style={{ '--i': 4 } as CSSProperties}>
            <TextoScroll id="pt-sistemas-titulo" className="pt-h2" texto="Dos sistemas, una sola puerta" />
            <p className="pt-sub">Cada uno con su registro, sus convocatorias y su seguimiento.</p>
          </div>
          <div className="pt-sistemas">
            {SISTEMAS.map((s, i) => (
              <div key={s.id} id={`pt-sistema-${s.id}`} className="pt-sistema-marco pt-entra" style={{ '--i': 5 + i } as CSSProperties}>
                <TarjetaSistema
                  s={s}
                  destacado={elegido?.sistema === s.id}
                  atenuado={Boolean(elegido) && elegido?.sistema !== s.id}
                  programas={s.id === 'sigae' ? sigae.programas.map((p) => p.nombre) : []}
                />
              </div>
            ))}
          </div>
        </section>

        <section id="pt-guia" ref={guiaRef} className="pt-wrap pt-seccion pt-guia" data-visible={guiaVisible || undefined} aria-labelledby="pt-guia-titulo">
          <AparecerScroll className="pt-guia-caja">
            {/* 30 %: panel vino con las opciones en vidrio líquido (sin blur). */}
            <div className="pt-guia-panel">
              <div className="pt-guia-intro">
                <h2 id="pt-guia-titulo" className="pt-h2">¿Cuál es para mí?</h2>
                <p className="pt-sub">Elige lo que mejor te describe y te mostramos el sistema que te corresponde.</p>
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
                      data-tono={p.tono}
                      style={{ '--k': i } as CSSProperties}
                      onClick={() => elegir(p.id)}
                    >
                      {/* Una sola capa de vidrio que se desliza de una tarjeta a otra (muestra qué cambió). */}
                      {activo && (
                        <motion.span
                          layoutId="pt-chip-activo"
                          className="pt-chip-fondo"
                          transition={reducir ? { duration: 0 } : { type: 'spring' as const, duration: 0.4, bounce: 0.15 }}
                          aria-hidden="true"
                        />
                      )}
                      <span className="pt-chip-contenido">
                        <span className="pt-chip-icono">{p.icono}</span>
                        <span className="pt-chip-texto">
                          <span className="pt-chip-etiqueta">{p.etiqueta}</span>
                          <span className="pt-chip-ayuda">{p.ayuda}</span>
                        </span>
                      </span>
                      <span className="pt-chip-marca" aria-hidden="true"><Check /></span>
                    </button>
                  );
                })}
              </div>
            </div>
            {/* 60 %: lado crema donde aparece la tarjeta del sistema que corresponde (cambio con desvanecido). */}
            <div id="pt-guia-resultado" className="pt-guia-resultado" data-sistema={elegido?.sistema} aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                {elegido ? (
                  <motion.div
                    key={elegido.id}
                    className="pt-resultado"
                    data-sistema={elegido.sistema}
                    initial={reducir ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
                    animate={reducir ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                    exit={reducir ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.16, ease: [0.23, 1, 0.32, 1] } }}
                    transition={{ duration: 0.34, ease: [0.23, 1, 0.32, 1] }}
                  >
                    <div className="pt-resultado-cabeza" style={{ '--n': 0 } as CSSProperties}>
                      <span className="pt-resultado-icono">{SISTEMAS.find((s) => s.id === elegido.sistema)?.icono}</span>
                      <div>
                        <p className="pt-resultado-etiqueta">Te corresponde</p>
                        <p className="pt-resultado-sigla">{elegido.sistema.toUpperCase()}</p>
                      </div>
                    </div>
                    <p className="pt-resultado-nombre" style={{ '--n': 1 } as CSSProperties}>{SISTEMAS.find((s) => s.id === elegido.sistema)?.nombre}</p>
                    <p className="pt-resultado-motivo" style={{ '--n': 2 } as CSSProperties}>{elegido.motivo}</p>
                    <span className="pt-resultado-perfil" data-tono={elegido.tono} style={{ '--n': 3 } as CSSProperties}>
                      <span className="pt-chip-icono">{elegido.icono}</span>Elegiste: {elegido.etiqueta}
                    </span>
                    <EnlaceSistema href={elegido.sistema === 'sigae' ? '/sigae' : '/sicei'} className="pt-cta" data-variante="principal">
                      <span>Ir a {elegido.sistema.toUpperCase()}</span><ArrowRight className="pt-cta-flecha" aria-hidden="true" />
                    </EnlaceSistema>
                  </motion.div>
                ) : (
                  <motion.div
                    key="vacio"
                    className="pt-resultado-vacio"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.14 } }}
                    transition={{ duration: 0.3 }}
                  >
                    <span>Toca una de las opciones para ver la recomendación.</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </AparecerScroll>
        </section>

        <section id="pt-pasos" className="pt-wrap pt-seccion pt-pasos" aria-labelledby="pt-pasos-titulo">
          <div className="pt-seccion-cabeza">
            <TextoScroll id="pt-pasos-titulo" className="pt-h2" texto="Cómo funciona" />
            <p className="pt-sub">Tres pasos, del primer clic a tu proyecto en marcha. Baja para recorrerlos.</p>
          </div>
          <PasosSecuencia pasos={PASOS} />
        </section>

        <section className="pt-wrap pt-seccion pt-accesos" aria-labelledby="pt-accesos-titulo">
          <div className="pt-seccion-cabeza">
            <TextoScroll id="pt-accesos-titulo" className="pt-h2" texto="Accesos rápidos" />
          </div>
          <div className="pt-accesos-sistemas">
            {ACCESOS.map((g) => (
              <AparecerScroll key={g.sistema}><div className="pt-accesos-grupo" data-sistema={g.sistema}>
                <div className="pt-accesos-cabeza">
                  <span className="pt-sistema-icono">{g.icono}</span>
                  <span className="pt-accesos-sigla"><strong>{g.sigla}</strong><span>{g.detalle}</span></span>
                </div>
                <ul className="pt-accesos-lista" aria-label={`Accesos de ${g.sigla}`}>
                  {g.items.map((a) => (
                    <li key={a.href}>
                      <EnlaceSistema href={a.href} className="pt-acceso">
                        <span className="pt-acceso-icono">{a.icono}</span>
                        <span className="pt-acceso-texto">
                          <span className="pt-acceso-etiqueta">{a.etiqueta}</span>
                          <span className="pt-acceso-detalle">{a.detalle}</span>
                        </span>
                        <ArrowRight className="pt-acceso-flecha" aria-hidden="true" />
                      </EnlaceSistema>
                    </li>
                  ))}
                </ul>
              </div></AparecerScroll>
            ))}
          </div>
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
          <a href="/sicei">SICEI · Ciencia, Educación e Innovación</a>
          <Link href="/login">Iniciar sesión</Link>
        </nav>
        <div className="pt-pie-col">
          <p className="pt-pie-titulo">Contacto</p>
          <address className="pt-pie-contacto">
            <span><MapPin aria-hidden="true" />Paseo Colón 112-A, col. Ciprés, C.P. 50120, Toluca, {INSTITUTION.state}</span>
            <a href="tel:+527223190009"><Phone aria-hidden="true" />(722) 319 00 09 al 15</a>
            <a href="tel:8002632628"><Phone aria-hidden="true" />800 2632 628</a>
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
