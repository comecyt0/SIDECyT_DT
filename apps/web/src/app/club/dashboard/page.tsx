'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { School, Loader2, Package, CalendarClock, Plus, ArrowRight, Shapes } from 'lucide-react';
import api from '@/lib/api';
import PageHeader from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { AlertBox } from '@/components/ui/alert-box';
import StepFrame from '@/components/ui/step-frame';
import EscuelaPicker from '@/components/especie/EscuelaPicker';
import LineaAvanceClub from '@/components/especie/LineaAvanceClub';
import { ESTADO_CLUB, type EscuelaApi } from '@/lib/especie';
import { formatDate } from '@/lib/format';

interface ConvClub {
  id: number; nombre: string; descripcion: string | null; estado_publico: string; acepta: boolean; fecha_limite: string | null; kit: string | null;
  club: { id: number; folio: string; nombre: string; estado: string } | null;
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
  const [convs, setConvs] = useState<ConvClub[]>([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);
  const [registro, setRegistro] = useState<ConvClub | null>(null);
  const [nombre, setNombre] = useState('');
  const [escuela, setEscuela] = useState<EscuelaApi | null>(null);
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
      const { data } = await api.post('/club/clubes', { convocatoria_id: registro.id, escuela_id: escuela?.id, nombre: nombre.trim() });
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
      <PageHeader title="Mi club" icon={<School className="h-5 w-5" />}
        description="Registra a tu club en las convocatorias de Apoyo en especie, completa sus datos y sigue su avance hasta la entrega del kit." />
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
                          <p className="text-xs text-[var(--app-ink-2)]">Folio <span className="font-mono">{club.folio}</span></p>
                        </div>
                        <span className="pill" data-tone={est.tono} data-dot="on">{est.etiqueta}</span>
                      </div>
                      <LineaAvanceClub estado={club.estado} />
                      {club.estado === 'borrador' && c.fecha_limite && (
                        <p className="flex items-center gap-1.5 text-sm text-[var(--app-ink-2)]">
                          <CalendarClock className="h-4 w-4" aria-hidden="true" />
                          {c.acepta ? `Envíalo a revisión antes del ${formatDate(c.fecha_limite)}.` : 'La convocatoria ya cerró el registro.'}
                        </p>
                      )}
                      <Button onClick={() => router.push(`/club/clubes/${club.id}`)}>
                        {club.estado === 'borrador' ? 'Completar mi club' : 'Ver mi club'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="space-y-4" aria-labelledby="convs-abiertas">
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
          </section>
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
            validate: () => (nombre.trim().length < 3 ? 'Escribe el nombre del club (al menos 3 letras).' : !escuela ? 'Elige la escuela del catálogo.' : null),
            content: (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="club-nombre" className="text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]">Nombre del club *</label>
                  <input id="club-nombre" className="auth-input auth-input-static pl-4" maxLength={255} value={nombre} placeholder="Ej. Club de Robótica Los Volcanes"
                    onChange={(e) => setNombre(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="club-escuela" className="text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]">Escuela *</label>
                  <EscuelaPicker id="club-escuela" value={escuela} onChange={setEscuela} />
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
