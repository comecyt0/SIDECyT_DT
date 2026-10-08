'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Save, Plus, Trash2, CalendarClock, Bus, Sandwich, Settings2, Users, AlertTriangle, QrCode, FileSpreadsheet } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Asterisco } from '@/components/ui/obligatorio';
import StepFrame from '@/components/ui/step-frame';
import AvisoErrores from '@/components/ui/aviso-errores';
import { erroresFormulario, mensajeError, type ErroresFormulario } from '@/lib/errores-formulario';
import { descargarReporteClubes } from '@/lib/especie-api';
import FechaHoraAmPm, { fechaHoraCompleta } from '@/components/ui/fecha-hora-ampm';
import { ESTADO_CLUB, ESTADO_FIRMADO, ESTADO_SOLICITUD, fechaHora, type Cupo } from '@/lib/especie';

interface Evento { id?: number; nombre: string; fecha: string; sede: string; cupo_transporte: string; cupo_lunch: string; con_solicitudes?: boolean }
interface ConfigForm {
  logistica_modo: 'convocatoria' | 'evento'; cupo_transporte: string; cupo_lunch: string; max_transporte_club: string; max_lunch_club: string;
  tope_integrantes: boolean; acompanantes: string; fecha_limite_logistica: string;
}
interface ClubFila {
  id: number; folio: string; nombre: string; estado: string; estatal: boolean; escuela: { nombre: string; municipio: string } | null;
  kit: { fecha: string | null; lugar: string | null; entregado_at: string | null }; resguardo: string | null;
  solicitudes: { id: number; evento: string | null; transporte: number; lunch: number; estado: string; documento: string | null }[]; pendientes_validar: number;
  qr?: boolean;
}
interface Tablero { config: Record<string, unknown>; eventos: Record<string, unknown>[]; uso: { evento_id: number | null; nombre: string; transporte: Cupo; lunch: Cupo }[]; hay_solicitudes: boolean; clubes: ClubFila[] }

const inputCls = 'auth-input auth-input-static pl-4';
const labelCls = 'text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]';
const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));
const n = (v: string) => (v.trim() === '' ? null : Math.trunc(Number(v)));

function aForm(c: Record<string, unknown>): ConfigForm {
  return {
    logistica_modo: c.logistica_modo === 'evento' ? 'evento' : 'convocatoria', cupo_transporte: s(c.cupo_transporte), cupo_lunch: s(c.cupo_lunch),
    max_transporte_club: s(c.max_transporte_club), max_lunch_club: s(c.max_lunch_club), tope_integrantes: c.tope_integrantes !== false,
    acompanantes: s(c.acompanantes ?? 0), fecha_limite_logistica: s(c.fecha_limite_logistica),
  };
}
const aEventos = (e: Record<string, unknown>[]): Evento[] => e.map((x) => ({ id: Number(x.id), nombre: s(x.nombre), fecha: s(x.fecha), sede: s(x.sede), cupo_transporte: s(x.cupo_transporte), cupo_lunch: s(x.cupo_lunch), con_solicitudes: x.con_solicitudes === true }));
const textoCupo = (c: Cupo) => (c.total === null ? `${c.usado} pedidos · sin tope` : `${c.usado} de ${c.total} · quedan ${c.disponible}`);

/**
 * E52 · F3 — Logística de una convocatoria (admin y admin de convocatoria): modo de cupos (convocatoria o evento), topes,
 * límites por club, fecha límite y eventos; uso de cupos; clubes aceptados con su kit, carta de resguardo y solicitudes, y
 * asignación de fecha y lugar del kit a varios clubes a la vez.
 */
export default function LogisticaConvocatoria({ convocatoriaId }: { convocatoriaId: number }) {
  const [t, setT] = useState<Tablero | null>(null);
  const [form, setForm] = useState<ConfigForm | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [errores, setErrores] = useState<ErroresFormulario | null>(null);
  const [sel, setSel] = useState<number[]>([]);
  const [asignar, setAsignar] = useState(false);
  const [kit, setKit] = useState({ fecha: '', lugar: '' });
  const [errKit, setErrKit] = useState<ErroresFormulario | null>(null);
  const [qrOcupado, setQrOcupado] = useState(false);
  const [bajando, setBajando] = useState(false);
  // Una sola selección para dos acciones masivas: el kit solo aplica a los aceptados sin entrega; el QR, a los que no lo tienen.
  const selKit = t ? sel.filter((id) => t.clubes.find((c) => c.id === id)?.estado === 'aceptado') : [];
  const selQr = t ? sel.filter((id) => t.clubes.find((c) => c.id === id)?.qr === false) : [];

  const aplicar = (d: Tablero) => { setT(d); setForm(aForm(d.config)); setEventos(aEventos(d.eventos)); };
  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get(`/revision/convocatorias/${convocatoriaId}/logistica`);
      if (data?.config) aplicar(data);
    } catch {
      setAviso({ ok: false, texto: 'No se pudo cargar la logística de la convocatoria.' });
    } finally {
      setCargando(false);
    }
  }, [convocatoriaId]);
  useEffect(() => { void cargar(); }, [cargar]);

  const guardar = async () => {
    if (!form || !t) return;
    const tope = Number(t.config.max_integrantes) || 10;
    if (form.max_lunch_club.trim() !== '' && Number(form.max_lunch_club) > tope) {
      setAviso({ ok: false, texto: `El box lunch por club no puede pasar del máximo de integrantes de la convocatoria (${tope}).` });
      return;
    }
    setGuardando(true); setErrores(null); setAviso(null);
    try {
      const { data } = await api.put(`/revision/convocatorias/${convocatoriaId}/logistica`, {
        logistica_modo: form.logistica_modo, cupo_transporte: n(form.cupo_transporte), cupo_lunch: n(form.cupo_lunch),
        max_transporte_club: n(form.max_transporte_club), max_lunch_club: n(form.max_lunch_club), tope_integrantes: form.tope_integrantes,
        acompanantes: n(form.acompanantes) ?? 0, fecha_limite_logistica: form.fecha_limite_logistica || null,
        eventos: eventos.map((e) => ({ ...(e.id ? { id: e.id } : {}), nombre: e.nombre.trim(), fecha: e.fecha || null, sede: e.sede.trim() || null, cupo_transporte: n(e.cupo_transporte), cupo_lunch: n(e.cupo_lunch) })),
      });
      aplicar(data);
      setAviso({ ok: true, texto: 'Logística guardada. Los líderes ya ven los cambios.' });
    } catch (e) {
      setErrores(erroresFormulario(e, {
        logistica_modo: 'Modo de cupos', cupo_transporte: 'Cupo de transporte', cupo_lunch: 'Cupo de box lunch', max_transporte_club: 'Máximo de transporte por club',
        max_lunch_club: 'Máximo de box lunch por club', acompanantes: 'Acompañantes', fecha_limite_logistica: 'Fecha límite', eventos: 'Eventos',
      }, {}));
    } finally {
      setGuardando(false);
    }
  };

  const habilitarQr = async () => {
    const ids = selQr;
    if (ids.length === 0) return;
    setQrOcupado(true); setAviso(null);
    try {
      const { data } = await api.post('/revision/qr/habilitar', { club_ids: ids });
      const hechos = Array.isArray(data?.habilitados) ? data.habilitados.length : 0;
      const omitidos: { nombre?: string; motivo?: string }[] = Array.isArray(data?.omitidos) ? data.omitidos : [];
      const detalle = omitidos.slice(0, 5).map((o) => `${String(o.nombre ?? '')} (${String(o.motivo ?? '')})`).join('; ');
      setAviso({ ok: hechos > 0, texto: `QR habilitado a ${hechos} club(es); cada líder recibió un correo.${omitidos.length ? ` Sin habilitar ${omitidos.length}: ${detalle}${omitidos.length > 5 ? '…' : ''}.` : ''}` });
      setSel([]);
      void cargar();
    } catch (e) {
      setAviso({ ok: false, texto: mensajeError(e, 'No se pudo habilitar el QR.') });
    } finally {
      setQrOcupado(false);
    }
  };

  const reporte = async () => {
    setBajando(true);
    try { await descargarReporteClubes(convocatoriaId); } catch { setAviso({ ok: false, texto: 'No se pudo descargar el reporte.' }); } finally { setBajando(false); }
  };

  const asignarKit = async () => {
    setErrKit(null);
    try {
      const { data } = await api.post('/revision/kit/asignar', { club_ids: selKit, fecha: kit.fecha, lugar: kit.lugar.trim() });
      setAsignar(false); setSel([]);
      setAviso({ ok: true, texto: `Fecha y lugar asignados a ${data?.asignados ?? 0} club(es)${data?.omitidos ? `; ${data.omitidos} omitido(s) (kit ya entregado)` : ''}. Cada líder recibió un correo.` });
      void cargar();
    } catch (e) {
      setErrKit(erroresFormulario(e, { fecha: 'Fecha y hora', lugar: 'Lugar', club_ids: 'Clubes' }, {}));
    }
  };

  if (cargando) return <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin" aria-label="Cargando" /></div>;
  if (!t || !form) return <p className="text-sm" style={{ color: 'var(--auth-danger)' }}>{aviso?.texto ?? 'Sin datos.'}</p>;
  const setF = (p: Partial<ConfigForm>) => setForm({ ...form, ...p });
  const pendientesKit = t.clubes.filter((c) => c.estado === 'aceptado');
  // El box lunch nunca pasa del máximo de integrantes de la convocatoria (el servidor lo vuelve a revisar).
  const maxIntegrantes = Number(t.config.max_integrantes) || 10;
  const lunchExcede = form.max_lunch_club.trim() !== '' && Number(form.max_lunch_club) > maxIntegrantes;

  return (
    <div className="space-y-6">
      {aviso && <p role="status" className="rounded-[14px] px-4 py-3 text-sm" style={{ backgroundColor: aviso.ok ? 'var(--tile-emerald-bg)' : 'var(--tile-vino-bg)', color: aviso.ok ? 'var(--app-ink)' : 'var(--auth-danger)' }}>{aviso.texto}</p>}

      {/* Configuración */}
      <section className="app-card space-y-5 p-5" aria-labelledby="log-cfg">
        <h2 id="log-cfg" className="flex items-center gap-2 text-base font-bold text-[var(--app-ink)]"><Settings2 className="h-5 w-5" style={{ color: 'var(--auth-vino)' }} aria-hidden="true" />Transporte y box lunch</h2>
        <p className="text-sm text-[var(--app-ink-2)]">Solo para clubes de escuelas estatales (las federales reciben únicamente el kit). Un campo vacío significa sin tope.</p>
        {errores && <div role="alert" className="rounded-[14px] px-4 py-3 text-sm" style={{ backgroundColor: 'var(--tile-vino-bg)', color: 'var(--auth-danger)' }}><AvisoErrores errores={errores} /></div>}
        <fieldset className="space-y-2">
          <legend className={labelCls}>Los cupos totales son…</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {([['convocatoria', 'De toda la convocatoria', 'Un tope de transporte y otro de box lunch.'], ['evento', 'De cada evento', 'Cada evento con su tope; el líder pide por evento y firma un formato por evento.']] as const).map(([v, tit, d]) => (
              <label key={v} className="flex cursor-pointer items-start gap-3 rounded-[14px] border-2 px-4 py-3"
                style={{ borderColor: form.logistica_modo === v ? 'var(--auth-vino)' : 'var(--app-rule)', opacity: t.hay_solicitudes && form.logistica_modo !== v ? 0.6 : 1 }}>
                <input type="radio" name="log-modo" className="mt-1 accent-[var(--auth-vino)]" checked={form.logistica_modo === v} disabled={t.hay_solicitudes && form.logistica_modo !== v}
                  onChange={() => setF({ logistica_modo: v })} />
                <span><span className="block text-sm font-semibold text-[var(--app-ink)]">{tit}</span><span className="block text-xs text-[var(--app-ink-2)]">{d}</span></span>
              </label>
            ))}
          </div>
          {t.hay_solicitudes && <p className="text-xs text-[var(--app-ink-2)]">Ya hay solicitudes: el modo no se puede cambiar.</p>}
        </fieldset>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {form.logistica_modo === 'convocatoria' && (<>
            <label className="space-y-1.5"><span className={labelCls}>Cupo total de transporte</span>
              <input type="number" min={0} inputMode="numeric" className={inputCls} placeholder="Sin tope" value={form.cupo_transporte} onChange={(e) => setF({ cupo_transporte: e.target.value })} /></label>
            <label className="space-y-1.5"><span className={labelCls}>Cupo total de box lunch</span>
              <input type="number" min={0} inputMode="numeric" className={inputCls} placeholder="Sin tope" value={form.cupo_lunch} onChange={(e) => setF({ cupo_lunch: e.target.value })} /></label>
          </>)}
          <label className="space-y-1.5"><span className={labelCls}>Lugares de transporte por club</span>
            <input type="number" min={0} inputMode="numeric" className={inputCls} placeholder="Sin tope" value={form.max_transporte_club} onChange={(e) => setF({ max_transporte_club: e.target.value })} />
            <span className="block text-xs text-[var(--app-ink-2)]">Tú decides cuántos lugares puede pedir cada club.</span></label>
          <label className="space-y-1.5"><span className={labelCls}>Máx. box lunch por club</span>
            <input type="number" min={0} max={maxIntegrantes} inputMode="numeric" className={inputCls} placeholder={String(maxIntegrantes)} value={form.max_lunch_club}
              aria-invalid={lunchExcede ? 'true' : undefined} onChange={(e) => setF({ max_lunch_club: e.target.value })} />
            <span className="block text-xs" style={{ color: lunchExcede ? 'var(--auth-danger)' : 'var(--app-ink-2)' }}>
              {lunchExcede ? `No puede pasar de ${maxIntegrantes}` : `Hasta ${maxIntegrantes}`} (máximo de integrantes de la convocatoria).</span></label>
          <label className="space-y-1.5"><span className={labelCls}>Fecha límite para pedir</span>
            <input type="date" className={inputCls} value={form.fecha_limite_logistica} onChange={(e) => setF({ fecha_limite_logistica: e.target.value })} /></label>
        </div>

        {/* Eventos */}
        <div className="space-y-3">
          <p className={labelCls}>Eventos</p>
          {eventos.length === 0 && <p className="text-sm text-[var(--app-ink-2)]">{form.logistica_modo === 'evento' ? 'Agrega al menos un evento.' : 'Sin eventos (opcional: los usarás también para el QR y la asistencia).'}</p>}
          <ul className="space-y-3">
            {eventos.map((e, i) => (
              <li key={e.id ?? `n${i}`} className="grid grid-cols-1 gap-3 rounded-[14px] border p-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.2fr_0.8fr_0.8fr_auto]" style={{ borderColor: 'var(--app-rule)' }}>
                <label className="space-y-1"><span className={labelCls}>Nombre</span><input className={inputCls} maxLength={150} value={e.nombre} onChange={(x) => setEventos(eventos.map((y, j) => (j === i ? { ...y, nombre: x.target.value } : y)))} /></label>
                <label className="space-y-1"><span className={labelCls}>Fecha</span><input type="date" className={inputCls} value={e.fecha} onChange={(x) => setEventos(eventos.map((y, j) => (j === i ? { ...y, fecha: x.target.value } : y)))} /></label>
                <label className="space-y-1"><span className={labelCls}>Sede</span><input className={inputCls} maxLength={255} value={e.sede} onChange={(x) => setEventos(eventos.map((y, j) => (j === i ? { ...y, sede: x.target.value } : y)))} /></label>
                {form.logistica_modo === 'evento' ? (<>
                  <label className="space-y-1"><span className={labelCls}>Cupo transp.</span><input type="number" min={0} className={inputCls} placeholder="Sin tope" value={e.cupo_transporte} onChange={(x) => setEventos(eventos.map((y, j) => (j === i ? { ...y, cupo_transporte: x.target.value } : y)))} /></label>
                  <label className="space-y-1"><span className={labelCls}>Cupo lunch</span><input type="number" min={0} className={inputCls} placeholder="Sin tope" value={e.cupo_lunch} onChange={(x) => setEventos(eventos.map((y, j) => (j === i ? { ...y, cupo_lunch: x.target.value } : y)))} /></label>
                </>) : <><span className="hidden lg:block" /><span className="hidden lg:block" /></>}
                <div className="flex items-end">
                  <Button variant="destructive" size="icon-sm" disabled={e.con_solicitudes} aria-label={`Quitar el evento ${e.nombre || i + 1}`} title={e.con_solicitudes ? 'Tiene solicitudes: no se puede quitar' : 'Quitar'}
                    onClick={() => setEventos(eventos.filter((_, j) => j !== i))}><Trash2 /></Button>
                </div>
              </li>
            ))}
          </ul>
          {eventos.length < 30 && <Button variant="outline" size="sm" onClick={() => setEventos([...eventos, { nombre: '', fecha: '', sede: '', cupo_transporte: '', cupo_lunch: '' }])}><Plus className="h-4 w-4" aria-hidden="true" />Agregar evento</Button>}
        </div>
        <div className="flex justify-end">
          <Button onClick={guardar} disabled={guardando}>{guardando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}Guardar logística</Button>
        </div>
      </section>

      {/* Uso de cupos */}
      <section className="app-card space-y-3 p-5" aria-labelledby="log-uso">
        <h2 id="log-uso" className="text-base font-bold text-[var(--app-ink)]">Cupos</h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {t.uso.map((u) => (
            <li key={u.evento_id ?? 0} className="rounded-[14px] border p-3 text-sm" style={{ borderColor: 'var(--app-rule)' }}>
              <p className="font-semibold text-[var(--app-ink)]">{u.nombre}</p>
              <p className="flex items-center gap-1.5 text-[var(--app-ink)]"><Bus className="h-4 w-4" aria-hidden="true" />Transporte: {textoCupo(u.transporte)}</p>
              <p className="flex items-center gap-1.5 text-[var(--app-ink)]"><Sandwich className="h-4 w-4" aria-hidden="true" />Box lunch: {textoCupo(u.lunch)}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Clubes aceptados */}
      <section className="space-y-3" aria-labelledby="log-clubes">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="log-clubes" className="flex items-center gap-2 text-base font-bold text-[var(--app-ink)]"><Users className="h-5 w-5" style={{ color: 'var(--auth-vino)' }} aria-hidden="true" />Clubes aceptados ({t.clubes.length})</h2>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="soft" disabled={bajando} onClick={() => void reporte()}>
              {bajando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />}Reporte en Excel
            </Button>
            {t.clubes.length > 0 && <Button size="sm" variant="outline" onClick={() => setSel(sel.length === t.clubes.length ? [] : t.clubes.map((c) => c.id))}>{sel.length === t.clubes.length ? 'Quitar selección' : 'Seleccionar todos'}</Button>}
            {pendientesKit.length > 0 && <Button size="sm" variant="outline" onClick={() => setSel(pendientesKit.map((c) => c.id))}>Pendientes de kit</Button>}
            <Button size="sm" disabled={selKit.length === 0} onClick={() => { setErrKit(null); setKit({ fecha: '', lugar: '' }); setAsignar(true); }}><CalendarClock className="h-4 w-4" aria-hidden="true" />Asignar fecha y lugar ({selKit.length})</Button>
            <Button size="sm" disabled={selQr.length === 0 || qrOcupado} onClick={() => void habilitarQr()}>
              {qrOcupado ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <QrCode className="h-4 w-4" aria-hidden="true" />}Habilitar QR ({selQr.length})
            </Button>
          </div>
        </div>
        {t.clubes.length === 0 ? <p className="text-sm text-[var(--app-ink-2)]">Todavía no hay clubes aceptados.</p> : (
          <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {t.clubes.map((c) => {
              const est = ESTADO_CLUB[c.estado] ?? { etiqueta: c.estado, tono: 'neutral' };
              const res = c.resguardo ? ESTADO_FIRMADO[c.resguardo] : null;
              return (
                <li key={c.id} className="app-card flex gap-3 p-4">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--auth-vino)]" aria-label={`Seleccionar ${c.nombre}`}
                    checked={sel.includes(c.id)} onChange={(e) => setSel(e.target.checked ? [...sel, c.id] : sel.filter((x) => x !== c.id))} />
                  <div className="min-w-0 flex-1 space-y-1 text-sm">
                    <p className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/clubes/${c.id}`} className="break-words font-semibold text-[var(--app-ink)] underline-offset-2 hover:underline">{c.nombre}</Link>
                      <span className="pill" data-tone={est.tono}>{est.etiqueta}</span>
                      {c.pendientes_validar > 0 && <span className="pill" data-tone="vino"><AlertTriangle className="h-3 w-3" aria-hidden="true" />{c.pendientes_validar} por validar</span>}
                    </p>
                    <p className="text-xs text-[var(--app-ink-2)]"><span className="font-mono">{c.folio}</span>{c.escuela ? ` · ${c.escuela.nombre}` : ''} · {c.estatal ? 'Estatal' : 'Federal (solo kit)'}</p>
                    <p className="text-xs text-[var(--app-ink)]">Kit: {c.kit.entregado_at ? `entregado ${fechaHora(c.kit.entregado_at)}` : c.kit.fecha ? `${fechaHora(c.kit.fecha)} · ${c.kit.lugar ?? ''}` : 'sin fecha asignada'}</p>
                    <p className="text-xs text-[var(--app-ink)]">Resguardo: {res ? res.etiqueta : 'sin subir'} · QR: {c.qr ? 'habilitado' : c.resguardo === 'aprobado' ? 'listo para habilitar' : 'falta resguardo aprobado'}</p>
                    {c.estatal && c.solicitudes.map((x) => (
                      <p key={x.id} className="text-xs text-[var(--app-ink)]">{x.evento ? `${x.evento}: ` : ''}transporte {x.transporte} · lunch {x.lunch} · {ESTADO_SOLICITUD[x.estado]?.etiqueta ?? x.estado}</p>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <StepFrame
        open={asignar}
        size="md"
        title="Fecha y lugar de entrega del kit"
        icon={<CalendarClock className="h-5 w-5" />}
        intro={<>Se asigna a <strong>{selKit.length} club(es)</strong>; cada líder recibirá un correo.</>}
        onClose={() => setAsignar(false)}
        onSubmit={asignarKit}
        submitLabel="Asignar"
        error={errKit ? <AvisoErrores errores={errKit} /> : null}
        steps={asignar ? [{
          key: 'kit', label: 'Entrega', question: '¿Cuándo y dónde se entrega?',
          validate: () => (!fechaHoraCompleta(kit.fecha) ? 'Indica la fecha y la hora de entrega (con a. m. o p. m.).' : !kit.lugar.trim() ? 'Indica el lugar de entrega.' : null),
          content: (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><FechaHoraAmPm value={kit.fecha} onChange={(v) => setKit({ ...kit, fecha: v })} etiquetaFecha="Fecha de entrega *" etiquetaHora="Hora de entrega *" /></div>
              <label className="space-y-1.5"><span className={labelCls}>Lugar <Asterisco /></span><input className={inputCls} maxLength={255} value={kit.lugar} placeholder="Ej. Auditorio COMECYT, Toluca" onChange={(e) => setKit({ ...kit, lugar: e.target.value })} /></label>
            </div>
          ),
        }] : []}
      />
    </div>
  );
}
