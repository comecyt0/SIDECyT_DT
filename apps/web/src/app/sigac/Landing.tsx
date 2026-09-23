'use client';

import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from 'framer-motion';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Building2,
  Check,
  CircleAlert,
  ClipboardCheck,
  ClipboardList,
  FileSearch,
  FilePlus,
  FileText,
  FolderCheck,
  GraduationCap,
  Handshake,
  Loader2,
  Mail,
  MapPin,
  Megaphone,
  MessageSquareText,
  Network,
  Phone,
  Rocket,
  Scale,
  Settings2,
  Wrench,
} from 'lucide-react';
import { INSTITUTION, copyrightLine } from '@/lib/institution';
import { useGlobalLoader } from '@/components/ui/GlobalLoader';

/**
 * Landing pública de SIGAC (/sigac), puerta de entrada a las convocatorias de Apoyo Empresarial. Estilos en ./landing.css (prefijo .lp-*), referencia de
 * estilo portrait.so y decisiones en docs/LANDING_SIGAC.md.
 *
 * Contenido honesto: nada de cifras inventadas. Las etapas y los roles salen del ciclo real del
 * sistema (CLAUDE.md, "Estados de Solicitud"); el collage ilustra piezas del expediente, no datos.
 */

type Tone = 'sky' | 'mint' | 'peach';

/** Misma regla que DualBranding: `none` oculta el logo de Edomex (así está en producción). */
const EDOMEX_RAW = process.env.NEXT_PUBLIC_EDOMEX_LOGO_URL;
const EDOMEX_LOGO = EDOMEX_RAW === 'none' ? null : (EDOMEX_RAW || '/logo-edomex.svg');

const EMAIL_RE =/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Mismo mínimo que BOOT_MS en RouteChangeOverlay: la entrada arranca cuando se va el splash. */
const BOOT_MS = 1100;

const HEADLINE = ['Tu', 'proyecto,', 'de', 'la', 'idea', 'al'];
const HEADLINE_ACCENT = 'convenio';

const STEPS: { title: string; body: string; actor: string; icon: ReactNode; tone: Tone }[] = [
  { title: 'Convocatoria', body: 'El COMECYT publica la convocatoria del programa con sus reglas, requisitos, formatos y fechas.', actor: 'COMECYT', icon: <Megaphone />, tone: 'sky' },
  { title: 'Solicitud', body: 'Registras tu proyecto, llenas los campos que pide la convocatoria y adjuntas tus documentos.', actor: 'Solicitante', icon: <FilePlus />, tone: 'mint' },
  { title: 'Revisión documental', body: 'Se valida tu documentación. Si falta algo, recibes observaciones, corriges y reenvías.', actor: 'Revisión', icon: <ClipboardCheck />, tone: 'peach' },
  { title: 'Evaluación técnica', body: 'Especialistas califican el proyecto con los criterios de la convocatoria y emiten un dictamen.', actor: 'Evaluación', icon: <Scale />, tone: 'sky' },
  { title: 'Convenio', body: 'Con el dictamen aprobado se genera el convenio de tu proyecto para firma.', actor: 'COMECYT', icon: <Handshake />, tone: 'mint' },
  { title: 'Ministración', body: 'Firmado el convenio, el apoyo se entrega en una o varias ministraciones.', actor: 'COMECYT', icon: <Banknote />, tone: 'peach' },
  { title: 'Informe final', body: 'Al terminar, entregas el informe con los resultados del proyecto.', actor: 'Solicitante', icon: <FileText />, tone: 'sky' },
  { title: 'Cierre', body: 'Se revisa el informe y el expediente queda cerrado, con todo su historial.', actor: 'COMECYT', icon: <FolderCheck />, tone: 'mint' },
];

const ROLES: { title: string; body: string; icon: ReactNode; tone: Tone | 'mist' }[] = [
  { title: 'Instituciones y empresas solicitantes', body: 'Registran su proyecto, suben documentos, atienden observaciones y siguen cada etapa hasta entregar el informe final.', icon: <Building2 />, tone: 'mint' },
  { title: 'Revisión documental', body: 'Confirma que la documentación esté completa y en regla, y deja observaciones claras cuando algo falta.', icon: <FileSearch />, tone: 'peach' },
  { title: 'Evaluación técnica', body: 'Califica cada proyecto con la rúbrica de su convocatoria y emite el dictamen.', icon: <ClipboardList />, tone: 'sky' },
  { title: 'Administración del COMECYT', body: 'Publica convocatorias, asigna evaluadores, genera convenios y registra las ministraciones.', icon: <Settings2 />, tone: 'mist' },
];

const ACCESS: { title: string; body: string }[] = [
  { title: 'Solicita acceso', body: 'Llena el formulario con los datos de tu empresa o institución y tu correo.' },
  { title: 'Se valida tu solicitud', body: 'La administración del COMECYT revisa tus datos y aprueba el acceso.' },
  { title: 'Entra a SIGAC', body: 'Inicia sesión con tu correo y tu contraseña, y registra tu proyecto.' },
];

/**
 * Programas de Apoyo Empresarial. Fuente: https://comecyt.edomex.gob.mx/apoyo-empresarial y la
 * página de cada programa (consultadas el 23/09/2026). No se ponen fechas ni estatus de convocatoria
 * aquí porque cambian cada año: cada tarjeta enlaza a la página oficial, que sí los publica.
 */
const COMECYT_SITE = 'https://comecyt.edomex.gob.mx';

/** Correo de contacto del pie, indicado por el usuario (23/09/2026). */
const CONTACT_EMAIL = 'proyectos.comecyt@edomex.gob.mx';

const PROGRAMS: {
  title: string; audience: string; body: string; email: string; href: string; icon: ReactNode; tone: Tone;
}[] = [
  {
    title: 'Programa para el Desarrollo de Prototipos',
    audience: 'MiPyMEs, personas físicas con actividad empresarial y cooperativas',
    body: 'Apoyo económico para desarrollar prototipos que resulten de un desarrollo o una innovación tecnológica susceptible de propiedad intelectual, y fortalecer tus capacidades tecnológicas y productivas.',
    email: 'dt.prototipos@edomex.gob.mx',
    href: `${COMECYT_SITE}/apoyo-desarrollo-prototipos`,
    icon: <Wrench />,
    tone: 'sky',
  },
  {
    title: 'Incorporación de Profesionistas para el Fortalecimiento Empresarial',
    audience: 'MiPyMEs y grandes empresas',
    body: 'Apoyo económico para integrar a tu empresa profesionistas con grado de técnico superior universitario, licenciatura, maestría o doctorado, que desarrollen un proyecto tecnológico o de innovación.',
    email: 'focacyte@edomex.gob.mx',
    href: `${COMECYT_SITE}/incorporacion-profesionistas-fortalecimiento-empresarial`,
    icon: <GraduationCap />,
    tone: 'mint',
  },
  {
    title: 'Jóvenes Emprendedores e Innovadores',
    audience: 'Jóvenes de hasta 29 años, estudiantes o egresados de educación superior, que residan en el Estado de México',
    body: 'Apoyo económico para un proyecto de desarrollo tecnológico o de innovación de un producto, proceso o servicio, con el que emprendas una empresa o negocio.',
    email: 'vinculacionempresas@edomex.gob.mx',
    href: `${COMECYT_SITE}/jovenes-emprendedores-innovadores`,
    icon: <Rocket />,
    tone: 'peach',
  },
  {
    title: 'Vinculación de Empresas con Instituciones Educativas y Centros de Investigación',
    audience: 'MiPyMEs y grandes empresas',
    body: 'Apoyo económico para proyectos de innovación y desarrollo tecnológico hechos en colaboración con instituciones de educación media superior, superior o centros de investigación.',
    email: 'sceron.comecyt@edomex.gob.mx',
    href: `${COMECYT_SITE}/vinculacion-empresas`,
    icon: <Network />,
    tone: 'sky',
  },
];

/** Sectores estratégicos que listan las convocatorias 2026 (mismos en los cuatro programas, salvo Agroquímica). */
const SECTORS = [
  'Aeronáutica', 'Agroindustria', 'Agrotecnología', 'Agroquímica', 'Alimentos', 'Ambiental', 'Arquitectura',
  'Automotriz', 'Bioingeniería', 'Biotecnología', 'Desarrollo sustentable', 'Dispositivos médicos',
  'Economía circular', 'Eficiencia energética', 'Electromecánica', 'Farmacéutica', 'Gestión integral de residuos',
  'Informática', 'Inteligencia artificial', 'Logística', 'Manufactura', 'Mecatrónica', 'Movilidad', 'Plásticos',
  'Química', 'Robótica', 'Salud', 'Textil', 'Tecnologías para el agua', 'Telecomunicaciones',
];
const SECTOR_TONES: Tone[] = ['sky', 'mint', 'peach'];

/** Formatos que piden las convocatorias (los nombres exactos y la plantilla cambian por programa). */
const DOCUMENTS: { title: string; body: string }[] = [
  { title: 'Ficha técnica', body: 'Los datos generales de tu proyecto.' },
  { title: 'Plan de trabajo', body: 'Actividades, entregables y tiempos (Anexo 1).' },
  { title: 'Presupuesto', body: 'Cómo se usará el apoyo, por rubro (Anexo 2).' },
  { title: 'Carta de intención', body: 'Tu intención de participar en la convocatoria.' },
  { title: 'Escrito bajo protesta de decir verdad', body: 'O carta compromiso, según el programa.' },
  { title: 'Resumen de la empresa', body: 'Quién eres y a qué se dedica tu empresa.' },
];

/* ───────────────────────── Convocatorias abiertas (API pública) ───────────────────────── */

/** Forma que devuelve GET /api/convocatorias/abiertas (lista blanca del backend, E37). */
type OpenCall = {
  nombre: string;
  programa: string | null;
  descripcion: string | null;
  ejercicio_fiscal: string;
  fecha_apertura: string;
  fecha_cierre: string;
};

type CallsState = { status: 'loading' | 'ready' | 'error'; items: OpenCall[] };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;

/** Valida cada registro antes de pintarlo: el front no confía ciegamente en la respuesta. */
function parseCalls(raw: unknown): OpenCall[] {
  const list = raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)
    ? (raw as { data: unknown[] }).data
    : [];
  return list.slice(0, 12).flatMap((r) => {
    if (!r || typeof r !== 'object') return [];
    const o = r as Record<string, unknown>;
    const nombre = str(o.nombre, 200);
    const cierre = str(o.fecha_cierre, 10);
    const apertura = str(o.fecha_apertura, 10);
    if (!nombre || !cierre || !DATE_RE.test(cierre) || !apertura || !DATE_RE.test(apertura)) return [];
    return [{
      nombre,
      programa: str(o.programa, 150),
      descripcion: str(o.descripcion, 280),
      ejercicio_fiscal: str(o.ejercicio_fiscal, 4) ?? '',
      fecha_apertura: apertura,
      fecha_cierre: cierre,
    }];
  });
}

/** 'YYYY-MM-DD' como fecha local (sin el corrimiento de zona horaria de new Date('YYYY-MM-DD')). */
function localDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function daysLeft(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((localDate(iso).getTime() - today.getTime()) / 86_400_000);
}

const fmtDate = (iso: string) =>
  localDate(iso).toLocaleDateString(INSTITUTION.locale, { day: 'numeric', month: 'long', year: 'numeric' });

function useOpenCalls(): CallsState {
  const [state, setState] = useState<CallsState>({ status: 'loading', items: [] });
  useEffect(() => {
    const ctrl = new AbortController();
    // Ruta relativa: mismo origen (la CSP solo permite connect-src 'self'), sin cookies.
    fetch('/api/convocatorias/abiertas', {
      signal: ctrl.signal,
      credentials: 'omit',
      headers: { Accept: 'application/json' },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: unknown) => setState({ status: 'ready', items: parseCalls(json) }))
      .catch((e: unknown) => {
        if ((e as { name?: string })?.name !== 'AbortError') setState({ status: 'error', items: [] });
      });
    return () => ctrl.abort();
  }, []);
  return state;
}

function OpenCalls({ state }: { state: CallsState }) {
  // El observador va en un contenedor que existe desde el primer render: si se pusiera en la rejilla
  // (que aparece hasta que llegan los datos), useInView nunca la vería y las tarjetas quedarían en opacidad 0.
  const [ref, inView] = useInViewAttr<HTMLDivElement>();
  return (
    <section id="convocatorias" className="lp-section lp-calls-section" aria-labelledby="lp-calls" aria-busy={state.status === 'loading'}>
      <div ref={ref} className="lp-wrap lp-reveal" data-inview={inView ? 'true' : 'false'}>
        <div className="lp-head">
          <h2 id="lp-calls" className="lp-h2">Convocatorias abiertas</h2>
          <p className="lp-h2-sub">Lo que puedes postular hoy en SIGAC. Esta lista se actualiza sola cuando se abre o cierra una convocatoria.</p>
        </div>

        {state.status === 'loading' && (
          <div className="lp-calls" aria-hidden="true">
            {[0, 1, 2].map((i) => <div key={i} className="lp-call lp-call-skeleton" />)}
          </div>
        )}

        {state.status === 'ready' && state.items.length > 0 && (
          <div className="lp-calls">
            {state.items.map((c, i) => {
              const left = daysLeft(c.fecha_cierre);
              const soon = left <= 7;
              return (
                <article key={`${c.nombre}-${c.fecha_cierre}`} className="lp-call lp-reveal-item" style={{ '--i': i } as CSSProperties}>
                  <div className="lp-call-top">
                    <span className="lp-call-live"><span aria-hidden="true" />Abierta</span>
                    <span className="lp-call-left" data-soon={soon ? 'true' : undefined}>
                      {left <= 0 ? 'Cierra hoy' : left === 1 ? 'Queda 1 día' : `Quedan ${left} días`}
                    </span>
                  </div>
                  {c.programa && <p className="lp-call-program">{c.programa}</p>}
                  <h3>{c.nombre}</h3>
                  {c.descripcion && <p className="lp-call-desc">{c.descripcion}</p>}
                  <dl className="lp-call-dates">
                    <div><dt>Abre</dt><dd>{fmtDate(c.fecha_apertura)}</dd></div>
                    <div><dt>Cierra</dt><dd>{fmtDate(c.fecha_cierre)}</dd></div>
                  </dl>
                  <Link href="/login" className="lp-btn lp-btn-ghost lp-call-cta">
                    Postular en SIGAC <ArrowRight className="lp-btn-arrow" aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>
        )}

        {(state.status === 'error' || (state.status === 'ready' && state.items.length === 0)) && (
          <div className="lp-calls-empty" role="status">
            <Megaphone aria-hidden="true" />
            <div>
              <h3>{state.status === 'error' ? 'No pudimos cargar las convocatorias' : 'Por ahora no hay convocatorias abiertas'}</h3>
              <p>
                {state.status === 'error'
                  ? 'Recarga la página en un momento, o consulta los programas de apoyo más abajo.'
                  : 'Revisa los programas de apoyo más abajo: cada uno publica en su página cuándo abre su siguiente convocatoria.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ───────────────────────── Collage ───────────────────────── */

type Pin = { slot: string; r: number; depth: number; content: ReactNode };

function Polaroid({ tone, title, meta, children }: { tone: Tone; title: string; meta: string; children: ReactNode }) {
  return (
    <>
      <div className="lp-polaroid-photo" data-tone={tone}>{children}</div>
      <p className="lp-polaroid-title">{title}</p>
      <p className="lp-polaroid-meta">{meta}</p>
    </>
  );
}

const PINS: Pin[] = [
  {
    slot: 'a', r: -6, depth: 18,
    content: (
      <Polaroid tone="sky" title="Convocatoria" meta="Requisitos y fechas en un lugar">
        <Megaphone />
        <ul className="lp-mini-list">
          <li>Requisitos <Check /></li>
          <li>Documentos <Check /></li>
          <li>Fechas <Check /></li>
        </ul>
      </Polaroid>
    ),
  },
  {
    slot: 'd', r: 5, depth: 22,
    content: (
      <Polaroid tone="peach" title="Convenio" meta="Listo para firma">
        <Handshake />
        <svg className="lp-signature" viewBox="0 0 200 46" aria-hidden="true">
          <path d="M6 32c14-18 24-24 28-16s-10 20-4 20 18-26 24-24-6 22 2 22 14-14 20-16 2 12 8 12 12-10 18-10 8 6 16 4 20-8 32-6 18 2 26-2" />
        </svg>
      </Polaroid>
    ),
  },
  {
    slot: 'b', r: 4, depth: 12,
    content: (
      <Polaroid tone="mint" title="Evaluación técnica" meta="Rúbrica de la convocatoria">
        <Scale />
        <ul className="lp-mini-list">
          {[['Innovación', 4], ['Viabilidad', 3], ['Impacto', 5]].map(([label, on]) => (
            <li key={label as string}>
              {label}
              <span className="lp-dots">
                {[1, 2, 3, 4, 5].map((n) => <i key={n} data-on={n <= (on as number) ? '' : undefined} />)}
              </span>
            </li>
          ))}
        </ul>
      </Polaroid>
    ),
  },
  {
    slot: 'e', r: -4, depth: 14,
    content: (
      <Polaroid tone="sky" title="Expediente" meta="Tus documentos, siempre a la mano">
        <div style={{ display: 'grid', gap: 6 }}>
          <span className="lp-file"><FileText width={14} height={14} /> Ficha técnica.docx</span>
          <span className="lp-file"><FileText width={14} height={14} /> Plan de trabajo.docx</span>
          <span className="lp-file"><FileText width={14} height={14} /> Presupuesto.xlsx</span>
        </div>
      </Polaroid>
    ),
  },
  {
    slot: 'c', r: 8, depth: 8,
    content: (
      <Polaroid tone="peach" title="Revisión documental" meta="Observación del revisor">
        <MessageSquareText />
        <p className="lp-note">Falta firmar la carta de intención. Corrige y reenvía.</p>
      </Polaroid>
    ),
  },
  {
    slot: 'f', r: -7, depth: 10,
    content: (
      <Polaroid tone="mint" title="Ministración" meta="Entrega del apoyo por etapas">
        <Banknote />
        <div>
          <span className="lp-chip-mini">1 de 2</span>
          <div className="lp-bar" style={{ marginTop: 8 }}><i data-on="" /><i /></div>
        </div>
      </Polaroid>
    ),
  },
];

function ParallaxPin({ pin, index, mx, my }: { pin: Pin; index: number; mx: MotionValue<number>; my: MotionValue<number> }) {
  // `transform` completo (no x/y): Framer lo acelera por hardware.
  const transform = useTransform([mx, my], ([x, y]: number[]) => `translate3d(${x * pin.depth}px, ${y * pin.depth}px, 0)`);
  return (
    <div className="lp-pin lp-pin-in" data-slot={pin.slot} style={{ '--i': index } as CSSProperties}>
      <motion.div style={{ transform }}>
        <div className="lp-polaroid" style={{ '--r': `${pin.r}deg` } as CSSProperties}>{pin.content}</div>
      </motion.div>
    </div>
  );
}

function Collage({ reduceMotion }: { reduceMotion: boolean }) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  // Decorativo: resorte suave para que el muro "respire" con el puntero en vez de seguirlo en seco.
  const mx = useSpring(rawX, { stiffness: 60, damping: 18, mass: 0.6 });
  const my = useSpring(rawY, { stiffness: 60, damping: 18, mass: 0.6 });

  useEffect(() => {
    if (reduceMotion) return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1100px)');
    if (!fine.matches) return;
    const onMove = (e: PointerEvent) => {
      rawX.set((e.clientX / window.innerWidth - 0.5) * 2 * -1);
      rawY.set((e.clientY / window.innerHeight - 0.5) * 2 * -1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduceMotion, rawX, rawY]);

  return (
    <div className="lp-collage" aria-hidden="true">
      {PINS.map((pin, i) => <ParallaxPin key={pin.slot} pin={pin} index={i} mx={mx} my={my} />)}
    </div>
  );
}

/* ───────────────────────── Formulario del hero ───────────────────────── */

function EmailClaim() {
  const router = useRouter();
  const { setIsLoading, setMessage } = useGlobalLoader();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'loading'>('idle');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError(`Escribe un correo válido, por ejemplo ${INSTITUTION.emailHint}`);
      return;
    }
    setError(null);
    setState('loading');
    setMessage('Abriendo inicio de sesión…');
    setIsLoading(true);
    router.push(`/login?email=${encodeURIComponent(value)}`);
  };

  return (
    <form className="lp-claim lp-in" style={{ '--i': 9 } as CSSProperties} onSubmit={submit} noValidate>
      <div className="lp-claim-field" data-invalid={error ? 'true' : undefined}>
        <Mail aria-hidden="true" />
        <label htmlFor="lp-email" className="sr-only">Correo institucional</label>
        <input
          id="lp-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          className="lp-claim-input"
          placeholder={INSTITUTION.emailHint}
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
          aria-invalid={error ? true : undefined}
          aria-describedby="lp-email-error"
        />
        <button type="submit" className="lp-btn lp-btn-rainbow" data-state={state} disabled={state === 'loading'} aria-label="Continuar al inicio de sesión">
          {state === 'loading'
            ? <Loader2 className="lp-spin" aria-hidden="true" />
            : <><span className="lp-claim-label">Continuar</span><ArrowRight className="lp-btn-arrow" aria-hidden="true" /></>}
        </button>
      </div>
      <p id="lp-email-error" className="lp-claim-error" role="alert">
        {error && <><CircleAlert aria-hidden="true" />{error}</>}
      </p>
    </form>
  );
}

/* ───────────────────────── Página ───────────────────────── */

function useInViewAttr<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -12% 0px' });
  return [ref, inView] as const;
}

export default function Landing() {
  const prefersReducedMotion = useReducedMotion();
  // En el servidor useReducedMotion da null: aplicar la preferencia solo tras montar (E7).
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduceMotion = mounted && Boolean(prefersReducedMotion);
  const [stepsRef, stepsInView] = useInViewAttr<HTMLOListElement>();
  const [programsRef, programsInView] = useInViewAttr<HTMLUListElement>();
  const calls = useOpenCalls();
  const openCount = calls.status === 'ready' ? calls.items.length : 0;

  useEffect(() => {
    setMounted(true);
    // La entrada espera a que se retire la pantalla de carga del sistema (#boot-splash).
    const t = setTimeout(() => setReady(true), Math.max(0, BOOT_MS - performance.now()) + 160);
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <div className="lp-root" data-ready={ready ? 'true' : 'false'}>
      <noscript>
        <style>{'.lp-root .lp-in,.lp-root .lp-pin-in,.lp-reveal .lp-reveal-item{opacity:1!important}'}</style>
      </noscript>
      <a href="#contenido" className="lp-skip">Saltar al contenido</a>

      {/* ── Nav flotante ── */}
      <header className="lp-nav" data-scrolled={scrolled ? 'true' : 'false'}>
        <nav className="lp-nav-bar" aria-label="Principal">
          <a href="#contenido" className="lp-brand" aria-label="SIGAC, inicio">
            {/* logo-recortado.png = logo.png sin el margen transparente (el dibujo ocupa solo la mitad del alto) */}
            {/* eslint-disable-next-line @next/next/no-img-element -- logo institucional */}
            <img src="/logo-recortado.png" alt="" width={176} height={78} />
            <span className="lp-brand-name">SIGAC</span>
            <span className="lp-swatch" aria-hidden="true" />
          </a>
          {openCount > 0 ? (
            <a href="#convocatorias" className="lp-announce">
              <span className="lp-eyebrow">Abiertas</span>
              {openCount === 1 ? '1 convocatoria abierta' : `${openCount} convocatorias abiertas`}
              <ArrowDown aria-hidden="true" />
            </a>
          ) : (
            <a href="#programas" className="lp-announce">
              <span className="lp-eyebrow">Nuevo</span>
              Conoce los programas de apoyo empresarial
              <ArrowDown aria-hidden="true" />
            </a>
          )}
          <div className="lp-nav-actions">
            <Link href="/solicitar-acceso" className="lp-btn lp-btn-ghost lp-nav-ghost">Solicitar acceso</Link>
            <Link href="/login" className="lp-btn lp-btn-rainbow">Iniciar sesión</Link>
          </div>
        </nav>
      </header>

      <main id="contenido">
        {/* ── Hero ── */}
        <section className="lp-hero" aria-labelledby="lp-title">
          <div className="lp-wrap">
            <div className="lp-hero-inner">
              <p className="lp-hero-org lp-in" style={{ '--i': 0 } as CSSProperties}>
                <span className="lp-swatch" aria-hidden="true" />
                {INSTITUTION.fullName}
              </p>
              <h1 id="lp-title" className="lp-display">
                {HEADLINE.map((w, i) => (
                  <span key={w} className="lp-word lp-in" style={{ '--i': i + 1 } as CSSProperties}>{w} </span>
                ))}
                <span className="lp-word lp-in lp-rainbow-text" style={{ '--i': HEADLINE.length + 1 } as CSSProperties}>
                  {HEADLINE_ACCENT}
                </span>
              </h1>
              <p className="lp-lead lp-in" style={{ '--i': 8 } as CSSProperties}>
                SIGAC es la plataforma del {INSTITUTION.name} para las convocatorias de Apoyo Empresarial:
                postula tu proyecto de ciencia, tecnología e innovación, sigue cada etapa y recibe el apoyo,
                con todo tu expediente en un solo lugar.
              </p>
              <EmailClaim />
              <p className="lp-hero-alt lp-in" style={{ '--i': 10 } as CSSProperties}>
                ¿Todavía no tienes cuenta? <Link href="/solicitar-acceso" className="lp-link">Solicita acceso</Link>
              </p>
            </div>
          </div>
          <Collage reduceMotion={reduceMotion} />
        </section>

        {/* ── Convocatorias abiertas (en vivo desde /api/convocatorias/abiertas) ── */}
        <OpenCalls state={calls} />

        {/* ── Programas de Apoyo Empresarial (contenido de comecyt.edomex.gob.mx) ── */}
        <section id="programas" className="lp-section" aria-labelledby="lp-programas">
          <div className="lp-wrap">
            <div className="lp-head">
              <h2 id="lp-programas" className="lp-h2">Cuatro programas de apoyo, una sola plataforma</h2>
              <p className="lp-h2-sub">
                El {INSTITUTION.name} brinda a empresas y emprendedores asesoría, capacitación y apoyos económicos
                para impulsar proyectos de ciencia, tecnología e innovación en el {INSTITUTION.state}. Todas sus
                convocatorias de Apoyo Empresarial se postulan en SIGAC.
              </p>
            </div>
            <ul ref={programsRef} className="lp-programs lp-reveal" data-inview={programsInView ? 'true' : 'false'}>
              {PROGRAMS.map((p, i) => (
                <li
                  key={p.title}
                  className="lp-program lp-reveal-item"
                  style={{ '--i': i, '--r': `${i % 2 === 0 ? -0.8 : 0.8}deg` } as CSSProperties}
                >
                  <div className="lp-program-top">
                    <span className="lp-role-icon" data-tone={p.tone} aria-hidden="true">{p.icon}</span>
                    <h3>{p.title}</h3>
                  </div>
                  <p className="lp-program-audience"><strong>Para:</strong> {p.audience}</p>
                  <p className="lp-program-body">{p.body}</p>
                  <div className="lp-program-foot">
                    <a href={`mailto:${p.email}`} className="lp-program-mail">
                      <Mail aria-hidden="true" />{p.email}
                    </a>
                    <a href={p.href} target="_blank" rel="noopener noreferrer" className="lp-btn lp-btn-ghost lp-program-link">
                      Ver convocatoria y formatos
                      <ArrowUpRight className="lp-btn-arrow-up" aria-hidden="true" />
                      <span className="sr-only">(abre el sitio del {INSTITUTION.name} en otra pestaña)</span>
                    </a>
                  </div>
                </li>
              ))}
            </ul>
            <p className="lp-note-line">
              Las fechas, montos y requisitos de cada convocatoria se publican en su página oficial. Cuando una
              convocatoria está abierta, la registras aquí en SIGAC.
            </p>
          </div>
        </section>

        {/* ── Sectores estratégicos ── */}
        <section className="lp-section lp-section-tight" aria-labelledby="lp-sectores">
          <div className="lp-wrap">
            <div className="lp-head">
              <h2 id="lp-sectores" className="lp-h2">¿Tu proyecto encaja?</h2>
              <p className="lp-h2-sub">
                Las convocatorias apoyan proyectos en {SECTORS.length} sectores estratégicos para el {INSTITUTION.state}.
              </p>
            </div>
            <ul className="lp-sectors" aria-label="Sectores estratégicos">
              {SECTORS.map((s, i) => (
                <li key={s} className="lp-sector" data-tone={SECTOR_TONES[i % SECTOR_TONES.length]}>{s}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Recorrido (secuencia real: numeración con sentido) ── */}
        <section id="recorrido" className="lp-section" aria-labelledby="lp-recorrido">
          <div className="lp-wrap">
            <div className="lp-head">
              <h2 id="lp-recorrido" className="lp-h2">Ocho etapas, un mismo expediente</h2>
              <p className="lp-h2-sub">
                Desde que se publica la convocatoria hasta el cierre, cada paso queda registrado y sabes en
                qué punto está tu proyecto.
              </p>
            </div>
            <ol ref={stepsRef} className="lp-steps lp-reveal" data-inview={stepsInView ? 'true' : 'false'}>
              {STEPS.map((s, i) => (
                <li
                  key={s.title}
                  className="lp-step lp-reveal-item"
                  style={{ '--i': i, '--r': `${i % 2 === 0 ? -1.2 : 1.1}deg` } as CSSProperties}
                >
                  <div className="lp-step-top" data-tone={s.tone}>
                    <span className="lp-step-num" aria-hidden="true">{i + 1}</span>
                    {s.icon}
                  </div>
                  <h3><span className="sr-only">Etapa {i + 1}: </span>{s.title}</h3>
                  <p>{s.body}</p>
                  <span className="lp-actor">{s.actor}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Documentos que se preparan ── */}
        <section className="lp-section" aria-labelledby="lp-documentos">
          <div className="lp-wrap lp-roles">
            <div className="lp-roles-head">
              <h2 id="lp-documentos" className="lp-h2">Lo que vas a preparar</h2>
              <p className="lp-h2-sub">
                Cada convocatoria publica sus formatos para descargar y llenar. En general piden estos documentos,
                que después adjuntas a tu solicitud en SIGAC.
              </p>
              <ul className="lp-doc-notes">
                <li>Consulta antes la convocatoria, sus <strong>Reglas de Operación</strong> y los Lineamientos del Comité de Admisión y Seguimiento.</li>
                <li>Algunos programas piden una <strong>garantía</strong> con una institución afianzadora.</li>
                <li>En Desarrollo de Prototipos se pide además el <strong>Reporte de Información Tecnológica del IMPI</strong>.</li>
              </ul>
            </div>
            <ul className="lp-docs">
              {DOCUMENTS.map((d) => (
                <li key={d.title} className="lp-doc">
                  <FileText aria-hidden="true" />
                  <div>
                    <h3>{d.title}</h3>
                    <p>{d.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Roles ── */}
        <section className="lp-section" aria-labelledby="lp-roles">
          <div className="lp-wrap lp-roles">
            <div className="lp-roles-head">
              <h2 id="lp-roles" className="lp-h2">Un lugar para cada quien</h2>
              <p className="lp-h2-sub">
                Cada persona entra con su propio perfil y ve solo lo que le toca hacer. Nadie tiene que
                preguntar por correo en qué va un trámite.
              </p>
            </div>
            <ul className="lp-role-list">
              {ROLES.map((r) => (
                <li key={r.title} className="lp-role">
                  <span className="lp-role-icon" data-tone={r.tone} aria-hidden="true">{r.icon}</span>
                  <div>
                    <h3>{r.title}</h3>
                    <p>{r.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Acceso ── */}
        <section className="lp-section" aria-labelledby="lp-acceso">
          <div className="lp-wrap">
            <div className="lp-head">
              <h2 id="lp-acceso" className="lp-h2">¿Cómo obtengo acceso?</h2>
              <p className="lp-h2-sub">Las cuentas se aprueban una por una para proteger la información de cada proyecto.</p>
            </div>
            <ol className="lp-access">
              {ACCESS.map((a, i) => (
                <li key={a.title}>
                  <span className="lp-access-num" aria-hidden="true">{i + 1}</span>
                  <h3><span className="sr-only">Paso {i + 1}: </span>{a.title}</h3>
                  <p>{a.body}</p>
                </li>
              ))}
            </ol>

            <div className="lp-final">
              <span className="lp-final-mark">
                {/* eslint-disable-next-line @next/next/no-img-element -- logo institucional */}
                <img src="/logo.png" alt="" width={72} height={56} />
              </span>
              <div className="lp-final-text">
                <h3>Entra a SIGAC</h3>
                <p>Usa el correo con el que te registraste.</p>
              </div>
              <div className="lp-final-actions">
                <Link href="/solicitar-acceso" className="lp-btn lp-btn-ghost">Solicitar acceso</Link>
                <Link href="/login" className="lp-btn lp-btn-rainbow">
                  Iniciar sesión <ArrowRight className="lp-btn-arrow" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-row">
          <div className="lp-footer-logos">
            {/* eslint-disable-next-line @next/next/no-img-element -- logos institucionales */}
            <img src="/logo-recortado.png" alt={INSTITUTION.name} width={235} height={104} />
            {EDOMEX_LOGO && (
              <>
                <span aria-hidden="true" />
                {/* eslint-disable-next-line @next/next/no-img-element -- logos institucionales */}
                <img src={EDOMEX_LOGO} alt="Gobierno del Estado de México" width={60} height={40} />
              </>
            )}
          </div>
          <nav className="lp-footer-links" aria-label="Legal y enlaces">
            <Link href="/privacidad">Aviso de privacidad</Link>
            <Link href="/terminos">Términos de uso</Link>
            <a href={`${COMECYT_SITE}/apoyo-empresarial`} target="_blank" rel="noopener noreferrer">Apoyo empresarial en comecyt.edomex.gob.mx</a>
          </nav>
        </div>
        {/* Dirección y teléfonos públicos del COMECYT (pie de comecyt.edomex.gob.mx); correo del programa. */}
        <div className="lp-wrap lp-footer-row lp-footer-contact">
          <address>
            <span><MapPin aria-hidden="true" />Paseo Colón 112-A, col. Ciprés, C.P. 50120, Toluca, {INSTITUTION.state}</span>
            <a href="tel:+527223190009"><Phone aria-hidden="true" />(722) 319 00 09 al 15</a>
            <a href="tel:8002632628"><Phone aria-hidden="true" />800 2632 628</a>
            <a href={`mailto:${CONTACT_EMAIL}`}><Mail aria-hidden="true" />{CONTACT_EMAIL}</a>
          </address>
          <p className="lp-footer-copy">{copyrightLine()}</p>
        </div>
      </footer>
    </div>
  );
}
