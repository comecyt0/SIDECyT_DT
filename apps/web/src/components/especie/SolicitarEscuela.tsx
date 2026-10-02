'use client';

import { useId, useState } from 'react';
import { Send, Loader2, X, School } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { NIVEL_ESCUELA, SISTEMA_ESCUELA } from '@/lib/especie';

export interface SolicitudEscuela { id: number; cct: string; nombre: string; municipio: string; nivel: string; sistema: string; estado: 'pendiente' | 'aceptada' | 'rechazada'; motivo?: string | null; escuela_id?: number | null }

const PATRON_CCT = /^15[A-Z]{3}\d{4}[A-Z]$/;
const inputCls = 'auth-input auth-input-static pl-4';
const labelCls = 'text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]';
const VACIO = { cct: '', nombre: '', municipio: '', nivel: 'primaria', sistema: 'estatal', direccion: '', telefono: '', director: '' };
type Campo = keyof typeof VACIO;

/** Validación igual a la del servidor (EscuelaSolicitudController::validarDatos). */
export function validarSolicitudEscuela(f: typeof VACIO): Partial<Record<Campo, string>> {
  const e: Partial<Record<Campo, string>> = {};
  if (!PATRON_CCT.test(f.cct.trim().toUpperCase())) e.cct = 'La CCT del Estado de México tiene 10 caracteres, p. ej. 15EPR0001A.';
  if (f.nombre.trim().length < 5) e.nombre = 'Escribe el nombre completo de la escuela.';
  if (!f.municipio.trim()) e.municipio = 'Escribe el municipio.';
  if (f.direccion.trim().length < 10) e.direccion = 'Escribe la dirección (calle, número y colonia).';
  if (!/^\d{10}$/.test(f.telefono.trim())) e.telefono = 'Escribe el teléfono de la escuela a 10 dígitos, sin espacios.';
  if (f.director.trim().length < 5) e.director = 'Escribe el nombre de la directora o director.';
  return e;
}

/**
 * E55 — «Solicitar registro de escuela» (en línea, dentro del alta del club). Llega al COMECYT como solicitud con aviso
 * por campana y correo; mientras se revisa, el club queda con la escuela «en revisión». Si la CCT ya está en el catálogo o
 * ya la pidió alguien, el servidor responde con el aviso de contactar a la dirección escolar o al COMECYT.
 */
export default function SolicitarEscuela({ convocatoriaId, onEnviada, onCancelar }: {
  convocatoriaId: number; onEnviada: (s: SolicitudEscuela) => void; onCancelar: () => void;
}) {
  const id = useId();
  const [f, setF] = useState(VACIO);
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const set = (k: Campo, v: string) => { setF((x) => ({ ...x, [k]: v })); setErrores((e) => { const n = { ...e }; delete n[k]; return n; }); };

  const enviar = async () => {
    setGeneral(null);
    const e = validarSolicitudEscuela(f);
    setErrores(e);
    if (Object.keys(e).length) return;
    setEnviando(true);
    try {
      const { data } = await api.post('/club/escuelas/solicitudes', {
        convocatoria_id: convocatoriaId, cct: f.cct.trim().toUpperCase(), nombre: f.nombre.trim(), municipio: f.municipio.trim(),
        nivel: f.nivel, sistema: f.sistema, direccion: f.direccion.trim(), telefono: f.telefono.trim(), director: f.director.trim(),
      });
      if (data && typeof data.id === 'number') onEnviada({ ...data, estado: 'pendiente' } as SolicitudEscuela);
    } catch (er) {
      const r = (er as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } } })?.response;
      const errs = r?.data?.errors ?? {};
      const porCampo: Partial<Record<Campo, string>> = {};
      for (const [k, v] of Object.entries(errs)) if (k in VACIO && Array.isArray(v)) porCampo[k as Campo] = String(v[0]);
      setErrores(porCampo);
      const otros = Object.entries(errs).filter(([k]) => !(k in VACIO)).map(([, v]) => (Array.isArray(v) ? v[0] : '')).filter(Boolean);
      setGeneral(otros[0] ?? (Object.keys(porCampo).length ? null : (r?.status === 429 ? 'Hiciste varias solicitudes seguidas. Espera unos minutos.' : r?.data?.message ?? 'No se pudo enviar la solicitud.')));
    } finally {
      setEnviando(false);
    }
  };

  const campo = (k: Campo, etiqueta: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block space-y-1.5" htmlFor={`${id}-${k}`}>
      <span className={labelCls}>{etiqueta} *</span>
      <input id={`${id}-${k}`} className={inputCls} value={f[k]} onChange={(e) => set(k, e.target.value)} aria-invalid={errores[k] ? 'true' : undefined}
        aria-describedby={errores[k] ? `${id}-${k}-err` : undefined} {...props} />
      {errores[k] && <span id={`${id}-${k}-err`} role="alert" className="block text-xs font-medium" style={{ color: 'var(--auth-danger)' }}>{errores[k]}</span>}
    </label>
  );

  return (
    <section className="space-y-4 rounded-[16px] border-2 p-4" style={{ borderColor: 'var(--auth-vino)' }} aria-labelledby={`${id}-tit`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 id={`${id}-tit`} className="flex items-center gap-2 text-sm font-bold text-[var(--app-ink)]"><School className="h-4 w-4" aria-hidden="true" />Solicitar registro de escuela</h3>
          <p className="text-xs text-[var(--app-ink-2)]">El COMECYT la revisa y te avisa por correo. Mientras tanto puedes avanzar con tu club; lo envías cuando la escuela esté dada de alta.</p>
        </div>
        <button type="button" onClick={onCancelar} className="rounded-full p-1 text-[var(--app-ink-2)] hover:bg-[var(--app-rule)]" aria-label="Cerrar la solicitud de escuela"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {campo('cct', 'CCT (clave de la escuela)', { maxLength: 10, placeholder: '15EPR0001A', className: `${inputCls} uppercase`, autoCapitalize: 'characters' })}
        {campo('municipio', 'Municipio', { maxLength: 120, placeholder: 'Toluca' })}
        <div className="sm:col-span-2">{campo('nombre', 'Nombre de la escuela', { maxLength: 255 })}</div>
        <label className="block space-y-1.5"><span className={labelCls}>Nivel *</span>
          <select className={inputCls} value={f.nivel} onChange={(e) => set('nivel', e.target.value)}>{Object.entries(NIVEL_ESCUELA).map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
        <label className="block space-y-1.5"><span className={labelCls}>Sistema *</span>
          <select className={inputCls} value={f.sistema} onChange={(e) => set('sistema', e.target.value)}>{Object.entries(SISTEMA_ESCUELA).map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
        <div className="sm:col-span-2">{campo('direccion', 'Dirección', { maxLength: 300, placeholder: 'Calle, número, colonia' })}</div>
        {campo('telefono', 'Teléfono de la escuela', { maxLength: 10, inputMode: 'numeric', placeholder: '7221234567' })}
        {campo('director', 'Directora o director', { maxLength: 150 })}
      </div>
      {general && <p role="alert" className="rounded-[12px] px-3 py-2 text-sm" style={{ backgroundColor: 'var(--tile-vino-bg)', color: 'var(--auth-danger)' }}>{general}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void enviar()} disabled={enviando}>
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}Enviar solicitud
        </Button>
        <Button type="button" variant="outline" onClick={onCancelar}>Cancelar</Button>
      </div>
    </section>
  );
}
