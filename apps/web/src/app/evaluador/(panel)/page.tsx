'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, CheckCircle2, ClipboardCheck, ClipboardList, KeyRound, LogIn, Repeat, ShieldCheck, TimerOff } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import PastelFrame from '@/components/ui/pastel-frame';
import StatTile from '@/components/ui/stat-tile';
import { Button } from '@/components/ui/button';
import { PANEL_POR_ROL, ROL_ETIQUETA, type RolSlug } from '@/lib/roles';
import {
  type Asignacion, type Resultado, type Sistema, NOMBRE_SISTEMA, SISTEMAS, SUBTITULO_SISTEMA,
  diasRestantes, entrarSicei, listar, quienSoy,
} from '@/lib/evaluacionCompartida';

const ROL_PREVIO = 'sidecyt:rol-previo';

type Estado = { cargando: boolean; resultado: Resultado<Asignacion[]> | null; persona: { nombre: string; rol?: string } | null };
const VACIO: Estado = { cargando: true, resultado: null, persona: null };

function leerRolPrevio(): RolSlug | null {
  try { const v = sessionStorage.getItem(ROL_PREVIO); return v && v in PANEL_POR_ROL ? (v as RolSlug) : null; } catch { return null; }
}

async function cambiarRolSigae(rol: string): Promise<boolean> {
  try {
    const r = await fetch('/api/mis-roles/cambiar', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ rol }),
    });
    return r.ok;
  } catch { return false; }
}

export default function PanelEvaluacionPage() {
  const [estado, setEstado] = useState<Record<Sistema, Estado>>({ sigae: VACIO, sicei: VACIO });
  const [sistema, setSistema] = useState<Sistema>('sigae');
  const [vista, setVista] = useState<'pendientes' | 'concluidas'>('pendientes');
  const [rolPrevio, setRolPrevio] = useState<RolSlug | null>(null);
  const [rolesSigae, setRolesSigae] = useState<string[]>([]);

  const cargar = useCallback(async (s: Sistema) => {
    setEstado((e) => ({ ...e, [s]: { ...e[s], cargando: true } }));
    const [resultado, persona] = await Promise.all([listar(s), quienSoy(s)]);
    setEstado((e) => ({ ...e, [s]: { cargando: false, resultado, persona } }));
    return resultado;
  }, []);

  useEffect(() => {
    const pedido = new URLSearchParams(window.location.search).get('sistema');
    setRolPrevio(leerRolPrevio());
    const init = async () => {
      const [a, b] = await Promise.all([cargar('sigae'), cargar('sicei')]);
      // Pestaña inicial: la que pide el enlace del aviso; si no, la que tiene trabajo pendiente.
      if (pedido === 'sigae' || pedido === 'sicei') setSistema(pedido);
      else if (!(a.ok && a.datos.length) && b.ok && b.datos.length) setSistema('sicei');
      if (!a.ok && a.motivo === 'sin_rol') {
        try {
          const r = await fetch('/api/mis-roles', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
          const j = r.ok ? await r.json() : null;
          setRolesSigae(Array.isArray(j?.roles) ? j.roles.map((x: { slug?: unknown }) => String(x.slug ?? '')) : []);
        } catch { setRolesSigae([]); }
      }
    };
    init();
  }, [cargar]);

  const actual = estado[sistema];
  const lista = useMemo(() => (actual.resultado?.ok ? actual.resultado.datos : []), [actual.resultado]);
  const pendientes = lista.filter((a) => a.estado !== 'concluido');
  const concluidas = lista.filter((a) => a.estado === 'concluido');
  const porVencer = pendientes.filter((a) => { const d = diasRestantes(a.fecha_limite); return d !== null && d >= 0 && d <= 2; }).length;
  const mostrar = vista === 'pendientes' ? pendientes : concluidas;

  const usarRolEvaluador = async () => {
    const previo = estado.sigae.persona?.rol;
    if (await cambiarRolSigae('evaluador')) {
      try { if (previo && previo !== 'evaluador') sessionStorage.setItem(ROL_PREVIO, previo); } catch { /* sin almacenamiento */ }
      window.location.reload();
    }
  };
  const regresarRol = async () => {
    if (!rolPrevio) return;
    if (await cambiarRolSigae(rolPrevio)) {
      try { sessionStorage.removeItem(ROL_PREVIO); } catch { /* sin almacenamiento */ }
      window.location.href = PANEL_POR_ROL[rolPrevio];
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SIDECyT · Panel de evaluación"
        title="Mis evaluaciones"
        description="Evalúa las solicitudes que te asignaron en SIGAE y en SICEI. Cada sistema tiene su propio inicio de sesión."
        icon={<ClipboardCheck className="h-5 w-5" />}
        actions={rolPrevio && estado.sigae.persona?.rol === 'evaluador' ? (
          <Button variant="soft" icon={<Repeat className="h-4 w-4" />} onClick={regresarRol}>
            Regresar a {ROL_ETIQUETA[rolPrevio] ?? 'mi panel'}
          </Button>
        ) : undefined}
      />

      {/* Switch SIGAE / SICEI */}
      <div className="seg-tabs" role="tablist" aria-label="Sistema">
        {SISTEMAS.map((s) => {
          const r = estado[s].resultado;
          const n = r?.ok ? r.datos.filter((a) => a.estado !== 'concluido').length : null;
          return (
            <button key={s} role="tab" aria-selected={sistema === s} data-active={sistema === s ? 'true' : undefined}
              onClick={() => setSistema(s)} className="inline-flex items-center gap-2">
              <span className="font-bold">{NOMBRE_SISTEMA[s]}</span>
              <span className="hidden sm:inline text-xs opacity-75">{SUBTITULO_SISTEMA[s]}</span>
              {n !== null && <span className="pill" data-tone={n ? 'vino' : 'neutral'}>{n}</span>}
            </button>
          );
        })}
      </div>

      {actual.cargando ? (
        <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />)}</div>
      ) : !actual.resultado?.ok ? (
        <SinAcceso
          sistema={sistema}
          motivo={actual.resultado?.motivo ?? 'error'}
          mensaje={actual.resultado && !actual.resultado.ok ? actual.resultado.mensaje : undefined}
          puedeUsarRol={sistema === 'sigae' && rolesSigae.includes('evaluador')}
          onUsarRol={usarRolEvaluador}
          onEntro={() => cargar(sistema)}
        />
      ) : (
        <>
          {actual.persona && (
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Sesión en {NOMBRE_SISTEMA[sistema]}: <strong>{actual.persona.nombre}</strong>
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Por evaluar" value={pendientes.length} icon={<ClipboardList className="h-5 w-5" />} tone="vino" solid />
            <StatTile label="Vencen en 2 días o menos" value={porVencer} icon={<CalendarClock className="h-5 w-5" />} tone="gold" />
            <StatTile label="Dictámenes enviados" value={concluidas.length} icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" />
          </div>

          <PastelFrame tone="butter" title={vista === 'pendientes' ? 'Por evaluar' : 'Dictámenes enviados'}
            aside={(
              <div className="seg-tabs" role="tablist" aria-label="Filtro">
                <button role="tab" aria-selected={vista === 'pendientes'} data-active={vista === 'pendientes' ? 'true' : undefined} onClick={() => setVista('pendientes')}>Pendientes</button>
                <button role="tab" aria-selected={vista === 'concluidas'} data-active={vista === 'concluidas' ? 'true' : undefined} onClick={() => setVista('concluidas')}>Enviados</button>
              </div>
            )}>
            {mostrar.length === 0 ? (
              <div className="empty-state py-10 text-center text-sm text-neutral-500">
                {vista === 'pendientes' ? `No tienes evaluaciones pendientes en ${NOMBRE_SISTEMA[sistema]}.` : 'Aún no has enviado dictámenes en este sistema.'}
              </div>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {mostrar.map((a) => <TarjetaAsignacion key={a.id} sistema={sistema} a={a} />)}
              </ul>
            )}
          </PastelFrame>
        </>
      )}
    </div>
  );
}

function FechaLimite({ fecha, estado }: { fecha: string | null; estado: Asignacion['estado'] }) {
  const d = diasRestantes(fecha);
  if (estado === 'concluido' || d === null) return null;
  const texto = estado === 'vencida' || d < 0 ? 'Vencida' : d === 0 ? 'Vence hoy' : d === 1 ? 'Vence mañana' : `Vence en ${d} días`;
  const tono = estado === 'vencida' || d < 0 ? 'red' : d <= 2 ? 'gold' : 'neutral';
  return <span className="pill inline-flex items-center gap-1" data-tone={tono}>{estado === 'vencida' ? <TimerOff className="h-3.5 w-3.5" /> : <CalendarClock className="h-3.5 w-3.5" />}{texto}</span>;
}

function TarjetaAsignacion({ sistema, a }: { sistema: Sistema; a: Asignacion }) {
  const etiqueta = a.estado === 'concluido' ? 'Ver mi dictamen' : a.estado === 'vencida' ? 'Ver expediente' : a.estado === 'evaluando' ? 'Continuar evaluación' : 'Evaluar';
  return (
    <li className="app-card rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs font-bold text-neutral-500">{a.folio}</span>
        <FechaLimite fecha={a.fecha_limite} estado={a.estado} />
        {a.estado === 'concluido' && a.mi_dictamen && (
          <span className="pill" data-tone="emerald">Enviado · {a.mi_dictamen.puntaje}/{a.mi_dictamen.maximo}</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-neutral-900 dark:text-white line-clamp-2">{a.titulo ?? a.convocatoria}</p>
        <p className="text-sm text-neutral-500 truncate">{a.convocatoria}{a.solicitante ? ` · ${a.solicitante}` : ''}</p>
      </div>
      <div className="mt-auto">
        <Link href={`/evaluador/${sistema}/${a.id}`} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          {etiqueta}
        </Link>
      </div>
    </li>
  );
}

function SinAcceso({ sistema, motivo, mensaje, puedeUsarRol, onUsarRol, onEntro }: {
  sistema: Sistema; motivo: string; mensaje?: string; puedeUsarRol: boolean; onUsarRol: () => void; onEntro: () => void;
}) {
  if (motivo === 'sin_sesion' && sistema === 'sicei') return <EntrarSicei onEntro={onEntro} />;
  if (motivo === 'sin_sesion') {
    return (
      <PastelFrame tone="powder" title="Inicia sesión en SIGAE" description="Para ver tus evaluaciones de Apoyo Empresarial entra con tu cuenta de SIGAE.">
        <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"><LogIn className="h-4 w-4" />Iniciar sesión en SIGAE</Link>
      </PastelFrame>
    );
  }
  if (motivo === 'sin_rol') {
    return (
      <PastelFrame tone="lavender" title={`Tu sesión de ${NOMBRE_SISTEMA[sistema]} no está como evaluador`}
        description={puedeUsarRol ? 'Tienes el rol de evaluador aprobado. Actívalo para ver tus asignaciones; después puedes regresar a tu rol anterior.'
          : sistema === 'sigae' ? 'Tu cuenta no tiene el rol de evaluador en SIGAE. Puedes pedirlo en «Mi cuenta» → «Mis roles».'
            : 'Tu cuenta no tiene el rol de evaluador en SICEI. Lo otorga la administración de SICEI.'}>
        {puedeUsarRol && <Button icon={<Repeat className="h-4 w-4" />} onClick={onUsarRol}>Usar mi rol de evaluador</Button>}
      </PastelFrame>
    );
  }

  return <PastelFrame tone="blush" title="No se pudieron cargar tus evaluaciones" description={mensaje ?? 'Intenta de nuevo en unos minutos.'}>{null}</PastelFrame>;
}

function EntrarSicei({ onEntro }: { onEntro: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [codigo, setCodigo] = useState('');
  const [pideCodigo, setPideCodigo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) { setError('Escribe tu correo y tu contraseña.'); return; }
    if (pideCodigo && !/^\d{6}$/.test(codigo)) { setError('El código tiene 6 dígitos.'); return; }
    setEnviando(true);
    const r = await entrarSicei(email.trim(), password, pideCodigo ? codigo : undefined);
    setEnviando(false);
    if (r.ok && r.datos?.mfa_requerida) { setPideCodigo(true); return; }
    if (r.ok) { setPassword(''); onEntro(); return; }
    const primero = r.errores ? Object.values(r.errores)[0]?.[0] : undefined;
    setError(primero ?? r.mensaje ?? 'No se pudo iniciar sesión.');
  };

  return (
    <PastelFrame tone="mint" title="Inicia sesión en SICEI"
      description="SICEI tiene su propia sesión. Usa la misma cuenta (correo y contraseña) de SIDECyT.">
      <form onSubmit={entrar} className="grid gap-3 max-w-md" noValidate>
        <label className="grid gap-1 text-sm font-medium">Correo
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254}
            className="rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-3 py-2" required />
        </label>
        <label className="grid gap-1 text-sm font-medium">Contraseña
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={200}
            className="rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-3 py-2" required />
        </label>
        {pideCodigo && (
          <label className="grid gap-1 text-sm font-medium"><span className="inline-flex items-center gap-1"><ShieldCheck className="h-4 w-4" />Código de verificación (6 dígitos)</span>
            <input inputMode="numeric" autoComplete="one-time-code" value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-3 py-2 tracking-widest" />
          </label>
        )}
        {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
        <div><Button type="submit" disabled={enviando} icon={<KeyRound className="h-4 w-4" />}>{enviando ? 'Entrando…' : 'Entrar a SICEI'}</Button></div>
      </form>
    </PastelFrame>
  );
}
