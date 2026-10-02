'use client';

import { useState } from 'react';
import { Package, FileSignature, Bus, CalendarClock, MapPin, CheckCircle2, Truck, QrCode } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { mensajeError } from '@/lib/errores-formulario';
import FechaHoraAmPm, { fechaHoraCompleta } from '@/components/ui/fecha-hora-ampm';
import StepFrame from '@/components/ui/step-frame';
import AvisoErrores from '@/components/ui/aviso-errores';
import VersionesFirmadas from '@/components/especie/VersionesFirmadas';
import { erroresFormulario, type ErroresFormulario } from '@/lib/errores-formulario';
import { descargarFirmado } from '@/lib/especie-api';
import { ESTADO_SOLICITUD, fechaHora, type LogisticaEstado, type VersionFirmada } from '@/lib/especie';
import { formatDate } from '@/lib/format';

const inputCls = 'auth-input auth-input-static pl-4';
const labelCls = 'text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]';
/** Fecha y hora local (Toluca) para `datetime-local`. */
const ahoraLocal = () => new Date().toLocaleString('sv-SE', { timeZone: 'America/Mexico_City' }).slice(0, 16).replace(' ', 'T');

type Dialogo = { tipo: 'asignar' } | { tipo: 'entregar' } | { tipo: 'rechazar'; version: VersionFirmada } | null;

/**
 * E52 · F3 — Logística de un club aceptado para el personal: fecha y lugar del kit, registro de la entrega (fecha, lugar,
 * quién entregó y quién recibió), y validación de la carta de resguardo y de cada formato de transporte/box lunch.
 * `puede` = admin o admin de convocatoria con alcance (el servidor vuelve a comprobarlo).
 */
export default function LogisticaPersonal({ clubId, estadoClub, logistica, puede, onHecho }: {
  clubId: number; estadoClub: string; logistica: LogisticaEstado; puede: boolean;
  onHecho: (nuevo: { logistica?: unknown; detalle?: unknown }, mensaje: string, ok?: boolean) => void;
}) {
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [form, setForm] = useState({ fecha: '', lugar: '', entrego: '', recibio: '', motivo: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<ErroresFormulario | null>(null);
  const [revocar, setRevocar] = useState(false);
  const l = logistica;

  const abrir = (d: Dialogo) => {
    setError(null);
    setForm({ fecha: d?.tipo === 'entregar' ? ahoraLocal() : '', lugar: d?.tipo === 'entregar' ? (l.kit.lugar ?? '') : (l.kit.lugar ?? ''), entrego: '', recibio: '', motivo: '' });
    setDialogo(d);
  };

  const revisar = async (v: VersionFirmada, resultado: 'aprobar' | 'rechazar', motivo?: string) => {
    setEnviando(true);
    setError(null);
    try {
      const { data } = await api.post(`/revision/firmados/${v.id}/revisar`, { resultado, motivo: motivo ?? null });
      setDialogo(null);
      onHecho({ logistica: data?.logistica }, resultado === 'aprobar' ? 'Documento aprobado; el líder recibió aviso.' : 'Documento rechazado; el líder recibió aviso con el motivo.');
    } catch (e) {
      const r = erroresFormulario(e, { motivo: 'Motivo', logistica: 'Documento' }, {});
      if (resultado === 'rechazar') setError(r); else onHecho({}, `No se aprobó. ${r.lineas.join(' ') || r.titulo}`, false);
    } finally {
      setEnviando(false);
    }
  };

  const guardar = async () => {
    if (!dialogo) return;
    if (dialogo.tipo === 'rechazar') return revisar(dialogo.version, 'rechazar', form.motivo.trim());
    setEnviando(true);
    setError(null);
    try {
      if (dialogo.tipo === 'asignar') {
        await api.post('/revision/kit/asignar', { club_ids: [clubId], fecha: form.fecha, lugar: form.lugar.trim() });
        setDialogo(null);
        onHecho({ detalle: null }, 'Fecha y lugar asignados; el líder recibió un correo.');
      } else {
        const { data } = await api.post(`/revision/clubes/${clubId}/kit-entregado`, { fecha: form.fecha, lugar: form.lugar.trim(), entrego: form.entrego.trim(), recibio: form.recibio.trim() });
        setDialogo(null);
        onHecho({ detalle: data }, 'Entrega del kit registrada.');
      }
    } catch (e) {
      setError(erroresFormulario(e, { fecha: 'Fecha y hora', lugar: 'Lugar', entrego: 'Quién entregó', recibio: 'Quién recibió', club_ids: 'Club' }, {}));
    } finally {
      setEnviando(false);
    }
  };

  const habilitarQr = async () => {
    setEnviando(true);
    try {
      const { data } = await api.post('/revision/qr/habilitar', { club_ids: [clubId] });
      const omitido = Array.isArray(data?.omitidos) ? data.omitidos[0] : null;
      onHecho({ detalle: null }, omitido ? `No se habilitó: ${String(omitido.motivo ?? '')}.` : 'QR habilitado; el líder recibió un correo para descargar su credencial.', !omitido);
    } catch (e) {
      onHecho({}, mensajeError(e, 'No se pudo habilitar el QR.'), false);
    } finally {
      setEnviando(false);
    }
  };

  const revocarQr = async () => {
    setRevocar(false);
    setEnviando(true);
    try {
      const { data } = await api.post(`/revision/clubes/${clubId}/qr/revocar`);
      onHecho({ detalle: data }, 'QR revocado: el anterior ya no sirve. Si lo vuelves a habilitar, será uno nuevo.');
    } catch (e) {
      onHecho({}, mensajeError(e, 'No se pudo revocar el QR.'), false);
    } finally {
      setEnviando(false);
    }
  };

  const descargar = (v: VersionFirmada) => { void descargarFirmado(clubId, v.id, v.nombre_original).catch(() => onHecho({}, 'No se pudo abrir el documento.', false)); };
  const revisarProp = puede ? (v: VersionFirmada, r: 'aprobar' | 'rechazar') => (r === 'aprobar' ? void revisar(v, 'aprobar') : abrir({ tipo: 'rechazar', version: v })) : undefined;

  return (
    <section className="space-y-4" aria-labelledby="log-personal">
      <h2 id="log-personal" className="flex items-center gap-2 text-base font-bold text-[var(--app-ink)]"><Package className="h-5 w-5" style={{ color: 'var(--auth-vino)' }} aria-hidden="true" />Logística</h2>

      <div className="app-card space-y-3 p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--app-ink)]"><Package className="h-4 w-4" aria-hidden="true" />Kit{l.kit.nombre ? `: ${l.kit.nombre}` : ''}</h3>
        {l.kit.entregado_at ? (
          <p className="flex flex-wrap items-center gap-1.5 text-sm text-[var(--app-ink)]"><CheckCircle2 className="h-4 w-4" style={{ color: 'var(--tile-emerald-fg)' }} aria-hidden="true" />
            Entregado el {fechaHora(l.kit.entregado_at)}{l.kit.entregado_lugar ? ` en ${l.kit.entregado_lugar}` : ''} · entregó {l.kit.entrego} · recibió {l.kit.recibio}</p>
        ) : (
          <p className="space-y-1 text-sm text-[var(--app-ink)]">
            {l.kit.fecha ? <><span className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4" aria-hidden="true" />{fechaHora(l.kit.fecha)}</span>
              {l.kit.lugar && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden="true" />{l.kit.lugar}</span>}</>
              : <span className="text-[var(--app-ink-2)]">Sin fecha ni lugar de entrega asignados.</span>}
          </p>
        )}
        {puede && estadoClub === 'aceptado' && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => abrir({ tipo: 'asignar' })}><CalendarClock className="h-4 w-4" aria-hidden="true" />{l.kit.fecha ? 'Cambiar fecha y lugar' : 'Asignar fecha y lugar'}</Button>
            <Button size="sm" onClick={() => abrir({ tipo: 'entregar' })}><Truck className="h-4 w-4" aria-hidden="true" />Registrar entrega</Button>
          </div>
        )}
      </div>

      {/* F4 — QR del club */}
      <div className="app-card space-y-3 p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--app-ink)]"><QrCode className="h-4 w-4" aria-hidden="true" />QR del club</h3>
        {l.qr.habilitado ? (
          <p className="flex flex-wrap items-center gap-1.5 text-sm text-[var(--app-ink)]"><CheckCircle2 className="h-4 w-4" style={{ color: 'var(--tile-emerald-fg)' }} aria-hidden="true" />
            Habilitado{l.qr.habilitado_at ? ` el ${fechaHora(l.qr.habilitado_at)}` : ''}. El líder ya puede descargar su credencial.</p>
        ) : (
          <p className="text-sm text-[var(--app-ink-2)]">Sin habilitar{l.qr.falta ? `: ${l.qr.falta}.` : '. Cumple los requisitos.'}</p>
        )}
        {puede && (
          <div className="flex flex-wrap gap-2">
            {l.qr.habilitado
              ? <Button size="sm" variant="destructive" disabled={enviando} onClick={() => setRevocar(true)}><QrCode className="h-4 w-4" aria-hidden="true" />Revocar QR</Button>
              : <Button size="sm" disabled={enviando || l.qr.falta !== null} onClick={() => void habilitarQr()}><QrCode className="h-4 w-4" aria-hidden="true" />Habilitar QR</Button>}
          </div>
        )}
      </div>

      <div className="app-card space-y-3 p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--app-ink)]"><FileSignature className="h-4 w-4" aria-hidden="true" />Carta de resguardo</h3>
        <VersionesFirmadas versiones={l.resguardo} onDescargar={descargar} onRevisar={revisarProp} ocupado={enviando} />
      </div>

      <div className="app-card space-y-3 p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--app-ink)]"><Bus className="h-4 w-4" aria-hidden="true" />Transporte y box lunch</h3>
        {!l.estatal ? <p className="text-sm text-[var(--app-ink-2)]">Escuela federal: solo kit.</p> : (
          <ul className="space-y-3">
            {l.solicitudes.map((s) => {
              const sol = s.solicitud;
              const est = sol ? ESTADO_SOLICITUD[sol.estado] : null;
              return (
                <li key={s.evento?.id ?? 0} className="space-y-2 rounded-[14px] border p-4" style={{ borderColor: 'var(--app-rule)' }}>
                  <p className="flex flex-wrap items-center gap-2 text-sm text-[var(--app-ink)]">
                    {s.evento && <strong>{s.evento.nombre}{s.evento.fecha ? ` · ${formatDate(s.evento.fecha)}` : ''}</strong>}
                    {sol ? <>Transporte <strong>{sol.transporte}</strong> · box lunch <strong>{sol.lunch}</strong></> : <span className="text-[var(--app-ink-2)]">Sin solicitud</span>}
                    {est && <span className="pill" data-tone={est.tono}>{est.etiqueta}</span>}
                  </p>
                  {sol && <VersionesFirmadas versiones={s.versiones} onDescargar={descargar} onRevisar={revisarProp} ocupado={enviando} />}
                </li>
              );
            })}
            {l.solicitudes.length === 0 && <li className="text-sm text-[var(--app-ink-2)]">Sin eventos configurados.</li>}
          </ul>
        )}
      </div>

      <StepFrame
        open={dialogo !== null}
        size="md"
        title={dialogo?.tipo === 'asignar' ? 'Fecha y lugar de entrega del kit' : dialogo?.tipo === 'entregar' ? 'Registrar entrega del kit' : 'Rechazar documento'}
        icon={<Package className="h-5 w-5" />}
        intro={dialogo?.tipo === 'asignar' ? <>El líder recibirá un <strong>correo</strong> con la fecha y el lugar.</> : dialogo?.tipo === 'rechazar' ? <>El líder verá el motivo y subirá una versión nueva.</> : undefined}
        onClose={() => setDialogo(null)}
        onSubmit={guardar}
        submitting={enviando}
        submitLabel={dialogo?.tipo === 'asignar' ? 'Asignar' : dialogo?.tipo === 'entregar' ? 'Registrar entrega' : 'Rechazar'}
        error={error ? <AvisoErrores errores={error} /> : null}
        steps={dialogo ? [{
          key: 'datos',
          label: 'Datos',
          question: dialogo.tipo === 'rechazar' ? '¿Qué debe corregir el líder?' : dialogo.tipo === 'asignar' ? '¿Cuándo y dónde se entrega?' : '¿Cómo se entregó?',
          validate: () => {
            if (dialogo.tipo === 'rechazar') return form.motivo.trim() ? null : 'Escribe el motivo.';
            if (!fechaHoraCompleta(form.fecha)) return 'Indica la fecha y la hora (con a. m. o p. m.).';
            if (!form.lugar.trim()) return 'Indica el lugar.';
            if (dialogo.tipo === 'entregar' && (!form.entrego.trim() || !form.recibio.trim())) return 'Indica quién entregó y quién recibió.';
            return null;
          },
          content: dialogo.tipo === 'rechazar' ? (
            <div className="space-y-1.5">
              <label htmlFor="lp-motivo" className={labelCls}>Motivo *</label>
              <textarea id="lp-motivo" maxLength={2000} value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} className={`${inputCls} !h-auto min-h-[110px] resize-y py-3`} />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Fecha y hora por separado, con a. m. / p. m. (pedido del usuario). */}
              <div className="sm:col-span-2">
                <FechaHoraAmPm value={form.fecha} onChange={(v) => setForm({ ...form, fecha: v })} max={dialogo.tipo === 'entregar' ? ahoraLocal() : undefined}
                  etiquetaFecha={dialogo.tipo === 'asignar' ? 'Fecha de entrega *' : 'Fecha en que se entregó *'} etiquetaHora={dialogo.tipo === 'asignar' ? 'Hora de entrega *' : 'Hora en que se entregó *'} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="lp-lugar" className={labelCls}>Lugar *</label>
                <input id="lp-lugar" maxLength={255} value={form.lugar} onChange={(e) => setForm({ ...form, lugar: e.target.value })} className={inputCls} placeholder="Ej. Auditorio COMECYT, Toluca" />
              </div>
              {dialogo.tipo === 'entregar' && (<>
                <div className="space-y-1.5">
                  <label htmlFor="lp-entrego" className={labelCls}>Quién entregó *</label>
                  <input id="lp-entrego" maxLength={150} value={form.entrego} onChange={(e) => setForm({ ...form, entrego: e.target.value })} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="lp-recibio" className={labelCls}>Quién recibió *</label>
                  <input id="lp-recibio" maxLength={150} value={form.recibio} onChange={(e) => setForm({ ...form, recibio: e.target.value })} className={inputCls} />
                </div>
              </>)}
            </div>
          ),
        }] : []}
      />
      <ConfirmDialog open={revocar} variant="destructive" title="Revocar el QR del club" confirmLabel="Revocar"
        description="El QR actual dejará de funcionar de inmediato en los eventos y el líder recibirá un aviso. Si lo vuelves a habilitar, se genera uno nuevo."
        onCancel={() => setRevocar(false)} onConfirm={() => void revocarQr()} />
    </section>
  );
}
