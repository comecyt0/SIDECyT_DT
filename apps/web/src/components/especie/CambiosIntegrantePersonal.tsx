'use client';

import { useState } from 'react';
import { ArrowLeftRight, Camera, CheckCircle2, Eye, History, Loader2, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useVistaPrevia } from '@/components/ui/VistaPreviaProvider';
import { archivoCambio } from '@/lib/especie-api';
import { mensajeError } from '@/lib/errores-formulario';
import { formatDate } from '@/lib/format';
import { ESTADO_CAMBIO, type CambiosClub, type SolicitudCambio } from '@/lib/especie';

const ETIQUETA: Record<string, string> = {
  nombre: 'Nombre', fecha_nacimiento: 'Nacimiento', curp: 'CURP (inicio)', grado: 'Grado', grupo: 'Grupo', grado_grupo: 'Grado y grupo',
  tutor_nombre: 'Madre, padre o tutor', domicilio: 'Domicilio', correo: 'Correo', telefono: 'Teléfono', curp_verificacion: 'CURP',
};
const CURP_TXT: Record<string, string> = { coincide: 'Coincide con nombre y fecha', revision: 'No coincide: el líder pide revisarla' };

/**
 * E92 — Solicitudes de cambio de integrante para el personal: la justificación, los datos y documentos del nuevo
 * integrante, y Aprobar / Rechazar con motivo (admin y admin de convocatoria; los demás solo ven). Historial con quién
 * resolvió cada una.
 */
export default function CambiosIntegrantePersonal({ clubId, cambios, puede, onHecho }: {
  clubId: number; cambios: CambiosClub; puede: boolean;
  onHecho: (nuevo: unknown, mensaje: string, ok: boolean) => void;
}) {
  const { ver } = useVistaPrevia();
  const [confirmar, setConfirmar] = useState<{ s: SolicitudCambio; decision: 'aprobar' | 'rechazar' } | null>(null);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  if (cambios.solicitudes.length === 0 && cambios.bajas.length === 0) return null;
  const pendientes = cambios.solicitudes.filter((s) => s.estado === 'pendiente');
  const resueltas = cambios.solicitudes.filter((s) => s.estado !== 'pendiente');

  const resolver = async () => {
    if (!confirmar) return;
    if (confirmar.decision === 'rechazar' && !motivo.trim()) return;
    setEnviando(true);
    try {
      const { data } = await api.post(`/revision/clubes/${clubId}/cambios-integrante/${confirmar.s.id}/resolver`, { decision: confirmar.decision, motivo: motivo.trim() || null });
      onHecho(data, confirmar.decision === 'aprobar'
        ? 'Cambio aprobado: el nuevo integrante ya está en el club y quien salió quedó en el historial.'
        : 'Cambio no aprobado: el líder verá el motivo.', true);
    } catch (e) {
      onHecho(null, mensajeError(e, 'No se pudo resolver la solicitud de cambio.'), false);
    } finally {
      setEnviando(false);
      setConfirmar(null);
      setMotivo('');
    }
  };

  return (
    <section className="app-card space-y-4 p-5" aria-labelledby="cambios-personal">
      <h3 id="cambios-personal" className="flex items-center gap-2 text-base font-bold text-[var(--app-ink)]">
        <ArrowLeftRight className="h-5 w-5" style={{ color: 'var(--auth-vino)' }} aria-hidden="true" />Cambios de integrante
        {pendientes.length > 0 && <span className="pill" data-tone="gold" data-dot="on">{pendientes.length} por resolver</span>}
      </h3>
      {pendientes.map((s) => (
        <article key={s.id} className="space-y-3 rounded-[16px] border p-4" style={{ borderColor: 'var(--tile-gold-fg)', backgroundColor: 'var(--tile-gold-bg)' }}>
          <p className="text-sm text-[var(--app-ink)]">Sale <strong>{s.sale}</strong> · entra <strong>{s.entra.nombre ?? '—'}</strong>{s.fecha ? ` · pedida el ${formatDate(s.fecha)}` : ''}</p>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]">Justificación</p>
            <p className="whitespace-pre-wrap break-words text-sm text-[var(--app-ink)]">{s.justificacion}</p>
          </div>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
            {Object.entries(s.entra).filter(([k]) => k !== 'nombre').map(([k, v]) => (
              <div key={k} className="flex gap-2"><dt className="text-[var(--app-ink-2)]">{ETIQUETA[k] ?? k}:</dt><dd className="min-w-0 break-words font-semibold text-[var(--app-ink)]">{k === 'curp_verificacion' ? (CURP_TXT[v] ?? v) : k === 'fecha_nacimiento' ? formatDate(v) : v}</dd></div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2">
            {s.tiene_permiso ? <Button size="sm" variant="outline" onClick={() => void ver({ nombre: `Permiso de ${s.entra.nombre ?? 'nuevo integrante'}.pdf`, cargar: () => archivoCambio(clubId, s.id, 'permiso') })}><Eye className="h-4 w-4" aria-hidden="true" />Ver permiso de imagen</Button>
              : <span className="text-xs text-[var(--app-ink-2)]">Sin permiso de imagen.</span>}
            {s.tiene_foto && <Button size="sm" variant="outline" onClick={() => void ver({ nombre: `Foto de ${s.entra.nombre ?? 'nuevo integrante'}.webp`, cargar: () => archivoCambio(clubId, s.id, 'foto') })}><Camera className="h-4 w-4" aria-hidden="true" />Ver foto</Button>}
          </div>
          {puede && (
            <div className="flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: 'color-mix(in oklch, var(--tile-gold-fg) 30%, transparent)' }}>
              <Button size="sm" onClick={() => setConfirmar({ s, decision: 'aprobar' })}><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Aprobar cambio</Button>
              <Button size="sm" variant="destructive" onClick={() => { setMotivo(''); setConfirmar({ s, decision: 'rechazar' }); }}><XCircle className="h-4 w-4" aria-hidden="true" />No aprobar</Button>
            </div>
          )}
        </article>
      ))}
      {(resueltas.length > 0 || cambios.bajas.length > 0) && (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--app-ink)]"><History className="h-4 w-4" aria-hidden="true" />Historial de integrantes</p>
          <ul className="libreta divide-y rounded-[14px] border" style={{ borderColor: 'var(--app-rule)' }}>
            {resueltas.map((s) => (
              <li key={s.id} className="space-y-1 px-4 py-3 text-sm">
                <p className="flex flex-wrap items-center gap-2 text-[var(--app-ink)]">
                  <span className="pill" data-tone={ESTADO_CAMBIO[s.estado].tono}>{ESTADO_CAMBIO[s.estado].etiqueta}</span>
                  <span className="break-words">Sale <strong>{s.sale}</strong> · entra <strong>{s.entra.nombre ?? '—'}</strong></span>
                  <span className="text-xs text-[var(--app-ink-2)]">{s.resuelto_at ? formatDate(s.resuelto_at) : ''}{s.resolvio ? ` · ${s.resolvio}` : ''}</span>
                </p>
                <p className="break-words text-xs text-[var(--app-ink-2)]">Justificación: {s.justificacion}</p>
                {s.estado === 'rechazada' && s.motivo && <p className="text-xs font-medium" style={{ color: 'var(--auth-danger)' }}>Motivo: {s.motivo}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <ConfirmDialog open={confirmar !== null}
        title={confirmar?.decision === 'aprobar' ? '¿Aprobar el cambio de integrante?' : '¿No aprobar el cambio?'}
        description={confirmar?.decision === 'aprobar'
          ? `${confirmar.s.sale} queda de baja (en el historial) y ${confirmar.s.entra.nombre ?? 'el nuevo integrante'} entra al club con su permiso de imagen aprobado. El líder tendrá que volver a firmar los formatos que listan integrantes.`
          : 'El líder verá el motivo y podrá pedir otro cambio mientras siga abierto el plazo.'}
        confirmLabel={enviando ? 'Guardando…' : confirmar?.decision === 'aprobar' ? 'Aprobar' : 'No aprobar'}
        variant={confirmar?.decision === 'rechazar' ? 'destructive' : undefined}
        confirmDisabled={enviando || (confirmar?.decision === 'rechazar' && !motivo.trim())}
        onCancel={() => { setConfirmar(null); setMotivo(''); }}
        onConfirm={() => void resolver()}>
        {confirmar?.decision === 'rechazar' && (
          <div className="space-y-1.5">
            <label htmlFor="cambio-motivo" className="text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]">Motivo (lo verá el líder) *</label>
            <textarea id="cambio-motivo" className="auth-input auth-input-static !h-auto min-h-[90px] w-full resize-y py-3 pl-4" maxLength={1000} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            {!motivo.trim() && <p className="text-xs" style={{ color: 'var(--auth-danger)' }}>Escribe el motivo para poder continuar.</p>}
          </div>
        )}
        {enviando && <Loader2 className="h-4 w-4 animate-spin" aria-label="Guardando" />}
      </ConfirmDialog>
    </section>
  );
}
