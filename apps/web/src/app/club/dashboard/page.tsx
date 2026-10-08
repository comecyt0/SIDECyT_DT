'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import CuentaRegresiva from '@/components/especie/CuentaRegresiva';
import { useConfetiAlVer } from '@/lib/confeti';
import { useRouter } from 'next/navigation';
import { School, Loader2, Package, CalendarClock, Plus, ArrowRight, Shapes, PartyPopper } from 'lucide-react';
import api from '@/lib/api';
import PageHeader from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Asterisco } from '@/components/ui/obligatorio';
import { AlertBox } from '@/components/ui/alert-box';
import StepFrame from '@/components/ui/step-frame';
import EscuelaPicker, { type EscuelaElegida } from '@/components/especie/EscuelaPicker';
import LineaAvanceClub from '@/components/especie/LineaAvanceClub';
import CelebracionAceptado from '@/components/especie/CelebracionAceptado';
import Folio from '@/components/ui/folio';
import { useRol } from '@/hooks/useRol';

const PAPEL: Record<string, string> = {
  lider_a: 'Eres líder A', lider_b: 'Eres líder B', director: 'Eres director(a)',
  // 08/10/2026: con el permiso compartido operan el club.
  lider_a_colider: 'Líder A con permiso', lider_b_colider: 'Líder B con permiso', director_colider: 'Director(a) con permiso',
};
import { ESTADO_CLUB } from '@/lib/especie';
import { formatDate } from '@/lib/format';

interface ConvClub {
  id: number; nombre: string; nombre_corto?: string | null; descripcion: string | null; estado_publico: string; acepta: boolean; fecha_limite: string | null; kit: string | null;
  club: { id: number; folio: string; nombre: string; estado: string; vence_at?: string | null; acceso?: string | null } | null;
}

/** Aviso de club aceptado en su tarjeta: confeti cada vez que entra en pantalla (hasta que se entregue el kit, F3). */
function AceptadoMini() {
  const ref = useRef<HTMLParagraphElement>(null);
  useConfetiAlVer(ref, true, { fiesta: true });
  return (
    <p ref={ref} role="status" className="celebra-club-mini">
      <PartyPopper aria-hidden="true" />
      <span>¡Tu club fue aceptado! Entra para ver lo que sigue: kit, carta de resguardo y QR.</span>
    </p>
  );
}

function err(e: unknown, def: string) {
  const d = (e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
  return (d?.errors && Object.values(d.errors).flat()[0]) || d?.message || def;
}

/**
 * E52 · F1 — Inicio del líder de club: convocatorias de Apoyo en especie abiertas y su club en cada una (uno por
 * convocatoria), con su línea de avance.
 */
export default function ClubDashboardPage() {
  const router = useRouter();
  // E61: el acompañante (líder B / director) solo ve los clubes que le compartieron; no registra clubes.
  const { rol } = useRol();
  const acompanante = rol === 'acompanante_club';
  const [convs, setConvs] = useState<ConvClub[]>([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);
  const [registro, setRegistro] = useState<ConvClub | null>(null);
  const [nombre, setNombre] = useState('');
  const [escuela, setEscuela] = useState<EscuelaElegida | null>(null);
  const [creando, setCreando] = useState(false);
  const [errorRegistro, setErrorRegistro] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get('/club/convocatorias');
      setConvs(Array.isArray(data) ? data.filter((c) => c && typeof c.id === 'number') : []);
    } catch (e) {
      setAviso(err(e, 'No se pudieron cargar las convocatorias.'));
    } finally {
      setCargando(false);
    }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  const crear = async () => {
    if (!registro) return;
    setCreando(true);
    setErrorRegistro(null);
    try {
      // E55: escuela del catálogo, o la solicitud propia en revisión.
      const { data } = await api.post('/club/clubes', {
        convocatoria_id: registro.id, nombre: nombre.trim(),
        ...(escuela?.solicitud ? { escuela_solicitud_id: escuela.solicitud.id } : { escuela_id: escuela?.id }),
      });
      const id = Number(data?.club?.id);
      if (Number.isInteger(id) && id > 0) router.push(`/club/clubes/${id}`);
      else { setRegistro(null); void cargar(); }
    } catch (e) {
      setErrorRegistro(err(e, 'No se pudo registrar el club.'));
    } finally {
      setCreando(false);
    }
  };

  const conClub = convs.filter((c) => c.club);
  const disponibles = convs.filter((c) => !c.club && c.acepta);

  return (
    <div className="space-y-8">
      <PageHeader title={acompanante ? 'Clubes que acompaño' : 'Mi club'} icon={<School className="h-5 w-5" />}
        description={acompanante
          ? 'Clubes en los que el líder te dio acceso como líder B o director: sigue su avance, su QR y su logística.'
          : 'Registra a tu club en las convocatorias de Apoyo en especie, completa sus datos y sigue su avance hasta la entrega del kit.'} />
      {!cargando && acompanante && conClub.length === 0 && (
        <div className="empty-state rounded-[20px] bg-[var(--app-card-bg)]">
          <span className="tone-chip" data-tone="violet"><Shapes aria-hidden="true" /></span>
          <p className="font-bold text-[var(--app-ink)]">Todavía no acompañas a ningún club</p>
          <p className="text-sm text-[var(--app-ink-2)]">Cuando un líder te dé acceso a su club, aparecerá aquí y te llegará un correo.</p>
        </div>
      )}
      {aviso && <AlertBox type="error" message={aviso} onClose={() => setAviso(null)} />}

      {cargando ? (
        <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin" aria-label="Cargando" /></div>
      ) : (
        <>
          {conClub.length > 0 && (
            <section className="space-y-4" aria-labelledby="mis-clubes">
              <h2 id="mis-clubes" className="text-base font-bold text-[var(--app-ink)]">Mis clubes</h2>
              <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {conClub.map((c) => {
                  const club = c.club!;
                  const est = ESTADO_CLUB[club.estado] ?? { etiqueta: club.estado, tono: 'neutral' };
                  return (
                    <li key={c.id} className="app-card space-y-4 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-[var(--app-ink-2)]">{c.nombre}</p>
                          <p className="break-words text-lg font-bold text-[var(--app-ink)]">{club.nombre}</p>
                          <p className="text-xs text-[var(--app-ink-2)]">Folio <Folio folio={club.folio} corto={c.nombre_corto} /></p>
                        </div>
                        <span className="flex flex-wrap gap-1.5">{club.acceso && PAPEL[club.acceso] && <span className="pill" data-tone="violet">{PAPEL[club.acceso]}</span>}<span className="pill" data-tone={est.tono} data-dot="on">{est.etiqueta}</span></span>
                      </div>
                      <LineaAvanceClub estado={club.estado} />
                      {club.estado === 'observado' && club.vence_at && (
                        <div className="space-y-1 rounded-[14px] px-3 py-2" style={{ backgroundColor: 'var(--tile-gold-bg)' }}>
                          <p className="text-sm font-semibold text-[var(--app-ink)]">Tu club tiene observaciones: corrígelas a tiempo.</p>
                          <CuentaRegresiva vence={club.vence_at} onVence={() => void cargar()} />
                        </div>
                      )}
                      {club.estado === 'vencido' && <p className="text-sm font-semibold" style={{ color: 'var(--auth-danger)' }}>El plazo para corregir venció; el COMECYT decidirá.</p>}
                      {club.estado === 'aceptado' && <AceptadoMini />}
                      {club.estado === 'aceptado' && (
                        <CelebracionAceptado clubId={club.id} nombreClub={club.nombre} onVerSiguiente={() => router.push(`/club/clubes/${club.id}`)} />
                      )}
                      {club.estado === 'borrador' && c.fecha_limite && (
                        <p className="flex items-center gap-1.5 text-sm text-[var(--app-ink-2)]">
                          <CalendarClock className="h-4 w-4" aria-hidden="true" />
                          {c.acepta ? `Envíalo a revisión antes del ${formatDate(c.fecha_limite)}.` : 'La convocatoria ya cerró el registro.'}
                        </p>
                      )}
                      <Button onClick={() => router.push(`/club/clubes/${club.id}`)}>
                        {club.estado === 'borrador' ? 'Completar mi club' : club.estado === 'observado' ? 'Corregir mi club' : 'Ver mi club'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {!acompanante && <section className="space-y-4" aria-labelledby="convs-abiertas">
            <h2 id="convs-abiertas" className="text-base font-bold text-[var(--app-ink)]">Convocatorias abiertas</h2>
            {disponibles.length === 0 ? (
              <div className="empty-state rounded-[20px] bg-[var(--app-card-bg)]">
                <span className="tone-chip" data-tone="violet"><Shapes aria-hidden="true" /></span>
                <p className="font-bold text-[var(--app-ink)]">{conClub.length ? 'No hay otras convocatorias abiertas' : 'Por ahora no hay convocatorias abiertas'}</p>
                <p className="text-sm text-[var(--app-ink-2)]">Cuando el COMECYT publique una convocatoria de Apoyo en especie, aparecerá aquí para que registres a tu club.</p>
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {disponibles.map((c) => (
                  <li key={c.id} className="app-card flex flex-col gap-3 p-5">
                    <p className="break-words text-lg font-bold text-[var(--app-ink)]">{c.nombre}</p>
                    {c.descripcion && <p className="line-clamp-4 whitespace-pre-wrap break-words text-sm text-[var(--app-ink-2)]">{c.descripcion}</p>}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--app-ink)]">
                      {c.kit && <span className="inline-flex items-center gap-1.5"><Package className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} aria-hidden="true" />{c.kit}</span>}
                      {c.fecha_limite && <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} aria-hidden="true" />Registro hasta el {formatDate(c.fecha_limite)}</span>}
                    </div>
                    <div className="mt-auto pt-1">
                      <Button onClick={() => { setRegistro(c); setNombre(''); setEscuela(null); setErrorRegistro(null); }}>
                        <Plus className="h-4 w-4" aria-hidden="true" /> Registrar mi club
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>}
        </>
      )}

      <StepFrame
        open={registro !== null}
        size="md"
        title="Registrar mi club"
        icon={<School className="h-5 w-5" />}
        intro={<>En <strong>{registro?.nombre}</strong>. Solo puedes registrar un club por convocatoria. Tú quedas como líder y cuentas como integrante.</>}
        onClose={() => setRegistro(null)}
        onSubmit={crear}
        submitting={creando}
        submitLabel="Registrar club"
        error={errorRegistro}
        steps={[
          {
            key: 'club',
            label: 'Tu club',
            question: '¿Cómo se llama tu club y de qué escuela es?',
            validate: () => (nombre.trim().length < 3 ? 'Escribe el nombre del club (al menos 3 letras).' : !escuela ? 'Elige la escuela del catálogo o solicita su registro.' : null),
            content: (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="club-nombre" className="text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]">Nombre del club <Asterisco /></label>
                  <input id="club-nombre" className="auth-input auth-input-static pl-4" maxLength={255} value={nombre} placeholder="Ej. Club de Robótica Los Volcanes"
                    onChange={(e) => setNombre(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="club-escuela" className="text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]">Escuela <Asterisco /></label>
                  <EscuelaPicker id="club-escuela" value={escuela} onChange={setEscuela} convocatoriaId={registro?.id} />
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
