'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Cookies from 'js-cookie';
import { ArrowRightLeft, Check, Clock, Loader2, Plus, ShieldCheck, X } from 'lucide-react';
import api from '@/lib/api';
import { AlertBox } from '@/components/ui/alert-box';
import { PANEL_POR_ROL, ROL_ETIQUETA, type RolSlug } from '@/lib/roles';
import { GRADO_ETIQUETA, PATRON_CORREO, PATRON_RFC, ROL_REGISTRO, erroresServidor } from '@/lib/registro';

/**
 * E52 · Fase 5 — "Mis roles" (dentro de Mi cuenta, en todos los paneles). Ver los roles otorgados, cambiar el rol
 * activo (reemite la sesión: el panel cambia) y pedir otro rol (lo aprueba un admin). El backend decide todo; aquí solo
 * se muestra y se envía.
 */

interface RolOtorgado { slug: string; nombre: string }
interface SolicitudRol { id: number; rol_solicitado: string; estado: 'pendiente' | 'aprobada' | 'rechazada'; motivo_rechazo: string | null; created_at: string }
interface Datos { activo: string | null; roles: RolOtorgado[]; disponibles: string[]; solicitudes: SolicitudRol[]; tiene_empresa: boolean }

const ESTADO: Record<SolicitudRol['estado'], { texto: string; tono: string }> = {
  pendiente: { texto: 'En revisión', tono: 'butter' },
  aprobada: { texto: 'Aprobada', tono: 'mint' },
  rechazada: { texto: 'No aprobada', tono: 'blush' },
};

const etiqueta = (slug: string) => ROL_ETIQUETA[slug as RolSlug] ?? slug;

export default function MisRoles() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [cambiando, setCambiando] = useState<string | null>(null);
  const [pidiendo, setPidiendo] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get('/mis-roles');
      setDatos({
        activo: typeof data?.activo === 'string' ? data.activo : null,
        roles: Array.isArray(data?.roles) ? data.roles.filter((r: RolOtorgado) => typeof r?.slug === 'string') : [],
        disponibles: Array.isArray(data?.disponibles) ? data.disponibles.filter((r: unknown) => typeof r === 'string') : [],
        solicitudes: Array.isArray(data?.solicitudes) ? data.solicitudes : [],
        tiene_empresa: Boolean(data?.tiene_empresa),
      });
    } catch {
      setError('No se pudieron cargar tus roles.');
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  const cambiar = async (slug: string) => {
    setCambiando(slug);
    setError('');
    try {
      const { data } = await api.post('/mis-roles/cambiar', { rol: slug });
      // Cookies de interfaz (no dan acceso: el backend y proxy.ts solo confían en el JWT HttpOnly que acaba de cambiar).
      const opts = { expires: 1, path: '/', sameSite: 'strict' as const, secure: window.location.protocol === 'https:' };
      Cookies.set('userRole', slug, opts);
      if (data?.user?.name) Cookies.set('userName', String(data.user.name), opts);
      window.location.href = PANEL_POR_ROL[slug as RolSlug] ?? '/';
    } catch (e) {
      setError(erroresServidor(e));
      setCambiando(null);
    }
  };

  if (!datos) {
    return (
      <section className="perfil-tarjeta" aria-labelledby="mis-roles">
        <h2 id="mis-roles" className="perfil-tarjeta-titulo">Mis roles</h2>
        {error ? <AlertBox type="error" message={error} /> : <p className="text-sm text-[var(--app-ink-2)]"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />Cargando…</p>}
      </section>
    );
  }

  return (
    <section className="perfil-tarjeta" aria-labelledby="mis-roles" id="roles">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="mis-roles" className="perfil-tarjeta-titulo">Mis roles</h2>
          <p className="text-sm text-[var(--app-ink-2)]">Cambia de rol para entrar a otro panel, o pide un rol nuevo. Cada rol nuevo lo aprueba un administrador.</p>
        </div>
      </div>

      {error && <div className="mt-3"><AlertBox type="error" message={error} onClose={() => setError('')} /></div>}
      {aviso && <div className="mt-3"><AlertBox type="success" message={aviso} onClose={() => setAviso('')} /></div>}

      <ul className="mis-roles-lista">
        {datos.roles.map((r) => {
          const activo = r.slug === datos.activo;
          return (
            <li key={r.slug} className="mis-roles-item" data-activo={activo || undefined}>
              <span className="mis-roles-icono" aria-hidden="true"><ShieldCheck className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <strong className="block">{etiqueta(r.slug)}</strong>
                <span className="text-xs text-[var(--app-ink-2)]">{activo ? 'Rol activo: es el panel que estás usando' : 'Disponible para cambiar'}</span>
              </span>
              {activo ? (
                <span className="pill" data-tone="mint"><Check className="h-3.5 w-3.5" aria-hidden="true" /> Activo</span>
              ) : (
                <button type="button" onClick={() => cambiar(r.slug)} disabled={cambiando !== null} className="mis-roles-cambiar">
                  {cambiando === r.slug ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />}
                  Usar este rol
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {datos.disponibles.length > 0 && !pidiendo && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold">Pedir otro rol</p>
          <div className="flex flex-wrap gap-2">
            {datos.disponibles.map((r) => (
              <button key={r} type="button" onClick={() => { setPidiendo(r); setAviso(''); }} className="mis-roles-pedir">
                <Plus className="h-4 w-4" aria-hidden="true" /> {ROL_REGISTRO[r as keyof typeof ROL_REGISTRO]?.titulo ?? etiqueta(r)}
              </button>
            ))}
          </div>
        </div>
      )}

      {pidiendo && (
        <PedirRol
          rol={pidiendo}
          tieneEmpresa={datos.tiene_empresa}
          onCancelar={() => setPidiendo(null)}
          onListo={(msg) => { setPidiendo(null); setAviso(msg); void cargar(); }}
        />
      )}

      {datos.solicitudes.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold">Mis solicitudes de rol</p>
          <ul className="space-y-2">
            {datos.solicitudes.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-[var(--app-ink-2)]" aria-hidden="true" />
                <span className="font-medium">{etiqueta(s.rol_solicitado)}</span>
                <span className="pill" data-tone={ESTADO[s.estado]?.tono ?? 'mist'}>{ESTADO[s.estado]?.texto ?? s.estado}</span>
                {s.estado === 'rechazada' && s.motivo_rechazo && <span className="text-xs text-[var(--app-ink-2)]">Motivo: {s.motivo_rechazo}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** Formulario para pedir un rol: los datos que exige ese rol (igual que en el registro). */
function PedirRol({ rol, tieneEmpresa, onCancelar, onListo }: { rol: string; tieneEmpresa: boolean; onCancelar: () => void; onListo: (m: string) => void }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [emp, setEmp] = useState({ nombre: '', rfc: '', responsable: '', correo: '' });
  const [ev, setEv] = useState({ area: '', institucion: '', grado: '' });
  const [cv, setCv] = useState<File | null>(null);
  const [areas, setAreas] = useState<{ id: number; nombre: string }[]>([]);
  const pideEmpresa = rol === 'solicitante' && !tieneEmpresa;

  useEffect(() => {
    if (rol !== 'evaluador') return;
    fetch('/api/registro/opciones', { credentials: 'omit', headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAreas(Array.isArray(d?.areas) ? d.areas.filter((a: { id?: unknown; nombre?: unknown }) => typeof a?.id === 'number' && typeof a?.nombre === 'string') : []))
      .catch(() => {});
  }, [rol]);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (pideEmpresa) {
      if (!emp.nombre.trim()) return setError('Escribe el nombre de tu empresa o institución.');
      if (emp.rfc && !PATRON_RFC.test(emp.rfc)) return setError('El RFC no tiene un formato válido.');
      if (!emp.responsable.trim() || !PATRON_CORREO.test(emp.correo.trim())) return setError('Registra el nombre y el correo del Responsable del proyecto.');
    }
    if (rol === 'evaluador') {
      if (!ev.area || !ev.institucion.trim() || !ev.grado) return setError('Completa tu área, institución y grado académico.');
      if (!cv) return setError('Adjunta tu CV en PDF.');
      if (cv.size > 5 * 1024 * 1024) return setError('El CV no puede pesar más de 5 MB.');
    }
    setEnviando(true);
    setError('');
    const fd = new FormData();
    fd.append('rol_solicitado', rol);
    if (pideEmpresa) {
      fd.append('empresa_nombre', emp.nombre.trim());
      if (emp.rfc) fd.append('empresa_datos[rfc]', emp.rfc.toUpperCase());
      fd.append('contactos[responsable][nombre]', emp.responsable.trim());
      fd.append('contactos[responsable][correo]', emp.correo.trim());
    }
    if (rol === 'evaluador' && cv) {
      fd.append('area_conocimiento_id', ev.area);
      fd.append('institucion', ev.institucion.trim());
      fd.append('grado_academico', ev.grado);
      fd.append('cv', cv);
    }
    try {
      const { data } = await api.post('/mis-roles/solicitar', fd, { headers: { 'Content-Type': undefined } });
      onListo(typeof data?.message === 'string' ? data.message : 'Tu solicitud fue enviada.');
    } catch (err) {
      setError(erroresServidor(err));
    } finally {
      setEnviando(false);
    }
  };

  const titulo = ROL_REGISTRO[rol as keyof typeof ROL_REGISTRO]?.titulo ?? rol;
  const campo = 'auth-input auth-input-static pl-4';

  return (
    <form onSubmit={enviar} className="mis-roles-form" noValidate>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Pedir el rol «{titulo}»</p>
          <p className="text-xs text-[var(--app-ink-2)]">{ROL_REGISTRO[rol as keyof typeof ROL_REGISTRO]?.detalle}</p>
        </div>
        <button type="button" onClick={onCancelar} aria-label="Cancelar" className="rounded-full p-1.5 hover:bg-[var(--app-surface-2,#f3f3f3)]"><X className="h-4 w-4" /></button>
      </div>
      {error && <AlertBox type="error" message={error} onClose={() => setError('')} />}
      {pideEmpresa && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-semibold sm:col-span-2">Empresa o institución *<input className={campo} value={emp.nombre} maxLength={255} onChange={(e) => setEmp({ ...emp, nombre: e.target.value })} /></label>
          <label className="grid gap-1 text-xs font-semibold">RFC<input className={campo} value={emp.rfc} maxLength={13} onChange={(e) => setEmp({ ...emp, rfc: e.target.value.toUpperCase() })} /></label>
          <label className="grid gap-1 text-xs font-semibold">Responsable del proyecto *<input className={campo} value={emp.responsable} maxLength={255} onChange={(e) => setEmp({ ...emp, responsable: e.target.value })} /></label>
          <label className="grid gap-1 text-xs font-semibold sm:col-span-2">Correo del responsable *<input type="email" className={campo} value={emp.correo} maxLength={255} onChange={(e) => setEmp({ ...emp, correo: e.target.value })} /></label>
        </div>
      )}
      {rol === 'solicitante' && tieneEmpresa && <p className="text-sm text-[var(--app-ink-2)]">Tu cuenta ya tiene una empresa registrada; no hace falta capturarla otra vez.</p>}
      {rol === 'lider_club' && <p className="text-sm text-[var(--app-ink-2)]">Cuando se apruebe, registrarás tu club desde el panel «Mi club».</p>}
      {rol === 'evaluador' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-semibold sm:col-span-2">Área de conocimiento *
            <select className={campo} value={ev.area} onChange={(e) => setEv({ ...ev, area: e.target.value })}>
              <option value="">Elige…</option>
              {areas.map((a) => <option key={a.id} value={String(a.id)}>{a.nombre}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold">Institución *<input className={campo} value={ev.institucion} maxLength={255} onChange={(e) => setEv({ ...ev, institucion: e.target.value })} /></label>
          <label className="grid gap-1 text-xs font-semibold">Grado académico *
            <select className={campo} value={ev.grado} onChange={(e) => setEv({ ...ev, grado: e.target.value })}>
              <option value="">Elige…</option>
              {Object.entries(GRADO_ETIQUETA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold sm:col-span-2">CV en PDF (máx. 5 MB) *<input type="file" accept="application/pdf,.pdf" className="registro-archivo" onChange={(e) => setCv(e.target.files?.[0] ?? null)} /></label>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={enviando} className="mis-roles-cambiar">
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />} Enviar solicitud
        </button>
        <button type="button" onClick={onCancelar} className="mis-roles-pedir">Cancelar</button>
      </div>
    </form>
  );
}
