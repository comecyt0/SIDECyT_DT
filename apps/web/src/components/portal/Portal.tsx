'use client';

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import {
  ArrowRight, ArrowUpRight, Briefcase, Building2, FlaskConical, GraduationCap, Lightbulb, LogIn, Mail, MapPin,
  Megaphone, Phone, Sparkles, UserPlus,
} from 'lucide-react';
import { INSTITUTION, copyrightLine } from '@/lib/institution';
import { useSitio } from '@/lib/sitio';

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
  { href: '/solicitar-acceso', etiqueta: 'Solicitar acceso', detalle: 'Pide tu cuenta para postular', icono: <UserPlus aria-hidden="true" /> },
];

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

function TarjetaSistema({ s, destacado, atenuado, animar, programas = [] }: { s: Sistema; destacado: boolean; atenuado: boolean; animar: boolean; programas?: string[] }) {
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
            {programas.slice(0, 4).map((n) => <li key={n}>{n}</li>)}
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

  return (
    <div className="pt-root" data-listo={listo || reducir ? 'true' : undefined}>
      <a href="#pt-contenido" className="pt-saltar">Saltar al contenido</a>
      <div ref={fondo} className="pt-fondo" data-vivo={animar || undefined} aria-hidden="true">
        <span className="pt-fondo-reticula" />
        <span className="pt-fondo-halo pt-fondo-halo-a" />
        <span className="pt-fondo-halo pt-fondo-halo-b" />
        <span className="pt-fondo-puntero" />
      </div>

      <header className="pt-barra">
        <div className="pt-wrap pt-barra-fila">
          <Link href="/" className="pt-marca" aria-label={`${INSTITUTION.name} — portal de sistemas`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- logo institucional */}
            <img src="/logo-recortado.png" alt={INSTITUTION.name} width={124} height={55} />
            <span className="pt-marca-texto"><strong>SIDECyT</strong><span className="pt-marca-sub">Portal de sistemas</span></span>
          </Link>
          <a href={COMECYT_SITE} target="_blank" rel="noopener noreferrer" className="pt-barra-enlace">
            comecyt.edomex.gob.mx <ArrowUpRight aria-hidden="true" />
          </a>
        </div>
      </header>

      <main id="pt-contenido">
        <section className="pt-wrap pt-heroe" aria-labelledby="pt-titulo">
          <p className="pt-heroe-eyebrow pt-entra" style={{ '--i': 0 } as CSSProperties}>
            <Sparkles aria-hidden="true" /><strong>SIDECyT</strong> · Sistema Digital de Emprendimiento, Ciencia y Talento Mexiquense
          </p>
          <h1 id="pt-titulo" className="pt-titulo pt-entra" style={{ '--i': 1 } as CSSProperties}>
            ¿A qué sistema <span className="pt-subrayado">quieres entrar</span>?
          </h1>
          <p className="pt-heroe-texto pt-entra" style={{ '--i': 2 } as CSSProperties}>
            SIDECyT es la puerta digital del {INSTITUTION.fullName}: reúne <strong>SIGAE</strong>, para el apoyo a
            empresas y emprendedores, y <strong>SICEI</strong>, para las becas a estudiantes y el impulso a la
            investigación. Elige el tuyo; si no sabes cuál, te ayudamos abajo.
          </p>
        </section>

        <section className="pt-wrap pt-sistemas" aria-label="Sistemas del COMECYT">
          {SISTEMAS.map((s, i) => (
            <div key={s.id} className="pt-entra pt-sistema-marco" style={{ '--i': 3 + i } as CSSProperties}>
              <TarjetaSistema
                s={s}
                animar={animar}
                destacado={elegido?.sistema === s.id}
                atenuado={Boolean(elegido) && elegido?.sistema !== s.id}
                programas={s.id === 'sigae' ? sigae.programas.map((p) => p.nombre) : []}
              />
            </div>
          ))}
        </section>

        <section className="pt-wrap pt-guia pt-entra" style={{ '--i': 5 } as CSSProperties} aria-labelledby="pt-guia-titulo">
          <div className="pt-guia-caja">
            <div>
              <h2 id="pt-guia-titulo" className="pt-h2">¿Cuál es para mí?</h2>
              <p className="pt-guia-sub">Elige lo que mejor te describe y marcamos el sistema que te corresponde.</p>
            </div>
            <div className="pt-chips" role="radiogroup" aria-label="¿Quién eres?">
              {PERFILES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={perfil === p.id}
                  className="pt-chip"
                  onClick={() => setPerfil((a) => (a === p.id ? null : p.id))}
                >
                  {p.icono}{p.etiqueta}
                </button>
              ))}
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

        <section className="pt-wrap pt-accesos" aria-labelledby="pt-accesos-titulo">
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
          {/* eslint-disable-next-line @next/next/no-img-element -- logo institucional */}
          <img src="/logo-recortado.png" alt={INSTITUTION.name} width={235} height={104} />
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
