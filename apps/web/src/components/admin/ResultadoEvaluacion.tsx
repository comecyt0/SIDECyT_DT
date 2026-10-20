'use client';

import { useRol } from '@/hooks/useRol';

import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, ClipboardCheck, Download, RotateCcw, Trash2, XCircle } from 'lucide-react';
import api from '@/lib/api';
import PastelFrame from '@/components/ui/pastel-frame';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Asterisco } from '@/components/ui/obligatorio';
import { mensajeError } from '@/lib/errores-formulario';
import { formatDate } from '@/lib/format';
import { descargarDictamenSigae } from '@/lib/evaluacionCompartida';

/**
 * E72 paso 5 — «Resultado de la evaluación» en la ficha de una solicitud de SIGAE (admin y admin de convocatoria).
 * Ningún dictamen decide solo: el admin decide con el promedio frente al mínimo aprobatorio de la convocatoria.
 * Desde aquí también amplía la fecha límite, reabre un dictamen enviado (con motivo) o retira una asignación abierta.
 * Datos: GET /admin/solicitudes/{id}/evaluacion (si el rol no puede verlo, el bloque no se muestra).
 */

interface Criterio { clave: string; nombre: string; max: number }
interface Asig {
  id: number; evaluador: string | null; estado: string; fecha_limite: string | null;
  conflictos_aceptados: { tipo: string; detalle: string }[];
  dictamen: { id: number; puntaje: number; criterios: Record<string, number>; comentario: string | null; enviado_at: string | null } | null;
}
interface Datos {
  asignados: number; concluidos: number; pendientes: number; completa: boolean;
  promedio: number | null; maximo: number; porcentaje: number | null; minimo_aprobatorio: number; alcanza_minimo: boolean | null;
  puede_decidir: boolean; criterios: Criterio[]; asignaciones: Asig[];
}

const ESTADO: Record<string, { texto: string; tono: string }> = {
  asignado: { texto: 'Asignada', tono: 'neutral' }, evaluando: { texto: 'Evaluando', tono: 'gold' },
  concluido: { texto: 'Dictamen enviado', tono: 'emerald' }, vencida: { texto: 'Vencida', tono: 'red' },
};

type Accion =
  | { tipo: 'fecha'; a: Asig; valor: string }
  | { tipo: 'reabrir'; a: Asig; valor: string }
  | { tipo: 'quitar'; a: Asig }
  | { tipo: 'decidir'; resultado: 'aprobada' | 'rechazada'; valor: string };

function leer(d: unknown): Datos | null {
  const x = d as Partial<Datos> | null;
  if (!x || typeof x !== 'object' || !Array.isArray(x.asignaciones)) return null;
  return {
    asignados: Number(x.asignados) || 0, concluidos: Number(x.concluidos) || 0, pendientes: Number(x.pendientes) || 0,
    completa: Boolean(x.completa), promedio: typeof x.promedio === 'number' ? x.promedio : null, maximo: Number(x.maximo) || 0,
    porcentaje: typeof x.porcentaje === 'number' ? x.porcentaje : null, minimo_aprobatorio: Number(x.minimo_aprobatorio) || 0,
    alcanza_minimo: typeof x.alcanza_minimo === 'boolean' ? x.alcanza_minimo : null, puede_decidir: Boolean(x.puede_decidir),
    criterios: Array.isArray(x.criterios) ? x.criterios : [], asignaciones: x.asignaciones,
  };
}

export default function ResultadoEvaluacion({ solicitudId }: { solicitudId: number }) {
  // E85 (regla del usuario): solo el administrador elimina y reabre dictámenes; el admin de convocatoria retira.
  const { esAdmin } = useRol();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [oculto, setOculto] = useState(false);
  const [accion, setAccion] = useState<Accion | null>(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get(`/admin/solicitudes/${solicitudId}/evaluacion`);
      const d = leer(data);
      if (d) setDatos(d); else setOculto(true);
    } catch { setOculto(true); }
  }, [solicitudId]);
  useEffect(() => { void cargar(); }, [cargar]);

  if (oculto || !datos) return null;
  if (datos.asignados === 0 && !datos.puede_decidir) return null;

  const manana = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();

  const ejecutar = async () => {
    if (!accion) return;
    setError('');
    if ((accion.tipo === 'reabrir') && accion.valor.trim().length < 5) { setError('Escribe el motivo (al menos 5 caracteres).'); return; }
    if (accion.tipo === 'decidir' && accion.valor.trim().length < 10) { setError('Escribe el motivo (al menos 10 caracteres).'); return; }
    if (accion.tipo === 'fecha' && !(accion.valor >= manana)) { setError('Elige una fecha a partir de mañana.'); return; }
    setEnviando(true);
    try {
      let r;
      if (accion.tipo === 'fecha') r = await api.put(`/admin/asignaciones-evaluador/${accion.a.id}/fecha`, { fecha_limite: accion.valor });
      else if (accion.tipo === 'reabrir') r = await api.post(`/admin/asignaciones-evaluador/${accion.a.id}/reabrir`, { motivo: accion.valor.trim() });
      else if (accion.tipo === 'quitar') r = await api.delete(`/admin/asignaciones-evaluador/${accion.a.id}`);
      else r = await api.post(`/admin/solicitudes/${solicitudId}/evaluacion/decidir`, { resultado: accion.resultado, motivo: accion.valor.trim() });
      setAviso(typeof r?.data?.message === 'string' ? r.data.message : 'Listo.');
      setAccion(null);
      if (accion.tipo === 'decidir') { window.location.reload(); return; }
      await cargar();
    } catch (e) {
      setError(mensajeError(e, 'No se pudo completar la acción.'));
    } finally {
      setEnviando(false);
    }
  };

  const titulo = accion?.tipo === 'fecha' ? 'Ampliar la fecha límite' : accion?.tipo === 'reabrir' ? 'Reabrir el dictamen'
    : accion?.tipo === 'quitar' ? (esAdmin ? 'Quitar la asignación' : 'Retirar la asignación') : accion?.tipo === 'decidir' ? (accion.resultado === 'aprobada' ? 'Aprobar la solicitud' : 'Rechazar la solicitud') : '';

  return (
    <PastelFrame tone="butter" title="Resultado de la evaluación"
      description={`${datos.concluidos} de ${datos.asignados} dictámenes enviados${datos.pendientes ? ` · ${datos.pendientes} pendiente${datos.pendientes === 1 ? '' : 's'}` : ''}. Ningún dictamen decide solo: tú decides con el promedio.`}>
      <div className="space-y-4">
        {aviso && <p role="status" className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3 text-sm text-emerald-800 dark:text-emerald-200">{aviso}</p>}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border p-3"><p className="text-xs text-neutral-500">Promedio</p><p className="text-xl font-bold">{datos.promedio ?? '—'} <span className="text-sm font-normal">/ {datos.maximo}</span></p></div>
          <div className="rounded-xl border p-3"><p className="text-xs text-neutral-500">Equivale a</p><p className="text-xl font-bold">{datos.porcentaje !== null ? `${datos.porcentaje} %` : '—'}</p></div>
          <div className="rounded-xl border p-3"><p className="text-xs text-neutral-500">Mínimo aprobatorio</p><p className="text-xl font-bold">{datos.minimo_aprobatorio} %</p>
            {datos.alcanza_minimo !== null && <span className="pill" data-tone={datos.alcanza_minimo ? 'emerald' : 'red'}>{datos.alcanza_minimo ? 'Lo alcanza' : 'No lo alcanza'}</span>}</div>
        </div>

        <ul className="grid gap-3">
          {datos.asignaciones.map((a) => {
            const e = ESTADO[a.estado] ?? { texto: a.estado, tono: 'neutral' };
            return (
              <li key={a.id} className="rounded-xl border p-3 text-sm space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{a.evaluador ?? 'Evaluador'}</span>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="pill" data-tone={e.tono}>{e.texto}</span>
                    {a.fecha_limite && a.estado !== 'concluido' && <span className="text-xs text-neutral-500">Límite: {formatDate(a.fecha_limite)}</span>}
                  </span>
                </div>
                {a.conflictos_aceptados.length > 0 && (
                  <p className="text-xs text-amber-700 dark:text-amber-300">Asignada aceptando: {a.conflictos_aceptados.map((c) => c.detalle).join(' · ')}</p>
                )}
                {a.dictamen && (
                  <div className="grid gap-1">
                    {datos.criterios.map((c) => (
                      <div key={c.clave} className="flex justify-between gap-3 text-xs"><span>{c.nombre}</span><span>{a.dictamen?.criterios?.[c.clave] ?? '—'} / {c.max}</span></div>
                    ))}
                    <div className="flex justify-between border-t pt-1 font-semibold"><span>Total</span><span>{a.dictamen.puntaje} / {datos.maximo}</span></div>
                    {a.dictamen.comentario && <p className="whitespace-pre-wrap break-words text-xs text-neutral-600 dark:text-neutral-300">{a.dictamen.comentario}</p>}
                  </div>
                )}
                {a.dictamen?.id && (
                  <Button size="sm" variant="soft" icon={<Download className="h-4 w-4" />}
                    onClick={async () => { if (!(await descargarDictamenSigae(a.dictamen!.id, `Dictamen_${solicitudId}_${a.id}.pdf`))) setAviso('No se pudo descargar el PDF del dictamen.'); }}>
                    Descargar dictamen (PDF)
                  </Button>
                )}
                {datos.puede_decidir && (
                  <div className="flex flex-wrap gap-2">
                    {a.estado !== 'concluido' && <Button size="sm" variant="soft" icon={<CalendarClock className="h-4 w-4" />} onClick={() => { setError(''); setAccion({ tipo: 'fecha', a, valor: manana }); }}>Ampliar fecha</Button>}
                    {a.estado !== 'concluido' && <Button size="sm" variant="soft" icon={<Trash2 className="h-4 w-4" />} onClick={() => { setError(''); setAccion({ tipo: 'quitar', a }); }}>{esAdmin ? 'Quitar' : 'Retirar'}</Button>}
                    {a.dictamen && esAdmin && <Button size="sm" variant="soft" icon={<RotateCcw className="h-4 w-4" />} onClick={() => { setError(''); setAccion({ tipo: 'reabrir', a, valor: '' }); }}>Reabrir dictamen</Button>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {datos.puede_decidir && (
          <div className="flex flex-wrap items-center gap-2">
            <Button icon={<CheckCircle2 className="h-4 w-4" />} disabled={!datos.completa} onClick={() => { setError(''); setAccion({ tipo: 'decidir', resultado: 'aprobada', valor: '' }); }}>Aprobar</Button>
            <Button variant="destructive" icon={<XCircle className="h-4 w-4" />} disabled={!datos.completa} onClick={() => { setError(''); setAccion({ tipo: 'decidir', resultado: 'rechazada', valor: '' }); }}>Rechazar</Button>
            {!datos.completa && <span className="text-xs text-neutral-500">Podrás decidir cuando todas las personas asignadas envíen su dictamen (amplía o quita las vencidas).</span>}
          </div>
        )}
      </div>

      <Dialog open={accion !== null} onOpenChange={(o) => { if (!o) setAccion(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4" />{titulo}</DialogTitle>
            <DialogDescription>
              {accion?.tipo === 'reabrir' && 'El dictamen se borra (queda en la bitácora) y la persona podrá enviarlo de nuevo.'}
              {accion?.tipo === 'quitar' && `${accion.a.evaluador ?? 'La persona'} ya no verá esta solicitud.${esAdmin ? '' : ' Queda registrada como retirada y puedes volver a asignarla.'}`}
              {accion?.tipo === 'fecha' && 'Se reinician los recordatorios con la nueva fecha.'}
              {accion?.tipo === 'decidir' && `Promedio ${datos.promedio ?? '—'} de ${datos.maximo} (${datos.porcentaje ?? '—'} %; mínimo ${datos.minimo_aprobatorio} %). Se avisará al solicitante.`}
            </DialogDescription>
          </DialogHeader>
          {accion?.tipo === 'fecha' && (
            <label className="grid gap-1 text-sm"><span className="font-medium">Nueva fecha límite<Asterisco /></span>
              <input type="date" min={manana} value={accion.valor} onChange={(e) => setAccion({ ...accion, valor: e.target.value })} className="auth-input auth-input-static pl-4" /></label>
          )}
          {(accion?.tipo === 'reabrir' || accion?.tipo === 'decidir') && (
            <label className="grid gap-1 text-sm"><span className="font-medium">Motivo<Asterisco /></span>
              <textarea rows={4} maxLength={accion.tipo === 'decidir' ? 1000 : 500} value={accion.valor} onChange={(e) => setAccion({ ...accion, valor: e.target.value })} className="auth-input auth-input-static pl-4" /></label>
          )}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAccion(null)}>Cancelar</Button>
            <Button variant={accion?.tipo === 'quitar' || (accion?.tipo === 'decidir' && accion.resultado === 'rechazada') ? 'destructive' : 'default'} onClick={ejecutar} disabled={enviando}>
              {enviando ? 'Guardando…' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PastelFrame>
  );
}
