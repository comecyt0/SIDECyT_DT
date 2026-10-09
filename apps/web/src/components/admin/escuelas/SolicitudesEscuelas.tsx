'use client';

import { useCallback, useEffect, useState } from 'react';
import { Inbox, Loader2, CheckCircle2, XCircle, MapPin, Phone, UserRound, Building2 } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Asterisco } from '@/components/ui/obligatorio';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import StepFrame from '@/components/ui/step-frame';
import AvisoErrores from '@/components/ui/aviso-errores';
import { erroresFormulario, mensajeError, type ErroresFormulario } from '@/lib/errores-formulario';
import { NIVEL_ESCUELA, SISTEMA_ESCUELA, fechaHora } from '@/lib/especie';

type Estado = 'pendiente' | 'aceptada' | 'rechazada';
interface Solicitud {
  id: number; cct: string; nombre: string; municipio: string; nivel: string; sistema: string; direccion: string; telefono: string; director: string;
  estado: Estado; motivo: string | null; created_at: string; revisado_at: string | null; clubes_count: number;
  lider: { name: string; email: string; telefono: string | null } | null; convocatoria: { nombre: string } | null;
  revisor: { name: string } | null; escuela: { cct: string; nombre: string } | null;
}
const ESTADO: Record<Estado, { etiqueta: string; tono: string }> = {
  pendiente: { etiqueta: 'Por revisar', tono: 'gold' }, aceptada: { etiqueta: 'Aceptada', tono: 'emerald' }, rechazada: { etiqueta: 'No aceptada', tono: 'red' },
};
const PATRON_CCT = /^15[A-Z]{3}\d{4}[A-Z]$/;
const inputCls = 'auth-input auth-input-static pl-4';
const labelCls = 'text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]';
const txt = (v: unknown, n = 300) => (typeof v === 'string' ? v.slice(0, n) : '');

function leer(v: unknown): { solicitudes: Solicitud[]; conteo: Record<Estado, number> } {
  const o = (v ?? {}) as Record<string, unknown>;
  const lista = Array.isArray(o.solicitudes) ? o.solicitudes : [];
  const c = (o.conteo ?? {}) as Record<string, unknown>;
  return {
    solicitudes: lista.flatMap((x) => {
      const s = x as Record<string, unknown>;
      if (!s || typeof s.id !== 'number' || !['pendiente', 'aceptada', 'rechazada'].includes(s.estado as string)) return [];
      const lid = s.lider as Record<string, unknown> | null;
      return [{
        id: s.id, cct: txt(s.cct, 10), nombre: txt(s.nombre, 255), municipio: txt(s.municipio, 120), nivel: txt(s.nivel, 20), sistema: txt(s.sistema, 10),
        direccion: txt(s.direccion), telefono: txt(s.telefono, 20), director: txt(s.director, 150), estado: s.estado as Estado,
        motivo: typeof s.motivo === 'string' ? s.motivo.slice(0, 1000) : null, created_at: txt(s.created_at, 40), revisado_at: typeof s.revisado_at === 'string' ? s.revisado_at : null,
        clubes_count: Number(s.clubes_count) || 0,
        lider: lid ? { name: txt(lid.name, 255), email: txt(lid.email, 255), telefono: typeof lid.telefono === 'string' ? lid.telefono.slice(0, 20) : null } : null,
        convocatoria: s.convocatoria ? { nombre: txt((s.convocatoria as Record<string, unknown>).nombre, 255) } : null,
        revisor: s.revisor ? { name: txt((s.revisor as Record<string, unknown>).name, 255) } : null,
        escuela: s.escuela ? { cct: txt((s.escuela as Record<string, unknown>).cct, 10), nombre: txt((s.escuela as Record<string, unknown>).nombre, 255) } : null,
      }];
    }),
    conteo: { pendiente: Number(c.pendiente) || 0, aceptada: Number(c.aceptada) || 0, rechazada: Number(c.rechazada) || 0 },
  };
}

type Dialogo = { tipo: 'aceptar' | 'rechazar'; s: Solicitud } | null;

/**
 * E55 — Solicitudes de registro de escuela (admin y admin de convocatoria; el servidor solo devuelve las de su alcance).
 * Aceptar: se revisan y corrigen los datos y se confirma «¿Estás seguro de que quieres aceptar…?». Rechazar: motivo
 * obligatorio y confirmación «¿Estás seguro de que no quieres aceptar…?». El líder recibe aviso por campana y correo.
 */
export default function SolicitudesEscuelas({ onConteo }: { onConteo?: (pendientes: number) => void }) {
  const [estado, setEstado] = useState<Estado>('pendiente');
  const [datos, setDatos] = useState<{ solicitudes: Solicitud[]; conteo: Record<Estado, number> } | null>(null);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [form, setForm] = useState({ cct: '', nombre: '', municipio: '', nivel: 'primaria', sistema: 'estatal', motivo: '' });
  const [errores, setErrores] = useState<ErroresFormulario | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/escuelas/solicitudes', { params: { estado } });
      const d = leer(data);
      setDatos(d);
      onConteo?.(d.conteo.pendiente);
    } catch (e) {
      setDatos({ solicitudes: [], conteo: { pendiente: 0, aceptada: 0, rechazada: 0 } });
      setAviso({ ok: false, texto: mensajeError(e, 'No se pudieron cargar las solicitudes.') });
    }
  }, [estado, onConteo]);
  useEffect(() => { void cargar(); }, [cargar]);

  const abrir = (tipo: 'aceptar' | 'rechazar', s: Solicitud) => {
    setErrores(null); setConfirmar(false);
    setForm({ cct: s.cct, nombre: s.nombre, municipio: s.municipio, nivel: s.nivel, sistema: s.sistema, motivo: '' });
    setDialogo({ tipo, s });
  };

  const ejecutar = async () => {
    if (!dialogo) return;
    setConfirmar(false); setEnviando(true); setErrores(null);
    try {
      if (dialogo.tipo === 'aceptar') {
        await api.post(`/admin/escuelas/solicitudes/${dialogo.s.id}/aceptar`, { cct: form.cct.trim().toUpperCase(), nombre: form.nombre.trim(), municipio: form.municipio.trim(), nivel: form.nivel, sistema: form.sistema });
        setAviso({ ok: true, texto: `«${form.nombre.trim()}» quedó en el catálogo y se asignó a ${dialogo.s.clubes_count === 1 ? 'su club' : `${dialogo.s.clubes_count} clubes`}. El líder recibió aviso por campana y correo.` });
      } else {
        await api.post(`/admin/escuelas/solicitudes/${dialogo.s.id}/rechazar`, { motivo: form.motivo.trim() });
        setAviso({ ok: true, texto: 'Solicitud no aceptada. El líder recibió el motivo por campana y correo.' });
      }
      setDialogo(null);
      void cargar();
    } catch (e) {
      setErrores(erroresFormulario(e, { cct: 'CCT', nombre: 'Nombre', municipio: 'Municipio', nivel: 'Nivel', sistema: 'Sistema', motivo: 'Motivo', solicitud: 'Solicitud' }, {}));
    } finally {
      setEnviando(false);
    }
  };

  const validar = () => {
    if (!dialogo) return null;
    if (dialogo.tipo === 'rechazar') return form.motivo.trim().length >= 10 ? null : 'Explica el motivo (al menos 10 caracteres).';
    if (!PATRON_CCT.test(form.cct.trim().toUpperCase())) return 'La CCT debe ser del Estado de México (p. ej. 15EPR0001A).';
    if (form.nombre.trim().length < 5) return 'Escribe el nombre de la escuela.';
    if (!form.municipio.trim()) return 'Escribe el municipio.';
    return null;
  };

  return (
    <div className="space-y-4">
      {aviso && <p role="status" className="rounded-[14px] px-4 py-3 text-sm" style={{ backgroundColor: aviso.ok ? 'var(--tile-emerald-bg)' : 'var(--tile-vino-bg)', color: aviso.ok ? 'var(--app-ink)' : 'var(--auth-danger)' }}>{aviso.texto}</p>}
      <div className="seg-tabs" role="tablist" aria-label="Estado de las solicitudes">
        {(['pendiente', 'aceptada', 'rechazada'] as Estado[]).map((e) => (
          <button key={e} type="button" role="tab" aria-selected={estado === e} onClick={() => setEstado(e)} className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold">
            {e === 'pendiente' ? 'Por revisar' : e === 'aceptada' ? 'Aceptadas' : 'No aceptadas'}{datos ? ` (${datos.conteo[e]})` : ''}
          </button>
        ))}
      </div>

      {datos === null ? (
        <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin" aria-label="Cargando" /></div>
      ) : datos.solicitudes.length === 0 ? (
        <div className="empty-state">
          <span className="tone-chip" data-tone="sky"><Inbox aria-hidden="true" /></span>
          <p className="font-bold text-[var(--app-ink)]">{estado === 'pendiente' ? 'No hay solicitudes por revisar' : 'Sin solicitudes en esta vista'}</p>
          <p className="text-sm text-[var(--app-ink-2)]">Cuando un líder de club no encuentre su escuela, su solicitud aparecerá aquí.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {datos.solicitudes.map((s) => (
            <li key={s.id} className="app-card space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words font-semibold text-[var(--app-ink)]">{s.nombre}</p>
                  <p className="text-xs text-[var(--app-ink-2)]"><span className="font-mono">{s.cct}</span> · {s.municipio} · {NIVEL_ESCUELA[s.nivel] ?? s.nivel} · {SISTEMA_ESCUELA[s.sistema] ?? s.sistema}</p>
                </div>
                <span className="pill" data-tone={ESTADO[s.estado].tono}>{ESTADO[s.estado].etiqueta}</span>
              </div>
              <dl className="grid grid-cols-1 gap-1.5 text-sm text-[var(--app-ink)] sm:grid-cols-2">
                <div className="flex items-start gap-1.5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--app-ink-2)]" aria-hidden="true" /><span className="break-words">{s.direccion}</span></div>
                <div className="flex items-center gap-1.5"><Phone className="h-4 w-4 shrink-0 text-[var(--app-ink-2)]" aria-hidden="true" />{s.telefono}</div>
                <div className="flex items-center gap-1.5"><Building2 className="h-4 w-4 shrink-0 text-[var(--app-ink-2)]" aria-hidden="true" />Dirección: {s.director}</div>
                <div className="flex items-center gap-1.5"><UserRound className="h-4 w-4 shrink-0 text-[var(--app-ink-2)]" aria-hidden="true" /><span className="break-words">{s.lider?.name}{s.lider?.email ? ` · ${s.lider.email}` : ''}</span></div>
              </dl>
              <p className="text-xs text-[var(--app-ink-2)]">
                {s.convocatoria ? `Convocatoria: ${s.convocatoria.nombre} · ` : ''}Solicitada el {fechaHora(s.created_at)}{s.clubes_count ? ` · ${s.clubes_count} club(es) la esperan` : ''}
              </p>
              {s.estado === 'rechazada' && s.motivo && <p className="rounded-[12px] px-3 py-2 text-sm" style={{ backgroundColor: 'var(--tile-vino-bg)' }}>Motivo: {s.motivo}</p>}
              {s.estado !== 'pendiente' && <p className="text-xs text-[var(--app-ink-2)]">Resolvió {s.revisor?.name ?? '—'} el {fechaHora(s.revisado_at)}{s.escuela ? ` · en el catálogo como ${s.escuela.cct}` : ''}</p>}
              {s.estado === 'pendiente' && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => abrir('aceptar', s)}><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Revisar y aceptar</Button>
                  <Button size="sm" variant="destructive" onClick={() => abrir('rechazar', s)}><XCircle className="h-4 w-4" aria-hidden="true" />No aceptar</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <StepFrame
        open={dialogo !== null}
        size="md"
        title={dialogo?.tipo === 'aceptar' ? 'Aceptar escuela' : 'No aceptar la solicitud'}
        icon={dialogo?.tipo === 'aceptar' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
        intro={dialogo?.tipo === 'aceptar'
          ? <>Revisa los datos y corrígelos si hace falta. La escuela entra al catálogo y se asigna sola a los clubes que la esperan.</>
          : <>El líder verá el motivo y podrá corregir su solicitud o elegir otra escuela.</>}
        onClose={() => setDialogo(null)}
        onSubmit={() => setConfirmar(true)}
        submitting={enviando}
        submitLabel={dialogo?.tipo === 'aceptar' ? 'Aceptar escuela' : 'No aceptar'}
        error={errores ? <AvisoErrores errores={errores} /> : null}
        steps={dialogo ? [{
          key: 'datos', label: dialogo.tipo === 'aceptar' ? 'Datos' : 'Motivo',
          question: dialogo.tipo === 'aceptar' ? '¿Los datos de la escuela son correctos?' : '¿Por qué no se acepta?',
          validate: validar,
          content: dialogo.tipo === 'aceptar' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="space-y-1.5"><span className={labelCls}>CCT <Asterisco /></span><input className={`${inputCls} uppercase`} maxLength={10} value={form.cct} onChange={(e) => setForm({ ...form, cct: e.target.value.toUpperCase() })} /></label>
              <label className="space-y-1.5"><span className={labelCls}>Municipio <Asterisco /></span><input className={inputCls} maxLength={120} value={form.municipio} onChange={(e) => setForm({ ...form, municipio: e.target.value })} /></label>
              <label className="space-y-1.5 sm:col-span-2"><span className={labelCls}>Nombre <Asterisco /></span><input className={inputCls} maxLength={255} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label>
              <label className="space-y-1.5"><span className={labelCls}>Nivel <Asterisco /></span>
                <select className={inputCls} value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })}>{Object.entries(NIVEL_ESCUELA).map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
              <label className="space-y-1.5"><span className={labelCls}>Sistema <Asterisco /></span>
                <select className={inputCls} value={form.sistema} onChange={(e) => setForm({ ...form, sistema: e.target.value })}>{Object.entries(SISTEMA_ESCUELA).map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
            </div>
          ) : (
            <label className="block space-y-1.5"><span className={labelCls}>Motivo <Asterisco /></span>
              <textarea className={`${inputCls} !h-auto min-h-[110px] resize-y py-3`} maxLength={1000} value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                placeholder="Ej. La CCT no corresponde a esa escuela; verifica la clave en tu credencial escolar." /></label>
          ),
        }] : []}
      />
      <ConfirmDialog
        open={confirmar}
        variant={dialogo?.tipo === 'rechazar' ? 'destructive' : undefined}
        title={dialogo?.tipo === 'aceptar' ? '¿Estás seguro de que quieres aceptar esta escuela?' : '¿Estás seguro de que no quieres aceptar esta escuela?'}
        description={dialogo?.tipo === 'aceptar'
          ? `«${form.nombre.trim()}» (${form.cct.trim().toUpperCase()}) se agrega al catálogo y el líder podrá continuar con su club.`
          : 'El líder y sus acompañantes recibirán el motivo por campana y correo.'}
        confirmLabel={dialogo?.tipo === 'aceptar' ? 'Sí, aceptar' : 'Sí, no aceptar'}
        onCancel={() => setConfirmar(false)}
        onConfirm={() => void ejecutar()}
      />
    </div>
  );
}
