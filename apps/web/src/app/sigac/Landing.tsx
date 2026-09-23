'use client';

import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from 'framer-motion';
import {
  ArrowDown,
  ArrowRight,
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
  Handshake,
  Loader2,
  Mail,
  Megaphone,
  MessageSquareText,
  Scale,
  Settings2,
} from 'lucide-react';
import { INSTITUTION, copyrightLine } from '@/lib/institution';
import { useGlobalLoader } from '@/components/ui/GlobalLoader';

/**
 * Landing pública de SIDECyT (/sigac). Estilos en ./landing.css (prefijo .lp-*), referencia de
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
  { title: 'Convocatoria', body: 'El COMECYT publica la convocatoria con sus requisitos, rubros, documentos y fechas.', actor: 'COMECYT', icon: <Megaphone />, tone: 'sky' },
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
  { title: 'Solicita acceso', body: 'Llena el formulario con los datos de tu institución y tu correo.' },
  { title: 'Se valida tu solicitud', body: 'La administración del COMECYT revisa tus datos y aprueba el acceso.' },
  { title: 'Entra a SIDECyT', body: 'Inicia sesión con tu correo y tu contraseña, y registra tu proyecto.' },
];

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
          <span className="lp-file"><FileText width={14} height={14} /> Proyecto.pdf</span>
          <span className="lp-file"><FileText width={14} height={14} /> Presupuesto.pdf</span>
          <span className="lp-file"><FileText width={14} height={14} /> Carta institucional.pdf</span>
        </div>
      </Polaroid>
    ),
  },
  {
    slot: 'c', r: 8, depth: 8,
    content: (
      <Polaroid tone="peach" title="Revisión documental" meta="Observación del revisor">
        <MessageSquareText />
        <p className="lp-note">Falta la carta de la institución. Corrige y reenvía.</p>
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
          <a href="#contenido" className="lp-brand" aria-label="SIDECyT, inicio">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo pequeño, mismo archivo que el favicon */}
            <img src="/logo.png" alt="" width={44} height={34} />
            <span className="lp-brand-name">SIDECyT</span>
            <span className="lp-swatch" aria-hidden="true" />
          </a>
          <a href="#recorrido" className="lp-announce">
            <span className="lp-eyebrow">Nuevo</span>
            Conoce el recorrido de tu solicitud
            <ArrowDown aria-hidden="true" />
          </a>
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
                SIDECyT es la plataforma del {INSTITUTION.name} para postular proyectos de desarrollo tecnológico
                y vinculación, seguir cada etapa y recibir el apoyo, con todo tu expediente en un solo lugar.
              </p>
              <EmailClaim />
              <p className="lp-hero-alt lp-in" style={{ '--i': 10 } as CSSProperties}>
                ¿Todavía no tienes cuenta? <Link href="/solicitar-acceso" className="lp-link">Solicita acceso</Link>
              </p>
            </div>
          </div>
          <Collage reduceMotion={reduceMotion} />
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
                <h3>Entra a SIDECyT</h3>
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
            <img src="/logo.png" alt={INSTITUTION.name} width={52} height={40} />
            {EDOMEX_LOGO && (
              <>
                <span aria-hidden="true" />
                {/* eslint-disable-next-line @next/next/no-img-element -- logos institucionales */}
                <img src={EDOMEX_LOGO} alt="Gobierno del Estado de México" width={60} height={40} />
              </>
            )}
          </div>
          <nav className="lp-footer-links" aria-label="Legal y contacto">
            <Link href="/privacidad">Aviso de privacidad</Link>
            <Link href="/terminos">Términos de uso</Link>
            <a href={`mailto:${INSTITUTION.contactEmail}`}>{INSTITUTION.contactEmail}</a>
          </nav>
          <p className="lp-footer-copy">{copyrightLine()}</p>
        </div>
      </footer>
    </div>
  );
}
