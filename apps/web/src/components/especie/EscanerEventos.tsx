'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Camera, CameraOff, Search, Loader2, CheckCircle2, ScanLine, Users, Sandwich, Package, RotateCcw, ExternalLink, AlertTriangle, CalendarDays, LogIn, LogOut, Bus, BusFront } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Asterisco } from '@/components/ui/obligatorio';
import { mensajeError } from '@/lib/errores-formulario';
import { fechaHora } from '@/lib/especie';
import { formatDate } from '@/lib/format';
import { useLectorQr } from '@/hooks/useLectorQr';
import {
  MODOS, bloqueoModo, cantidadSugerida, esModo, etiquetaCantidad, leerBusqueda, leerConvocatorias, leerFicha, registroDe,
  type ConvocatoriaEscaneo, type FichaEscaneo, type ModoEscaneo, type ResultadoBusqueda,
} from '@/lib/escaneo';

const labelCls = 'text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]';
const inputCls = 'auth-input auth-input-static pl-4';
const CLAVE = 'sidecyt:escaneo';
const ICONO: Record<ModoEscaneo, typeof Users> = { asistencia: LogIn, salida: LogOut, tr_llegada: Bus, tr_regreso: BusFront, lunch: Sandwich, kit: Package };

/** Preferencia del operador (evento y modo) solo en su navegador; si el almacenamiento falla, se empieza de cero. */
function leerPreferencia(): { evento: string; modo: ModoEscaneo } | null {
  try {
    const p = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as { evento?: unknown; modo?: unknown } | null;
    if (p && typeof p.evento === 'string' && esModo(p.modo)) return { evento: p.evento, modo: p.modo };
  } catch { /* sin almacenamiento */ }
  return null;
}

/**
 * E52 · F4 — Escaneo en eventos (operador de evento, admin y admin de convocatoria). El operador elige el evento y el modo
 * (entrada, salida, transporte —llegada y regreso—, box lunch o kit; 02/10/2026), lee el QR del club con la cámara —o lo busca a mano si la cámara falla—, confirma con la
 * ficha del club a la vista (fotos de los integrantes para identificarlo) y registra. Todo lo decide el servidor: alcance,
 * límites (box lunch hasta lo aprobado) y un registro por club, evento y tipo (volver a registrar corrige).
 */
export default function EscanerEventos() {
  const [convs, setConvs] = useState<ConvocatoriaEscaneo[] | null>(null);
  const [evento, setEvento] = useState(''); // "convId:eventoId" o "convId:0" (sin eventos: solo kit)
  const [modo, setModo] = useState<ModoEscaneo>('asistencia');
  const [camara, setCamara] = useState(false);
  const [ficha, setFicha] = useState<FichaEscaneo | null>(null);
  const [metodo, setMetodo] = useState<'qr' | 'manual'>('qr');
  const [cantidad, setCantidad] = useState('');
  const [recibio, setRecibio] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<ResultadoBusqueda[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const volverACamara = useRef(false);
  const ultimoQr = useRef('');
  const ignorar = useRef({ texto: '', hasta: 0 });

  const [convId, eventoId] = evento.split(':').map((x) => Number(x) || 0);
  const convSel = convs?.find((c) => c.id === convId) ?? null;
  const eventoSel = convSel?.eventos.find((e) => e.id === eventoId) ?? null;
  const necesitaEvento = modo !== 'kit';

  useEffect(() => {
    api.get('/escaneo/eventos')
      .then(({ data }) => {
        const lista = leerConvocatorias(data);
        setConvs(lista);
        const pref = leerPreferencia();
        const valido = (v: string) => lista.some((c) => v === `${c.id}:0` || c.eventos.some((e) => v === `${c.id}:${e.id}`));
        const primero = lista[0] ? `${lista[0].id}:${lista[0].eventos[0]?.id ?? 0}` : '';
        setEvento(pref && valido(pref.evento) ? pref.evento : primero);
        if (pref) setModo(pref.modo);
      })
      .catch(() => { setConvs([]); setError('No se pudieron cargar tus eventos. Recarga la página.'); });
  }, []);

  useEffect(() => {
    if (!evento) return;
    try { localStorage.setItem(CLAVE, JSON.stringify({ evento, modo })); } catch { /* sin almacenamiento */ }
  }, [evento, modo]);

  const abrirFicha = useCallback((f: FichaEscaneo, m: 'qr' | 'manual') => {
    setFicha(f);
    setMetodo(m);
    setExito(null);
    setRecibio('');
    setCantidad(cantidadSugerida(f, modo));
  }, [modo]);

  const alLeer = useCallback(async (texto: string) => {
    setCamara(false);
    volverACamara.current = true;
    try { navigator.vibrate?.(40); } catch { /* sin vibración */ }
    setOcupado(true); setError(null);
    try {
      const { data } = await api.post('/escaneo/qr', { contenido: texto, evento_id: eventoId || null });
      const f = leerFicha(data);
      if (f) abrirFicha(f, 'qr'); else setError('Respuesta inesperada del servidor.');
    } catch (e) {
      setError(mensajeError(e, 'QR no válido, revocado o de una convocatoria que no operas.'));
    } finally {
      setOcupado(false);
    }
  }, [eventoId, abrirFicha]);

  // Tras «Siguiente club» se ignora unos segundos el mismo QR (la credencial suele seguir frente a la cámara).
  const lector = useLectorQr(camara, (t) => {
    if (t === ignorar.current.texto && Date.now() < ignorar.current.hasta) return false;
    ultimoQr.current = t;
    void alLeer(t);
    return true;
  });

  // Búsqueda manual con espera corta (no una petición por tecla).
  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) { setResultados(null); return; }
    const id = window.setTimeout(() => {
      setBuscando(true);
      api.get('/escaneo/buscar', { params: { q: t, convocatoria_id: convId || undefined } })
        .then(({ data }) => setResultados(leerBusqueda(data)))
        .catch(() => setResultados([]))
        .finally(() => setBuscando(false));
    }, 350);
    return () => window.clearTimeout(id);
  }, [q, convId]);

  const elegirManual = async (r: ResultadoBusqueda) => {
    setOcupado(true); setError(null); volverACamara.current = false;
    try {
      const { data } = await api.get(`/escaneo/clubes/${r.id}`, { params: { evento_id: eventoId || undefined } });
      const f = leerFicha(data);
      if (f) { abrirFicha(f, 'manual'); setQ(''); setResultados(null); }
    } catch (e) {
      setError(mensajeError(e, 'No se pudo abrir el club.'));
    } finally {
      setOcupado(false);
    }
  };

  const siguiente = () => {
    setFicha(null); setExito(null); setError(null); setCantidad(''); setRecibio('');
    ignorar.current = { texto: ultimoQr.current, hasta: Date.now() + 4000 };
    if (volverACamara.current) setCamara(true);
  };

  const registrar = async () => {
    if (!ficha) return;
    setError(null);
    if (necesitaEvento && !eventoSel) { setError('Elige arriba el evento en el que estás.'); return; }
    let n: number | null = null;
    if (modo !== 'kit') {
      n = Math.trunc(Number(cantidad));
      if (!Number.isInteger(n) || n < 1 || n > 500) { setError('Escribe una cantidad de 1 a 500.'); return; }
      if (modo === 'lunch' && ficha.lunch_aprobado !== null && n > ficha.lunch_aprobado) { setError(`El máximo aprobado para este club es ${ficha.lunch_aprobado}.`); return; }
      const bloqueo = bloqueoModo(ficha, modo);
      if (bloqueo) { setError(bloqueo); return; }
    } else if (!recibio.trim()) { setError('Escribe quién recibe el kit.'); return; }
    setOcupado(true);
    try {
      const { data } = await api.post('/escaneo/registrar', {
        club_id: ficha.club.id, tipo: modo, evento_id: eventoSel?.id ?? null, cantidad: n, recibio: modo === 'kit' ? recibio.trim() : null, metodo,
      });
      const f = leerFicha(data?.ficha);
      if (f) setFicha(f);
      setExito(typeof data?.mensaje === 'string' ? data.mensaje.slice(0, 200) : 'Registrado.');
      try { navigator.vibrate?.([30, 40, 30]); } catch { /* sin vibración */ }
    } catch (e) {
      setError(mensajeError(e, 'No se pudo registrar.'));
    } finally {
      setOcupado(false);
    }
  };

  if (convs === null) return <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin" aria-label="Cargando tus eventos" /></div>;
  if (convs.length === 0) {
    return (
      <div className="empty-state">
        <span className="tone-chip" data-tone="gold"><CalendarDays aria-hidden="true" /></span>
        <p className="font-bold text-[var(--app-ink)]">No tienes eventos para escanear</p>
        <p className="text-sm text-[var(--app-ink-2)]">{error ?? 'Pide al administrador que te asigne una convocatoria de Apoyo en especie con eventos.'}</p>
      </div>
    );
  }

  const IconoModo = ICONO[modo];
  const registroActual = ficha ? registroDe(ficha, modo) : null;
  const bloqueo = ficha ? bloqueoModo(ficha, modo) : null;
  const eventoAjeno = ficha && necesitaEvento && eventoSel && !ficha.evento;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Evento y modo */}
      <section className="app-card space-y-4 p-4 sm:p-5" aria-label="Evento y modo">
        <label className="block space-y-1.5">
          <span className={labelCls}>Evento</span>
          <select className={inputCls} value={evento} onChange={(e) => { setEvento(e.target.value); setFicha(null); setExito(null); }}>
            {convs.map((c) => (
              <optgroup key={c.id} label={c.nombre}>
                {c.eventos.length === 0 && <option value={`${c.id}:0`}>Sin eventos (solo entrega de kit)</option>}
                {c.eventos.map((e) => <option key={e.id} value={`${c.id}:${e.id}`}>{e.nombre}{e.fecha ? ` · ${formatDate(e.fecha)}` : ''}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <div role="radiogroup" aria-label="Qué registras" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {MODOS.map((m) => {
            const Icono = ICONO[m.valor];
            const activo = modo === m.valor;
            return (
              <button key={m.valor} type="button" role="radio" aria-checked={activo} title={m.ayuda}
                onClick={() => { setModo(m.valor); setExito(null); if (ficha) setCantidad(cantidadSugerida(ficha, m.valor)); }}
                className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-[14px] border-2 px-2 py-2 text-sm font-semibold transition-colors duration-150 active:scale-[0.97]"
                style={{ borderColor: activo ? 'var(--auth-vino)' : 'var(--app-rule)', backgroundColor: activo ? 'var(--tile-vino-bg)' : 'transparent', color: 'var(--app-ink)' }}>
                <Icono className="h-5 w-5" aria-hidden="true" />{m.etiqueta}
              </button>
            );
          })}
        </div>
        {necesitaEvento && !eventoSel && <p className="text-sm" style={{ color: 'var(--auth-danger)' }}>Esta convocatoria no tiene eventos: solo puedes registrar la entrega de kits.</p>}
      </section>

      {error && <p role="alert" className="flex items-start gap-2 rounded-[14px] px-4 py-3 text-sm" style={{ backgroundColor: 'var(--tile-vino-bg)', color: 'var(--auth-danger)' }}><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{error}</p>}

      {!ficha ? (
        <>
          {/* Cámara */}
          <section className="app-card space-y-4 p-4 sm:p-5" aria-label="Leer QR">
            <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-[20px] bg-[#0f1720]">
              <video ref={lector.videoRef} className="h-full w-full object-cover" playsInline muted aria-label="Vista de la cámara" style={{ display: camara ? 'block' : 'none' }} />
              {camara && (
                <div className="pointer-events-none absolute inset-[14%] rounded-[18px] border-[3px] border-white/85" aria-hidden="true" style={{ boxShadow: '0 0 0 999px rgba(15,23,32,.35)' }} />
              )}
              {!camara && (
                <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white/80">
                  {ocupado ? <Loader2 className="h-8 w-8 animate-spin" aria-label="Buscando el club" /> : (
                    <span className="space-y-2"><ScanLine className="mx-auto h-10 w-10" aria-hidden="true" /><span className="block">Activa la cámara y apunta al QR de la credencial del club.</span></span>
                  )}
                </div>
              )}
              {camara && !lector.listo && !lector.error && <div className="absolute inset-0 grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-white" aria-label="Abriendo la cámara" /></div>}
            </div>
            {lector.error && <p role="alert" className="text-sm" style={{ color: 'var(--auth-danger)' }}>{lector.error}</p>}
            <div className="flex justify-center">
              {camara
                ? <Button variant="outline" onClick={() => setCamara(false)}><CameraOff className="h-4 w-4" aria-hidden="true" />Detener cámara</Button>
                : <Button disabled={ocupado} onClick={() => { lector.limpiarError(); setError(null); setCamara(true); }}><Camera className="h-4 w-4" aria-hidden="true" />Activar cámara</Button>}
            </div>
          </section>

          {/* Búsqueda manual */}
          <section className="app-card space-y-3 p-4 sm:p-5" aria-labelledby="esc-manual">
            <h2 id="esc-manual" className="flex items-center gap-2 text-sm font-bold text-[var(--app-ink)]"><Search className="h-4 w-4" aria-hidden="true" />¿Sin cámara o el QR no se lee? Busca el club</h2>
            <input type="search" className={inputCls} placeholder="Nombre del club, folio, escuela o CCT" maxLength={120} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar club" />
            {buscando && <p className="text-xs text-[var(--app-ink-2)]">Buscando…</p>}
            {resultados && !buscando && resultados.length === 0 && <p className="text-sm text-[var(--app-ink-2)]">Sin resultados entre los clubes aceptados de esta convocatoria.</p>}
            {resultados && resultados.length > 0 && (
              <ul className="divide-y rounded-[14px] border" style={{ borderColor: 'var(--app-rule)' }}>
                {resultados.map((r) => (
                  <li key={r.id}>
                    <button type="button" disabled={ocupado} onClick={() => void elegirManual(r)} className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left hover:bg-[var(--tile-sky-bg)]">
                      <span className="text-sm font-semibold text-[var(--app-ink)]">{r.nombre}</span>
                      <span className="text-xs text-[var(--app-ink-2)]"><span className="font-mono">{r.folio}</span>{r.escuela ? ` · ${r.escuela}` : ''}{r.municipio ? ` · ${r.municipio}` : ''}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        /* Ficha y confirmación */
        <section className="app-card space-y-5 p-4 sm:p-5" aria-labelledby="esc-club">
          <div className="flex items-start gap-3">
            {ficha.club.logo_url
              ? <img src={ficha.club.logo_url} alt="" className="h-14 w-14 shrink-0 rounded-[14px] object-cover" />
              : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[14px]" style={{ backgroundColor: 'var(--tile-vino-bg)', color: 'var(--auth-vino)' }}><Users className="h-6 w-6" aria-hidden="true" /></span>}
            <div className="min-w-0 flex-1">
              <h2 id="esc-club" className="break-words text-lg font-bold text-[var(--app-ink)]">{ficha.club.nombre}</h2>
              <p className="text-xs text-[var(--app-ink-2)]"><span className="font-mono">{ficha.club.folio}</span>{ficha.club.escuela ? ` · ${ficha.club.escuela.nombre}, ${ficha.club.escuela.municipio}` : ''}</p>
              {ficha.club.lider && <p className="text-xs text-[var(--app-ink-2)]">Líder: {ficha.club.lider.name}{ficha.club.lider.email ? ` · ${ficha.club.lider.email}` : ''}{ficha.club.lider.telefono ? ` · ${ficha.club.lider.telefono}` : ''}</p>}
              <p className="mt-1 text-xs text-[var(--app-ink-2)]">{metodo === 'qr' ? 'Leído con QR' : 'Buscado a mano'}</p>
            </div>
          </div>

          <div>
            <p className={`${labelCls} mb-2`}>Integrantes ({ficha.integrantes.length})</p>
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {ficha.integrantes.map((i, k) => (
                <li key={k} className="flex min-w-0 flex-col items-center gap-1 text-center">
                  {i.foto_url
                    ? <img src={i.foto_url} alt="" loading="lazy" className="h-14 w-14 rounded-full object-cover" style={{ outline: i.es_lider ? '2px solid var(--auth-vino)' : undefined }} />
                    : <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-dashed text-xs text-[var(--app-ink-2)]" style={{ borderColor: 'var(--app-rule)' }} aria-hidden="true">sin foto</span>}
                  <span className="w-full break-words text-[11px] leading-tight text-[var(--app-ink)]">{i.nombre}</span>
                  {i.es_lider && <span className="text-[10px] font-bold" style={{ color: 'var(--auth-vino)' }}>Líder</span>}
                </li>
              ))}
            </ul>
          </div>

          {eventoAjeno && <p role="alert" className="text-sm" style={{ color: 'var(--auth-danger)' }}>Este club es de otra convocatoria: cambia arriba al evento de su convocatoria.</p>}

          {exito ? (
            <div role="status" className="space-y-4 rounded-[16px] p-4 text-center" style={{ backgroundColor: 'var(--tile-emerald-bg)' }}>
              <CheckCircle2 className="mx-auto h-9 w-9" style={{ color: 'var(--tile-emerald-fg)' }} aria-hidden="true" />
              <p className="text-base font-bold text-[var(--app-ink)]">{exito}</p>
              <Button onClick={siguiente}><ScanLine className="h-4 w-4" aria-hidden="true" />Siguiente club</Button>
            </div>
          ) : (
            <div className="space-y-4 rounded-[16px] border-2 p-4" style={{ borderColor: 'var(--auth-vino)' }}>
              <p className="flex items-center gap-2 text-sm font-bold text-[var(--app-ink)]"><IconoModo className="h-4 w-4" aria-hidden="true" />
                {MODOS.find((m) => m.valor === modo)?.etiqueta}{eventoSel && modo !== 'kit' ? ` · ${eventoSel.nombre}` : ''}</p>

              {modo === 'kit' ? (
                ficha.kit.entregado_at ? (
                  <p className="text-sm text-[var(--app-ink)]">Kit ya entregado el {fechaHora(ficha.kit.entregado_at)}{ficha.kit.lugar ? ` en ${ficha.kit.lugar}` : ''}{ficha.kit.recibio ? ` · recibió ${ficha.kit.recibio}` : ''}.</p>
                ) : (
                  <label className="block space-y-1.5">
                    <span className={labelCls}>Quién recibe el kit{ficha.kit.nombre ? ` «${ficha.kit.nombre}»` : ''} <Asterisco /></span>
                    <input className={inputCls} maxLength={150} value={recibio} onChange={(e) => setRecibio(e.target.value)} placeholder="Nombre de quien lo recibe" autoComplete="off" />
                  </label>
                )
              ) : bloqueo ? (
                <p className="flex items-start gap-2 rounded-[12px] px-3 py-2 text-sm font-semibold" style={{ backgroundColor: 'var(--tile-gold-bg)', color: 'var(--app-ink)' }}>
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{bloqueo}
                </p>
              ) : (
                <label className="block space-y-1.5">
                  <span className={labelCls}>{etiquetaCantidad(ficha, modo)}</span>
                  <input type="number" inputMode="numeric" min={1} max={modo === 'lunch' ? (ficha.lunch_aprobado ?? 500) : 500} className={`${inputCls} text-lg font-bold`}
                    value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
                </label>
              )}

              {registroActual && (
                <p className="text-xs text-[var(--app-ink-2)]">Ya registrado: {registroActual.cantidad}{registroActual.quien ? ` por ${registroActual.quien}` : ''}{registroActual.hora ? ` · ${fechaHora(registroActual.hora)}` : ''}. Si registras de nuevo, se corrige.</p>
              )}

              <div className="flex flex-wrap gap-2">
                {!(modo === 'kit' && ficha.kit.entregado_at) && !bloqueo && (
                  <Button className="min-h-12 flex-1" disabled={ocupado || Boolean(eventoAjeno)} onClick={() => void registrar()}>
                    {ocupado ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                    {registroActual ? 'Corregir registro' : modo === 'kit' ? 'Registrar entrega' : 'Registrar'}
                  </Button>
                )}
                <Button variant="outline" className="min-h-12" onClick={siguiente}><RotateCcw className="h-4 w-4" aria-hidden="true" />Otro club</Button>
              </div>
            </div>
          )}

          {ficha.ficha_completa && (
            <Link href={ficha.ficha_completa} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--app-ink)] underline-offset-2 hover:underline">
              <ExternalLink className="h-4 w-4" aria-hidden="true" />Ver la ficha completa del club
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
