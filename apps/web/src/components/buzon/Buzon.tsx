'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Inbox, Loader2, MessageSquarePlus, RotateCcw, Send } from 'lucide-react';
import api from '@/lib/api';
import { getEcho } from '@/lib/echo';
import UserAvatar from '@/components/ui/user-avatar';
import { AlertBox } from '@/components/ui/alert-box';
import { Button } from '@/components/ui/button';
import { useMiPerfil } from '@/hooks/useMiPerfil';
import { formatDateTime } from '@/lib/format';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const MAX = 2000;
const CATEGORIAS = [
  { key: 'sugerencia', label: 'Sugerencia' },
  { key: 'duda', label: 'Duda' },
  { key: 'problema', label: 'Problema' },
] as const;

interface Persona { id: number; name: string; avatar_url?: string | null; email?: string }
interface Mensaje { id: number; conversacion_id: number; cuerpo: string; created_at: string; leido_at: string | null; autor: (Persona & { rol_id?: number }) | null }
interface Hilo {
  id: number; asunto: string; categoria: string; estado: 'abierta' | 'resuelta'; ultimo_mensaje_at: string | null;
  solicitante?: Persona; convocatoria?: { id: number; nombre: string }; no_leidos?: number;
  ultimo_mensaje?: { cuerpo: string } | null;
}
interface HiloDetalle extends Hilo { mensajes: Mensaje[]; equipo: Persona[]; puede_resolver: boolean }

function err(e: unknown, def: string) {
  const d = (e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
  return (d?.errors && Object.values(d.errors).flat()[0]) || d?.message || def;
}

/**
 * Buzón de sugerencias con chat en tiempo real (E45, punto 2). `modo="solicitante"` abre hilos nuevos sobre sus
 * convocatorias; `modo="equipo"` (admin / admin de convocatoria) atiende y resuelve. La foto de perfil identifica a
 * cada persona. Todo el texto se pinta como texto (React escapa); el servidor limita longitud y participación.
 */
export default function Buzon({ modo }: { modo: 'solicitante' | 'equipo' }) {
  const { perfil } = useMiPerfil();
  const [hilos, setHilos] = useState<Hilo[]>([]);
  const [filtro, setFiltro] = useState<'abierta' | 'resuelta' | 'todas'>('abierta');
  const [activo, setActivo] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<HiloDetalle | null>(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [convs, setConvs] = useState<{ id: number; nombre: string; equipo: Persona[] }[]>([]);
  const [form, setForm] = useState({ convocatoria_id: '', categoria: 'sugerencia', asunto: '', mensaje: '' });
  const fondo = useRef<HTMLDivElement>(null);

  const cargarHilos = useCallback(async () => {
    try {
      const { data } = await api.get('/buzon', { params: { estado: filtro } });
      setHilos(Array.isArray(data) ? data : []);
    } catch (e) {
      setAviso(err(e, 'No se pudo cargar el buzón.'));
    }
  }, [filtro]);

  useEffect(() => { void cargarHilos(); }, [cargarHilos]);

  // ?hilo=ID (enlace del correo de aviso)
  useEffect(() => {
    const h = Number(new URLSearchParams(window.location.search).get('hilo'));
    if (Number.isInteger(h) && h > 0) setActivo(h);
  }, []);

  useEffect(() => {
    if (modo !== 'solicitante') return;
    api.get('/buzon/convocatorias').then(({ data }) => setConvs(Array.isArray(data) ? data : [])).catch(() => setConvs([]));
  }, [modo]);

  const abrir = useCallback(async (id: number) => {
    setActivo(id);
    try {
      const { data } = await api.get(`/buzon/${id}`);
      setDetalle(data as HiloDetalle);
      await api.post(`/buzon/${id}/leer`).catch(() => {});
      setHilos((hs) => hs.map((h) => (h.id === id ? { ...h, no_leidos: 0 } : h)));
    } catch (e) {
      setAviso(err(e, 'No se pudo abrir el hilo.'));
      setDetalle(null);
    }
  }, []);

  useEffect(() => { if (activo) void abrir(activo); }, [activo, abrir]);

  // Tiempo real: canal privado del hilo abierto (el servidor autoriza solo a participantes).
  useEffect(() => {
    if (!activo) return;
    const echo = getEcho(API_BASE);
    if (!echo) return;
    const canal = `conversacion.${activo}`;
    echo.private(canal).listen('.mensaje.enviado', (m: Mensaje) => {
      if (!m || typeof m.cuerpo !== 'string') return;
      setDetalle((d) => (d && d.id === m.conversacion_id && !d.mensajes.some((x) => x.id === m.id) ? { ...d, mensajes: [...d.mensajes, m] } : d));
      void api.post(`/buzon/${activo}/leer`).catch(() => {});
    });
    return () => { echo.leave(canal); };
  }, [activo]);

  useEffect(() => { fondo.current?.scrollTo({ top: fondo.current.scrollHeight }); }, [detalle?.mensajes.length]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const cuerpo = texto.trim();
    if (!detalle || !cuerpo || cuerpo.length > MAX) return;
    setEnviando(true);
    try {
      const { data } = await api.post(`/buzon/${detalle.id}/mensajes`, { cuerpo });
      setDetalle((d) => (d ? { ...d, estado: 'abierta', mensajes: [...d.mensajes, data as Mensaje] } : d));
      setTexto('');
      void cargarHilos();
    } catch (er) {
      setAviso(err(er, 'No se pudo enviar el mensaje.'));
    } finally {
      setEnviando(false);
    }
  };

  const cambiarEstado = async (accion: 'resolver' | 'reabrir') => {
    if (!detalle) return;
    try {
      const { data } = await api.post(`/buzon/${detalle.id}/${accion}`);
      setDetalle((d) => (d ? { ...d, estado: data?.estado ?? d.estado } : d));
      void cargarHilos();
    } catch (er) {
      setAviso(err(er, 'No se pudo actualizar el hilo.'));
    }
  };

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.convocatoria_id || form.asunto.trim().length < 5 || !form.mensaje.trim()) {
      setAviso('Elige la convocatoria y escribe un asunto (mínimo 5 caracteres) y tu mensaje.');
      return;
    }
    setEnviando(true);
    try {
      const { data } = await api.post('/buzon', { ...form, convocatoria_id: Number(form.convocatoria_id), asunto: form.asunto.trim(), mensaje: form.mensaje.trim() });
      setNuevo(false);
      setForm({ convocatoria_id: '', categoria: 'sugerencia', asunto: '', mensaje: '' });
      setFiltro('abierta');
      await cargarHilos();
      setActivo((data as HiloDetalle).id);
    } catch (er) {
      setAviso(err(er, 'No se pudo abrir el hilo.'));
    } finally {
      setEnviando(false);
    }
  };

  const equipoSel = useMemo(() => convs.find((c) => String(c.id) === form.convocatoria_id)?.equipo ?? [], [convs, form.convocatoria_id]);

  return (
    <div className="space-y-4">
      {aviso && <AlertBox type="error" message={aviso} onClose={() => setAviso(null)} />}
      <div className="buzon">
        {/* Lista de hilos */}
        <aside className="buzon-lista flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 p-4">
            <div className="seg-tabs" role="tablist" aria-label="Estado de los hilos">
              {(['abierta', 'resuelta', 'todas'] as const).map((f) => (
                <button key={f} type="button" role="tab" aria-selected={filtro === f} onClick={() => setFiltro(f)} className="text-sm font-semibold">
                  {f === 'abierta' ? 'Abiertos' : f === 'resuelta' ? 'Resueltos' : 'Todos'}
                </button>
              ))}
            </div>
            {modo === 'solicitante' && (
              <Button size="sm" onClick={() => { setNuevo(true); setActivo(null); setDetalle(null); }} aria-label="Nueva sugerencia o consulta">
                <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />Nuevo
              </Button>
            )}
          </div>
          {hilos.length === 0 ? (
            <div className="grid flex-1 place-items-center px-6 py-12 text-center text-sm text-[var(--app-ink-2)]">
              <div><Inbox className="mx-auto mb-2 h-6 w-6" aria-hidden="true" />Sin hilos en esta vista.</div>
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto">
              {hilos.map((h) => {
                const persona = modo === 'equipo' ? h.solicitante : null;
                return (
                  <li key={h.id}>
                    <button type="button" className="buzon-hilo" aria-current={activo === h.id ? 'true' : undefined} onClick={() => { setNuevo(false); setActivo(h.id); }}>
                      <UserAvatar user={persona ?? { name: h.convocatoria?.nombre ?? 'Convocatoria', id: h.convocatoria?.id }} size="md" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-[var(--app-ink)]">{h.asunto}</span>
                          {(h.no_leidos ?? 0) > 0 && <span className="buzon-badge" aria-label={`${h.no_leidos} sin leer`}>{h.no_leidos}</span>}
                        </span>
                        <span className="block truncate text-xs text-[var(--app-ink-2)]">
                          {persona ? `${persona.name} · ` : ''}{h.convocatoria?.nombre ?? ''}
                        </span>
                        <span className="mt-1 flex items-center gap-2 text-[11px] text-[var(--app-ink-2)]">
                          <span className="pill !py-0.5" data-tone={h.categoria === 'problema' ? 'red' : h.categoria === 'duda' ? 'sky' : 'violet'}>{h.categoria}</span>
                          {h.estado === 'resuelta' && <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" aria-hidden="true" />Resuelto</span>}
                          {h.ultimo_mensaje_at && <span>{formatDateTime(h.ultimo_mensaje_at)}</span>}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Hilo / nuevo */}
        <section className="buzon-chat flex flex-col" aria-live="polite">
          {nuevo && modo === 'solicitante' ? (
            <form onSubmit={crear} className="space-y-4 p-6" noValidate>
              <h2 className="perfil-tarjeta-titulo"><MessageSquarePlus aria-hidden="true" />Nueva sugerencia o consulta</h2>
              {convs.length === 0 ? (
                <p className="text-sm text-[var(--app-ink-2)]">Podrás escribir al equipo de una convocatoria cuando tengas una solicitud en ella.</p>
              ) : (
                <>
                  <label className="perfil-campo"><span>Convocatoria</span>
                    <select value={form.convocatoria_id} onChange={(e) => setForm({ ...form, convocatoria_id: e.target.value })} className="h-11 w-full" required>
                      <option value="">Elige…</option>
                      {convs.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </label>
                  {equipoSel.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-[var(--app-ink-2)]">
                      <span className="flex -space-x-2">{equipoSel.slice(0, 4).map((p) => <UserAvatar key={p.id} user={p} size="sm" ring />)}</span>
                      Te responde el equipo de esta convocatoria.
                    </div>
                  )}
                  <label className="perfil-campo"><span>Tipo</span>
                    <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="h-11 w-full">
                      {CATEGORIAS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  </label>
                  <label className="perfil-campo"><span>Asunto</span>
                    <input className="auth-input auth-input-static pl-4" maxLength={160} value={form.asunto} onChange={(e) => setForm({ ...form, asunto: e.target.value })} required />
                  </label>
                  <label className="perfil-campo"><span>Mensaje</span>
                    <textarea className="auth-input auth-input-static min-h-[140px] py-3 pl-4" maxLength={MAX} value={form.mensaje} onChange={(e) => setForm({ ...form, mensaje: e.target.value })} required />
                    <span className="mt-1 block text-right text-xs text-[var(--app-ink-2)]">{form.mensaje.length}/{MAX}</span>
                  </label>
                  <Button type="submit" disabled={enviando}>{enviando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}Enviar</Button>
                </>
              )}
            </form>
          ) : !detalle ? (
            <div className="grid flex-1 place-items-center p-10 text-center text-sm text-[var(--app-ink-2)]">
              <div>
                <Inbox className="mx-auto mb-2 h-7 w-7" aria-hidden="true" />
                {modo === 'solicitante' ? 'Elige un hilo o abre uno nuevo para escribir al equipo de tu convocatoria.' : 'Elige un hilo para leerlo y responder.'}
              </div>
            </div>
          ) : (
            <>
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sg-mist)] p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar user={modo === 'equipo' ? detalle.solicitante : { name: detalle.convocatoria?.nombre, id: detalle.convocatoria?.id }} size="md"
                    href={modo === 'equipo' && detalle.solicitante ? `/admin/perfiles/${detalle.solicitante.id}` : undefined} />
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-[var(--app-ink)]">{detalle.asunto}</h2>
                    <p className="truncate text-xs text-[var(--app-ink-2)]">
                      {modo === 'equipo' ? `${detalle.solicitante?.name ?? ''} · ` : ''}{detalle.convocatoria?.nombre ?? ''} · {detalle.estado === 'resuelta' ? 'Resuelto' : 'Abierto'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {modo === 'solicitante' && detalle.equipo.length > 0 && (
                    <span className="flex -space-x-2" title="Equipo que atiende">{detalle.equipo.slice(0, 4).map((p) => <UserAvatar key={p.id} user={p} size="sm" ring />)}</span>
                  )}
                  {detalle.puede_resolver && detalle.estado === 'abierta' && (
                    <Button size="sm" variant="outline" onClick={() => cambiarEstado('resolver')}><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Marcar resuelto</Button>
                  )}
                  {detalle.estado === 'resuelta' && (
                    <Button size="sm" variant="outline" onClick={() => cambiarEstado('reabrir')}><RotateCcw className="h-4 w-4" aria-hidden="true" />Reabrir</Button>
                  )}
                </div>
              </header>
              <div ref={fondo} className="buzon-mensajes flex-1">
                {detalle.mensajes.map((m) => {
                  const mio = perfil ? m.autor?.id === perfil.id : false;
                  return (
                    <div key={m.id} className="buzon-msg" data-mio={mio ? 'true' : 'false'}>
                      <UserAvatar user={m.autor ?? { name: '—' }} size="sm" />
                      <div className="min-w-0">
                        <div className="buzon-burbuja">{m.cuerpo}</div>
                        <p className="buzon-meta">{mio ? 'Tú' : m.autor?.name ?? '—'} · {formatDateTime(m.created_at)}{mio && m.leido_at ? ' · Leído' : ''}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {(detalle.estado === 'abierta' || modo === 'solicitante') && (
                <form onSubmit={enviar} className="buzon-escribir">
                  <label htmlFor="buzon-texto" className="sr-only">Escribe tu mensaje</label>
                  <textarea id="buzon-texto" value={texto} maxLength={MAX} placeholder="Escribe tu mensaje…" onChange={(e) => setTexto(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement)?.requestSubmit(); } }} />
                  <Button type="submit" disabled={enviando || !texto.trim()} aria-label="Enviar mensaje">
                    {enviando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                  </Button>
                </form>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
