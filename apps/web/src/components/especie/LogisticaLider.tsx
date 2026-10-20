'use client';

import { useRef, useState } from 'react';
import { Package, FileSignature, Bus, Sandwich, FileDown, Upload, Loader2, Send, CalendarClock, CheckCircle2, Trash2, MapPin } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import VersionesFirmadas from '@/components/especie/VersionesFirmadas';
import QrLider from '@/components/especie/QrLider';
import { mensajeError } from '@/lib/errores-formulario';
import { descargarFirmado, descargarFormatoLogistica, descargarResguardo } from '@/lib/especie-api';
import { ESTADO_SOLICITUD, fechaHora, fechaHoraLocal, leerLogistica, urlMapa, vigente, type LogisticaEstado, type SolicitudLogistica } from '@/lib/especie';
import { formatDate } from '@/lib/format';
import ModalidadChip from '@/components/especie/ModalidadChip';
import { useVistaPrevia } from '@/components/ui/VistaPreviaProvider';

const labelCls = 'text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]';

function subir(url: string, archivo: File, extra: Record<string, string>) {
  const fd = new FormData();
  fd.append('archivo', archivo);
  for (const [k, v] of Object.entries(extra)) fd.append(k, v);
  // E32: sin Content-Type propio, el navegador arma el multipart con su boundary.
  return api.post(url, fd, { headers: { 'Content-Type': undefined } });
}

function BotonSubir({ etiqueta, disabled, onArchivo: alElegir, onNoPdf, children }: { etiqueta: string; disabled?: boolean; onArchivo: (f: File) => void; onNoPdf?: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLInputElement>(null);
  const { confirmarSubida } = useVistaPrevia();
  // Solo PDF (el servidor vuelve a revisar el contenido real del archivo); antes de subirlo, vista previa (02/10/2026).
  const onArchivo = (f: File) => {
    if (!(f.type === 'application/pdf' || /\.pdf$/i.test(f.name))) { onNoPdf?.(); return; }
    void confirmarSubida(f).then((r) => { if (r === 'subir') alElegir(f); else if (r === 'otro') ref.current?.click(); });
  };
  return (
    <>
      <Button size="sm" disabled={disabled} onClick={() => ref.current?.click()} aria-label={etiqueta}>{children}</Button>
      {/* Formatos firmados y escaneados: solo PDF (pedido del usuario, 02/10/2026). */}
      <input ref={ref} type="file" accept="application/pdf,.pdf" className="sr-only" tabIndex={-1} aria-hidden="true"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onArchivo(f); e.target.value = ''; }} />
    </>
  );
}

/**
 * E52 · F3 — Logística del club aceptado, del lado del líder: fecha y lugar del kit (y su entrega), carta de resguardo
 * (descargar, firmar, subir; la valida el COMECYT) y, solo en escuelas estatales, transporte y box lunch por convocatoria
 * o por evento, con límites, cupo disponible, fecha límite y confirmación al no querer transporte.
 */
export default function LogisticaLider({ clubId, folio, logistica, onCambio, onAviso, soloLectura = false }: {
  clubId: number; folio: string; logistica: LogisticaEstado;
  /** E61: líder B y director (sin compartir el rol de líder) ven todo, pero no piden ni suben nada. */
  soloLectura?: boolean;
  onCambio: (l: LogisticaEstado) => void; onAviso: (ok: boolean, texto: string) => void;
}) {
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [cantidades, setCantidades] = useState<Record<string, { transporte: string; lunch: string }>>({});
  const [confirmarSinTransporte, setConfirmarSinTransporte] = useState<SolicitudLogistica | null>(null);
  const [bajar, setBajar] = useState<SolicitudLogistica | null>(null);
  const l = logistica;
  // E71: apoyos que da la convocatoria.
  const daT = l.apoyos.incluye_transporte;
  const daL = l.apoyos.incluye_lunch;
  const tituloApoyos = daT && daL ? 'Transporte y box lunch' : daT ? 'Transporte' : 'Box lunch';
  const clave = (s: SolicitudLogistica) => String(s.evento?.id ?? 0);
  const valor = (s: SolicitudLogistica, campo: 'transporte' | 'lunch') => cantidades[clave(s)]?.[campo] ?? String(s.solicitud && s.solicitud.estado !== 'cancelada' ? s.solicitud[campo] : 0);

  const ejecutar = async (id: string, fn: () => Promise<{ data: unknown }>, exito: string) => {
    setOcupado(id);
    try {
      const { data } = await fn();
      const x = leerLogistica(data);
      if (x) onCambio(x);
      onAviso(true, exito);
      return true;
    } catch (e) {
      onAviso(false, mensajeError(e, 'No se pudo completar la acción.'));
      return false;
    } finally {
      setOcupado(null);
    }
  };

  const enviar = async (s: SolicitudLogistica, confirmoSinTransporte = false) => {
    const t = daT ? Math.trunc(Number(valor(s, 'transporte'))) : 0;
    const lu = daL ? Math.trunc(Number(valor(s, 'lunch'))) : 0;
    if (!daT) confirmoSinTransporte = true;
    if (!Number.isInteger(t) || !Number.isInteger(lu) || t < 0 || lu < 0) { onAviso(false, 'Escribe cantidades válidas (0 o más).'); return; }
    if (l.limites.transporte !== null && t > l.limites.transporte) { onAviso(false, `El máximo de transporte para tu club es ${l.limites.transporte}.`); return; }
    if (l.limites.lunch !== null && lu > l.limites.lunch) { onAviso(false, `El máximo de box lunch para tu club es ${l.limites.lunch}.`); return; }
    if (t === 0 && !confirmoSinTransporte) { setConfirmarSinTransporte(s); return; }
    const ok = await ejecutar(`sol-${clave(s)}`, () => api.post(`/club/clubes/${clubId}/logistica`, {
      evento_id: s.evento?.id ?? null, transporte: t, lunch: lu, confirmo_sin_transporte: confirmoSinTransporte,
    }), 'Solicitud enviada: tu lugar quedó apartado. Ahora descarga el formato, fírmalo y súbelo.');
    if (ok) setCantidades((c) => { const n = { ...c }; delete n[clave(s)]; return n; });
  };

  const descargar = async (id: string, fn: () => Promise<void>) => {
    setOcupado(id);
    try { await fn(); } catch { onAviso(false, 'No se pudo descargar el documento.'); } finally { setOcupado(null); }
  };

  const resguardoVig = vigente(l.resguardo);
  const abierta = l.abierta && !soloLectura;

  return (
    <section className="space-y-4" aria-labelledby="sec-logistica">
      <h2 id="sec-logistica" className="flex flex-wrap items-center gap-2 text-base font-bold text-[var(--app-ink)]"><Package className="h-5 w-5" style={{ color: 'var(--auth-vino)' }} aria-hidden="true" />Logística<ModalidadChip modalidad={l.modalidad} className="ml-auto" /></h2>

      {soloLectura && (
        <p className="rounded-[14px] px-4 py-3 text-sm" style={{ backgroundColor: 'var(--tile-sky-bg)', color: 'var(--app-ink)' }}>
          Aquí ves la logística de tu club. Las solicitudes y los documentos firmados los atiende el líder del club.
        </p>
      )}

      {/* F4 — QR y credencial */}
      <QrLider clubId={clubId} folio={folio} qr={l.qr} onAviso={onAviso} />

      {/* Kit */}
      <div className="app-card space-y-2 p-5">
        <h3 className="flex flex-wrap items-center gap-2 text-sm font-bold text-[var(--app-ink)]"><Package className="h-4 w-4" aria-hidden="true" />Tu kit{l.kit.nombre ? `: ${l.kit.nombre}` : ''}<ModalidadChip modalidad={l.modalidad} className="ml-auto" /></h3>
        {l.kit.entregado_at ? (
          <p className="flex flex-wrap items-center gap-1.5 text-sm text-[var(--app-ink)]"><CheckCircle2 className="h-4 w-4" style={{ color: 'var(--tile-emerald-fg)' }} aria-hidden="true" />
            Entregado el {fechaHora(l.kit.entregado_at)}{l.kit.entregado_lugar ? ` en ${l.kit.entregado_lugar}` : ''}{l.kit.recibio ? ` · recibió ${l.kit.recibio}` : ''}.</p>
        ) : l.kit.fecha ? (
          <p className="space-y-1 text-sm text-[var(--app-ink)]">
            <span className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4" aria-hidden="true" />Entrega: <strong>{fechaHora(l.kit.fecha)}</strong></span>
            {l.kit.lugar && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden="true" />{l.kit.lugar}</span>}
          </p>
        ) : <p className="text-sm text-[var(--app-ink-2)]">El COMECYT te asignará la fecha y el lugar de entrega; te llegará un correo.</p>}
      </div>

      {/* Carta de resguardo */}
      <div className="app-card space-y-3 p-5">
        <h3 className="flex flex-wrap items-center gap-2 text-sm font-bold text-[var(--app-ink)]"><FileSignature className="h-4 w-4" aria-hidden="true" />Carta de resguardo del kit</h3>
        <p className="text-sm text-[var(--app-ink-2)]">Descárgala, fírmala (tú y la escuela) y súbela escaneada en PDF. El COMECYT la revisa.</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="soft" disabled={ocupado === 'res-dl'} onClick={() => void descargar('res-dl', () => descargarResguardo(clubId, folio))}>
            {ocupado === 'res-dl' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileDown className="h-4 w-4" aria-hidden="true" />}Descargar carta
          </Button>
          {resguardoVig?.estado !== 'aprobado' && !soloLectura && (
            <BotonSubir onNoPdf={() => onAviso(false, 'Sube el documento escaneado en PDF.')} etiqueta="Subir carta de resguardo firmada" disabled={ocupado === 'res-up'}
              onArchivo={(f) => { if (f.size > 10 * 1024 * 1024) { onAviso(false, 'El archivo no puede pesar más de 10 MB.'); return; } void ejecutar('res-up', () => subir(`/club/clubes/${clubId}/firmados`, f, { tipo: 'resguardo' }), 'Carta subida. El COMECYT la revisará.'); }}>
              {ocupado === 'res-up' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}{resguardoVig ? 'Subir otra versión' : 'Subir firmada'}
            </BotonSubir>
          )}
        </div>
        <VersionesFirmadas clubId={clubId} versiones={l.resguardo} onDescargar={(v) => void descargar(`f-${v.id}`, () => descargarFirmado(clubId, v.id, v.nombre_original))} />
      </div>

      {/* Transporte y box lunch — E71: solo lo que da la convocatoria; si no da ninguno, el apartado desaparece. */}
      {(daT || daL) && (
      <div className="app-card space-y-3 p-5">
        <h3 className="flex flex-wrap items-center gap-2 text-sm font-bold text-[var(--app-ink)]">{daT ? <Bus className="h-4 w-4" aria-hidden="true" /> : <Sandwich className="h-4 w-4" aria-hidden="true" />}{tituloApoyos}<ModalidadChip modalidad={l.modalidad} className="ml-auto" /></h3>
        {!l.estatal ? (
          <p className="text-sm text-[var(--app-ink-2)]">Tu escuela es del sistema federal: tu club recibe el kit, sin {tituloApoyos.toLowerCase()}.</p>
        ) : (
          <>
            <p className="text-sm text-[var(--app-ink-2)]">
              {l.fecha_limite ? (l.abierta ? `Puedes pedir o cambiar hasta el ${formatDate(l.fecha_limite)}.` : `La fecha límite fue el ${formatDate(l.fecha_limite)}.`) : 'Sin fecha límite por ahora.'}
              {' '}Máximo para tu club:{daT && <> transporte {l.limites.transporte ?? 'sin límite'} (lo define el COMECYT)</>}{daT && daL && ' y'}
              {daL && <> box lunch {l.limites.lunch ?? l.max_integrantes} (no pasa del máximo de {l.max_integrantes} integrantes de la convocatoria)</>}.
            </p>
            {/* E87 (pedido del usuario): la salida la define el líder (lugar, mapa y hora que propone); el regreso, el COMECYT. */}
            {daT && (
              <SalidaRegreso clubId={clubId} l={l} soloLectura={soloLectura || !l.abierta}
                onGuardado={(x) => { onCambio(x); onAviso(true, 'Punto de salida guardado. El COMECYT lo verá en tu solicitud.'); }}
                onError={(t) => onAviso(false, t)} />
            )}
            {l.solicitudes.length === 0 && <p className="text-sm text-[var(--app-ink-2)]">Todavía no hay eventos para pedir {tituloApoyos.toLowerCase()}.</p>}
            <ul className="space-y-3">
              {l.solicitudes.map((s) => {
                const k = clave(s);
                const sol = s.solicitud && s.solicitud.estado !== 'cancelada' ? s.solicitud : null;
                const est = sol ? ESTADO_SOLICITUD[sol.estado] : null;
                const docVig = vigente(s.versiones);
                const puedeSubir = sol && ['enviada', 'firmada'].includes(sol.estado);
                return (
                  <li key={k} className="space-y-3 rounded-[16px] border p-4" style={{ borderColor: 'var(--app-rule)' }}>
                    {s.evento && (
                      <p className="text-sm font-semibold text-[var(--app-ink)]">{s.evento.nombre}
                        <span className="font-normal text-[var(--app-ink-2)]">{s.evento.fecha ? ` · ${formatDate(s.evento.fecha)}` : ''}{s.evento.sede ? ` · ${s.evento.sede}` : ''}</span></p>
                    )}
                    {est && <span className="pill" data-tone={est.tono}>{est.etiqueta}</span>}
                    <div className={`grid gap-3 ${daT && daL ? 'grid-cols-2' : 'grid-cols-1 sm:max-w-xs'}`}>
                      {daT && (
                      <label className="space-y-1.5">
                        <span className={`${labelCls} flex items-center gap-1`}><Bus className="h-3.5 w-3.5" aria-hidden="true" />Personas con transporte</span>
                        <input type="number" min={0} max={l.limites.transporte ?? 1000} inputMode="numeric" className="auth-input auth-input-static pl-4" disabled={!abierta}
                          value={valor(s, 'transporte')} onChange={(e) => setCantidades((c) => ({ ...c, [k]: { transporte: e.target.value, lunch: valor(s, 'lunch') } }))} />
                        <span className="block text-xs text-[var(--app-ink-2)]">{s.cupo.transporte.disponible === null ? 'Cupo sin límite' : `Quedan ${s.cupo.transporte.disponible} lugares`}</span>
                      </label>
                      )}
                      {daL && (
                      <label className="space-y-1.5">
                        <span className={`${labelCls} flex items-center gap-1`}><Sandwich className="h-3.5 w-3.5" aria-hidden="true" />Box lunch</span>
                        <input type="number" min={0} max={l.limites.lunch ?? 1000} inputMode="numeric" className="auth-input auth-input-static pl-4" disabled={!abierta}
                          value={valor(s, 'lunch')} onChange={(e) => setCantidades((c) => ({ ...c, [k]: { transporte: valor(s, 'transporte'), lunch: e.target.value } }))} />
                        <span className="block text-xs text-[var(--app-ink-2)]">{s.cupo.lunch.disponible === null ? 'Cupo sin límite' : `Quedan ${s.cupo.lunch.disponible}`}</span>
                      </label>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {abierta && (
                        <Button size="sm" disabled={ocupado === `sol-${k}`} onClick={() => void enviar(s)}>
                          {ocupado === `sol-${k}` ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}{sol ? 'Actualizar solicitud' : 'Enviar solicitud'}
                        </Button>
                      )}
                      {sol && (
                        <Button size="sm" variant="soft" disabled={ocupado === `fmt-${k}`} onClick={() => void descargar(`fmt-${k}`, () => descargarFormatoLogistica(clubId, sol.id, folio))}>
                          <FileDown className="h-4 w-4" aria-hidden="true" />Descargar formato
                        </Button>
                      )}
                      {puedeSubir && !soloLectura && (
                        <BotonSubir onNoPdf={() => onAviso(false, 'Sube el documento escaneado en PDF.')} etiqueta={`Subir formato firmado${s.evento ? ` de ${s.evento.nombre}` : ''}`} disabled={ocupado === `up-${k}`}
                          onArchivo={(f) => { if (f.size > 10 * 1024 * 1024) { onAviso(false, 'El archivo no puede pesar más de 10 MB.'); return; } void ejecutar(`up-${k}`, () => subir(`/club/clubes/${clubId}/firmados`, f, { tipo: 'solicitud', logistica_id: String(sol!.id) }), 'Formato subido. El COMECYT lo revisará.'); }}>
                          {ocupado === `up-${k}` ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}{docVig?.estado === 'pendiente' ? 'Subir otra versión' : 'Subir formato firmado'}
                        </BotonSubir>
                      )}
                      {sol && abierta && (
                        <Button size="sm" variant="destructive" onClick={() => setBajar(s)} aria-label="Bajar la solicitud"><Trash2 className="h-4 w-4" aria-hidden="true" /></Button>
                      )}
                    </div>
                    {sol && <VersionesFirmadas clubId={clubId} versiones={s.versiones} onDescargar={(v) => void descargar(`f-${v.id}`, () => descargarFirmado(clubId, v.id, v.nombre_original))} />}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
      )}

      <ConfirmDialog open={confirmarSinTransporte !== null} title="¿Estás seguro que no quieres transporte?"
        description="Tu club llegará por su cuenta al evento. Puedes cambiarlo hasta la fecha límite."
        confirmLabel="Sí, sin transporte" onCancel={() => setConfirmarSinTransporte(null)}
        onConfirm={() => { const s = confirmarSinTransporte; setConfirmarSinTransporte(null); if (s) void enviar(s, true); }} />
      <ConfirmDialog open={bajar !== null} title="Bajar la solicitud" variant="destructive" confirmLabel="Bajar"
        description={`Se libera tu lugar (${tituloApoyos.toLowerCase()}). Puedes volver a pedirlo mientras haya cupo y no pase la fecha límite.`}
        onCancel={() => setBajar(null)}
        onConfirm={() => { const s = bajar; setBajar(null); if (s?.solicitud) void ejecutar(`sol-${clave(s)}`, () => api.delete(`/club/clubes/${clubId}/logistica/${s.solicitud!.id}`), 'Solicitud bajada; se liberó tu lugar.'); }} />
    </section>
  );
}

/** E87 — Enlace de Google Maps (solo si pasa la lista blanca; se abre en otra pestaña sin compartir la página). */
function EnlaceMapa({ url, texto }: { url: string | null | undefined; texto: string }) {
  const seguro = urlMapa(url);
  if (!seguro) return null;
  return (
    <a href={seguro} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--auth-vino)] underline-offset-2 hover:underline">
      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />{texto}
    </a>
  );
}

/**
 * E87 — Punto de salida del club (lo define el líder: lugar, enlace de Google Maps y hora que propone) y punto de regreso
 * (lo define el COMECYT en la convocatoria). Los dos con su mapa.
 */
function SalidaRegreso({ clubId, l, soloLectura, onGuardado, onError }: {
  clubId: number; l: LogisticaEstado; soloLectura: boolean;
  onGuardado: (l: LogisticaEstado) => void; onError: (t: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [f, setF] = useState({ lugar: l.salida.lugar ?? '', maps: l.salida.maps ?? '', hora: l.salida.hora ?? '' });
  const [guardando, setGuardando] = useState(false);
  const mapaMal = f.maps.trim() !== '' && !urlMapa(f.maps.trim());
  const guardar = async () => {
    if (f.lugar.trim().length < 3) { onError('Escribe el punto de salida (al menos 3 letras).'); return; }
    if (mapaMal) { onError('El enlace debe ser de Google Maps (https://maps.app.goo.gl/… o https://www.google.com/maps/…).'); return; }
    setGuardando(true);
    try {
      const { data } = await api.put(`/club/clubes/${clubId}/salida-transporte`, { lugar: f.lugar.trim(), maps: f.maps.trim() || null, hora: f.hora || null });
      const x = leerLogistica(data);
      if (x) onGuardado(x);
      setEditando(false);
    } catch (e) {
      onError(mensajeError(e, 'No se pudo guardar el punto de salida.'));
    } finally {
      setGuardando(false);
    }
  };
  const a = l.apoyos;
  return (
    <div className="grid grid-cols-1 gap-3 rounded-[14px] px-4 py-3 text-sm sm:grid-cols-2" style={{ backgroundColor: 'var(--tile-sky-bg)' }}>
      <div className="space-y-1.5">
        <p className="font-bold text-[var(--app-ink)]">Salida <span className="font-normal text-[var(--app-ink-2)]">(la defines tú)</span></p>
        {editando ? (
          <div className="space-y-2">
            <label className="block space-y-1"><span className="text-xs font-semibold text-[var(--app-ink-2)]">Punto de salida *</span>
              <input className="auth-input auth-input-static pl-3" maxLength={300} value={f.lugar} onChange={(e) => setF({ ...f, lugar: e.target.value })} placeholder="Ej. Escuela, entrada principal" /></label>
            <label className="block space-y-1"><span className="text-xs font-semibold text-[var(--app-ink-2)]">Enlace de Google Maps (opcional)</span>
              <input className="auth-input auth-input-static pl-3" type="url" inputMode="url" maxLength={500} value={f.maps} onChange={(e) => setF({ ...f, maps: e.target.value })}
                placeholder="https://maps.app.goo.gl/…" aria-invalid={mapaMal ? 'true' : undefined} /></label>
            {mapaMal && <p className="text-xs font-medium" style={{ color: 'var(--auth-danger)' }}>Pega un enlace de Google Maps.</p>}
            <label className="block space-y-1"><span className="text-xs font-semibold text-[var(--app-ink-2)]">Hora de salida que propones</span>
              <input className="auth-input auth-input-static pl-3" type="datetime-local" value={f.hora} onChange={(e) => setF({ ...f, hora: e.target.value })} /></label>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => void guardar()} disabled={guardando}>{guardando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Guardar salida</Button>
              <Button size="sm" variant="outline" disabled={guardando} onClick={() => { setEditando(false); setF({ lugar: l.salida.lugar ?? '', maps: l.salida.maps ?? '', hora: l.salida.hora ?? '' }); }}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-[var(--app-ink)]">{l.salida.lugar ?? 'Aún no la defines'}{l.salida.hora ? ` · ${fechaHoraLocal(l.salida.hora)}` : ''}</p>
            <EnlaceMapa url={l.salida.maps} texto="Ver salida en Google Maps" />
            {!soloLectura && <Button size="sm" variant="soft" onClick={() => setEditando(true)}><MapPin className="h-4 w-4" aria-hidden="true" />{l.salida.lugar ? 'Cambiar salida' : 'Definir salida'}</Button>}
          </>
        )}
      </div>
      <div className="space-y-1.5">
        <p className="font-bold text-[var(--app-ink)]">Regreso <span className="font-normal text-[var(--app-ink-2)]">(lo define el COMECYT)</span></p>
        <p className="text-[var(--app-ink)]">{a.transporte_regreso_lugar ?? 'Por confirmar'}{a.transporte_regreso_hora ? ` · ${fechaHoraLocal(a.transporte_regreso_hora)}` : ''}</p>
        <EnlaceMapa url={a.transporte_regreso_maps} texto="Ver regreso en Google Maps" />
      </div>
    </div>
  );
}
