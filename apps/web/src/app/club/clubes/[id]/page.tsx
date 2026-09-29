'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  School, Loader2, Save, Upload, Trash2, Pencil, Plus, User, Crown, Camera, FileDown, CheckCircle2, CircleDashed,
  Send, AlertTriangle, Shapes, ListChecks,
} from 'lucide-react';
import api from '@/lib/api';
import PageHeader from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { AlertBox } from '@/components/ui/alert-box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import StepFrame from '@/components/ui/step-frame';
import FotoClub from '@/components/especie/FotoClub';
import EscuelaPicker from '@/components/especie/EscuelaPicker';
import CampoDinamico from '@/components/especie/CampoDinamico';
import LineaAvanceClub from '@/components/especie/LineaAvanceClub';
import ClubResumen from '@/components/especie/ClubResumen';
import AvisoEstadoClub from '@/components/especie/AvisoEstadoClub';
import HistorialClub from '@/components/especie/HistorialClub';
import LogisticaLider from '@/components/especie/LogisticaLider';
import { descargarCartaEscuela, descargarDocumentoClub } from '@/lib/especie-api';
import {
  ACCEPT_FORMATO, ACCEPT_IMAGEN, CAMPOS_INTEGRANTE, CARTA_ESCUELA, ESTADO_CLUB, ETIQUETA_FORMATO, IMAGEN_MAX_MB, SEXO,
  leerCamposApi, normalizarPredef, CAMPOS_CLUB, valorCampo,
  leerLogistica, type LogisticaEstado,
  type CampoApi, type ClubApi, type DocumentoClub, type EntradaHistorial, type EscuelaApi, type IntegranteApi, type Predef,
} from '@/lib/especie';
import { PATRON_CURP, PATRON_TELEFONO, PATRON_CORREO } from '@/lib/registro';
import { formatDate } from '@/lib/format';

interface Detalle {
  club: ClubApi;
  integrantes: IntegranteApi[];
  documentos: DocumentoClub[];
  config: {
    min_integrantes: number; max_integrantes: number; participan_menores: boolean; kit_nombre: string | null; kit_descripcion: string | null;
    campos_club: Record<string, Predef>; campos_integrante: Record<string, Predef>; campos: CampoApi[];
  };
  convocatoria: { id: number; nombre: string; acepta: boolean; fecha_limite: string | null };
  faltantes: string[];
  historial: EntradaHistorial[];
  logistica: LogisticaEstado | null;
}

type FormIntegrante = { nombre: string; fecha_nacimiento: string; sexo: string; curp: string; grado_grupo: string; correo: string; telefono: string; datos: Record<string, string> };
const INT_VACIO: FormIntegrante = { nombre: '', fecha_nacimiento: '', sexo: '', curp: '', grado_grupo: '', correo: '', telefono: '', datos: {} };
const labelCls = 'text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]';
const inputCls = 'auth-input auth-input-static pl-4';

function errores(e: unknown): { mensaje: string; campos: Record<string, string>; faltantes: string[] } {
  const d = (e as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]>; faltantes?: unknown } } })?.response;
  const campos: Record<string, string> = {};
  for (const [k, v] of Object.entries(d?.data?.errors ?? {})) campos[k] = Array.isArray(v) ? String(v[0]) : String(v);
  const faltantes = Array.isArray(d?.data?.faltantes) ? (d!.data!.faltantes as unknown[]).filter((x): x is string => typeof x === 'string') : [];
  const primero = Object.values(campos)[0];
  const mensaje = d?.status === 429 ? 'Demasiadas acciones seguidas. Espera un momento.' : primero || d?.data?.message || 'No se pudo completar la acción. Inténtalo de nuevo.';
  return { mensaje, campos, faltantes };
}

function leerDetalle(data: unknown): Detalle | null {
  const d = data as Partial<Detalle> | null;
  if (!d?.club || typeof d.club.id !== 'number') return null;
  const cfg = (d.config ?? {}) as Partial<Detalle['config']>;
  return {
    club: d.club,
    integrantes: Array.isArray(d.integrantes) ? d.integrantes : [],
    documentos: Array.isArray(d.documentos) ? d.documentos : [],
    config: {
      min_integrantes: Number(cfg.min_integrantes) || 1,
      max_integrantes: Number(cfg.max_integrantes) || 10,
      participan_menores: cfg.participan_menores !== false,
      kit_nombre: typeof cfg.kit_nombre === 'string' ? cfg.kit_nombre : null,
      kit_descripcion: typeof cfg.kit_descripcion === 'string' ? cfg.kit_descripcion : null,
      campos_club: normalizarPredef(cfg.campos_club, CAMPOS_CLUB, {}),
      campos_integrante: normalizarPredef(cfg.campos_integrante, CAMPOS_INTEGRANTE, {}),
      campos: leerCamposApi(cfg.campos),
    },
    convocatoria: d.convocatoria ?? { id: 0, nombre: '', acepta: false, fecha_limite: null },
    faltantes: Array.isArray(d.faltantes) ? d.faltantes.filter((x): x is string => typeof x === 'string') : [],
    historial: Array.isArray(d.historial) ? d.historial : [],
    logistica: leerLogistica(d.logistica),
  };
}

async function subirArchivo(url: string, campo: string, archivo: File, extra: Record<string, string> = {}) {
  const fd = new FormData();
  fd.append(campo, archivo);
  for (const [k, v] of Object.entries(extra)) fd.append(k, v);
  // E32: sin Content-Type propio, el navegador arma el multipart con su boundary.
  return api.post(url, fd, { headers: { 'Content-Type': undefined } });
}

/** Botón que abre el selector de archivos (input oculto accesible). */
function BotonArchivo({ accept, onArchivo, children, disabled, variant = 'outline', etiqueta }: {
  accept: string; onArchivo: (f: File) => void; children: React.ReactNode; disabled?: boolean; variant?: 'outline' | 'soft' | 'default'; etiqueta: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button type="button" size="sm" variant={variant} disabled={disabled} onClick={() => ref.current?.click()} aria-label={etiqueta}>{children}</Button>
      <input ref={ref} type="file" accept={accept} className="sr-only" tabIndex={-1} aria-hidden="true"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onArchivo(f); e.target.value = ''; }} />
    </>
  );
}

/**
 * E52 · F1 — Club del líder: datos, logo, integrantes con foto, documentos (con la carta de la escuela generada) y envío a
 * revisión. Solo se edita en captura (borrador); después se muestra de solo lectura con su línea de avance.
 */
export default function MiClubPage() {
  const { id } = useParams();
  const [d, setD] = useState<Detalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  // Datos del club
  const [nombre, setNombre] = useState('');
  const [escuela, setEscuela] = useState<EscuelaApi | null>(null);
  const [datosClub, setDatosClub] = useState<Record<string, string>>({});
  const [erroresClub, setErroresClub] = useState<Record<string, string>>({});

  // Integrantes
  const [dialogo, setDialogo] = useState<{ id: number | null; form: FormIntegrante; lider: boolean } | null>(null);
  const [errDialogo, setErrDialogo] = useState<string | null>(null);
  const [erroresInt, setErroresInt] = useState<Record<string, string>>({});
  const [quitar, setQuitar] = useState<IntegranteApi | null>(null);

  // Envío
  const [confirmarEnvio, setConfirmarEnvio] = useState(false);
  const [faltantesEnvio, setFaltantesEnvio] = useState<string[]>([]);
  const [aceptoPrivacidad, setAceptoPrivacidad] = useState(false);

  const aplicar = useCallback((det: Detalle) => {
    setD(det);
    setNombre(det.club.nombre);
    setEscuela(det.club.escuela);
    const dc: Record<string, string> = {};
    for (const [k, v] of Object.entries(det.club.datos ?? {})) if (v !== null && v !== undefined) dc[k] = String(v);
    setDatosClub(dc);
  }, []);

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get(`/club/clubes/${id}`);
      const det = leerDetalle(data);
      if (!det) throw new Error('forma');
      aplicar(det);
    } catch {
      setD(null);
    } finally {
      setCargando(false);
    }
  }, [id, aplicar]);
  useEffect(() => { void cargar(); }, [cargar]);

  const accion = async (clave: string, fn: () => Promise<unknown>, exito?: string) => {
    setOcupado(clave);
    try {
      await fn();
      if (exito) setAviso({ tipo: 'success', texto: exito });
      await cargar();
      return true;
    } catch (e) {
      setAviso({ tipo: 'error', texto: errores(e).mensaje });
      return false;
    } finally {
      setOcupado(null);
    }
  };

  if (cargando) return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin" aria-label="Cargando" /></div>;
  if (!d) {
    return (
      <div className="space-y-6">
        <PageHeader title="Mi club" backHref="/club/dashboard" backLabel="Volver a mi club" icon={<School className="h-5 w-5" />} />
        <AlertBox type="error" message="No encontramos este club. Vuelve a tu panel e inténtalo de nuevo." />
      </div>
    );
  }

  const { club, config } = d;
  const est = ESTADO_CLUB[club.estado] ?? { etiqueta: club.estado, tono: 'neutral' };
  const editable = club.editable === true;
  // E52 · F2: corrigiendo una observación dentro del plazo (misma pantalla de edición, envío = "Enviar correcciones").
  const subsanando = club.estado === 'observado';
  const camposClub = config.campos.filter((c) => c.ambito === 'club');
  const camposInt = config.campos.filter((c) => c.ambito === 'integrante');
  const pc = config.campos_club;
  const pi = config.campos_integrante;
  const lleno = d.integrantes.length >= config.max_integrantes;

  const guardarDatos = async () => {
    const e: Record<string, string> = {};
    if (nombre.trim().length < 3) e.nombre = 'Escribe el nombre del club (al menos 3 letras).';
    if (!escuela) e.escuela_id = 'Elige la escuela del catálogo.';
    setErroresClub(e);
    if (Object.keys(e).length) return;
    const datos: Record<string, string> = {};
    if (pc.descripcion?.pedir) datos.descripcion = datosClub.descripcion ?? '';
    for (const c of camposClub) datos[c.nombre_campo] = datosClub[c.nombre_campo] ?? '';
    setOcupado('datos');
    try {
      await api.put(`/club/clubes/${club.id}`, { nombre: nombre.trim(), escuela_id: escuela!.id, datos });
      setAviso({ tipo: 'success', texto: 'Datos del club guardados.' });
      await cargar();
    } catch (er) {
      const r = errores(er);
      setErroresClub(r.campos);
      setAviso({ tipo: 'error', texto: r.mensaje });
    } finally {
      setOcupado(null);
    }
  };

  const validarImagen = (f: File) => {
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { setAviso({ tipo: 'error', texto: 'Sube una imagen JPG, PNG o WebP.' }); return false; }
    if (f.size > IMAGEN_MAX_MB * 1024 * 1024) { setAviso({ tipo: 'error', texto: `La imagen no puede pesar más de ${IMAGEN_MAX_MB} MB.` }); return false; }
    return true;
  };

  const abrirIntegrante = (i: IntegranteApi | null) => {
    setErrDialogo(null);
    setErroresInt({});
    if (!i) { setDialogo({ id: null, form: { ...INT_VACIO, datos: {} }, lider: false }); return; }
    const datos: Record<string, string> = {};
    for (const [k, v] of Object.entries(i.datos ?? {})) if (v !== null && v !== undefined) datos[k] = String(v);
    setDialogo({
      id: i.id, lider: i.es_lider,
      form: {
        nombre: i.nombre ?? '', fecha_nacimiento: i.fecha_nacimiento ? String(i.fecha_nacimiento).slice(0, 10) : '', sexo: i.sexo ?? '',
        curp: i.curp ?? '', grado_grupo: i.grado_grupo ?? '', correo: i.correo ?? '', telefono: i.telefono ?? '', datos,
      },
    });
  };

  const guardarIntegrante = async () => {
    if (!dialogo) return;
    const f = dialogo.form;
    const e: Record<string, string> = {};
    if (f.nombre.trim().length < 3) e.nombre = 'Escribe el nombre completo.';
    if (pi.curp?.pedir && f.curp && !PATRON_CURP.test(f.curp)) e.curp = 'La CURP no tiene un formato válido.';
    if (pi.telefono?.pedir && f.telefono && !PATRON_TELEFONO.test(f.telefono)) e.telefono = 'El teléfono debe tener 10 dígitos.';
    if (pi.correo?.pedir && f.correo && !PATRON_CORREO.test(f.correo)) e.correo = 'Revisa el correo.';
    setErroresInt(e);
    if (Object.keys(e).length) { setErrDialogo(Object.values(e)[0]); return; }
    const cuerpo: Record<string, unknown> = { nombre: f.nombre.trim(), datos: {} as Record<string, string> };
    for (const k of ['fecha_nacimiento', 'sexo', 'curp', 'grado_grupo', 'correo', 'telefono'] as const) {
      if (pi[k]?.pedir) cuerpo[k] = f[k].trim() || null;
    }
    const datos: Record<string, string> = {};
    for (const c of camposInt) datos[c.nombre_campo] = f.datos[c.nombre_campo] ?? '';
    cuerpo.datos = datos;
    setOcupado('integrante');
    try {
      if (dialogo.id) await api.put(`/club/clubes/${club.id}/integrantes/${dialogo.id}`, cuerpo);
      else await api.post(`/club/clubes/${club.id}/integrantes`, cuerpo);
      setDialogo(null);
      setAviso({ tipo: 'success', texto: dialogo.id ? 'Integrante actualizado.' : 'Integrante agregado. Si se pide foto, súbela desde su tarjeta.' });
      await cargar();
    } catch (er) {
      const r = errores(er);
      setErroresInt(r.campos);
      setErrDialogo(r.mensaje);
    } finally {
      setOcupado(null);
    }
  };

  const enviar = async () => {
    setConfirmarEnvio(false);
    setFaltantesEnvio([]);
    setOcupado('enviar');
    try {
      // Primer envío: aviso de privacidad aceptado (E52 · F2). Correcciones: no se vuelve a pedir.
      await api.post(`/club/clubes/${club.id}/enviar`, subsanando ? {} : { acepto_privacidad: aceptoPrivacidad });
      setAviso({ tipo: 'success', texto: subsanando
        ? '¡Listo! Enviaste tus correcciones. Te avisaremos del resultado por aquí y por correo.'
        : '¡Listo! Tu club se envió a revisión. Te avisaremos por aquí y por correo.' });
      await cargar();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (er) {
      const r = errores(er);
      setFaltantesEnvio(r.faltantes);
      setAviso({ tipo: 'error', texto: r.mensaje });
    } finally {
      setOcupado(null);
    }
  };

  const descargarDoc = async (clave: string, nombreArchivo: string) => {
    setOcupado(`dl-${clave}`);
    try { await descargarDocumentoClub(club.id, clave, nombreArchivo); }
    catch { setAviso({ tipo: 'error', texto: 'No se pudo descargar el documento.' }); }
    finally { setOcupado(null); }
  };

  const header = (
    <PageHeader title={club.nombre} eyebrow={d.convocatoria.nombre} icon={<School className="h-5 w-5" />}
      backHref="/club/dashboard" backLabel="Volver a mi club"
      description={subsanando
        ? 'Corrige lo que te pidieron (puedes cambiar cualquier dato) y envía tus correcciones antes de que venza el plazo.'
        : editable
          ? 'Completa los datos, agrega a los integrantes y sube los documentos. Cuando todo esté listo, envía tu club a revisión.'
          : 'Aquí ves lo que registraste, en qué etapa va y el historial de tu club.'} />
  );

  // ─────────── Solo lectura (en revisión, aceptado, no aceptado) ───────────
  if (!editable) {
    return (
      <div className="space-y-6">
        {header}
        {aviso && <AlertBox type={aviso.tipo} message={aviso.texto} onClose={() => setAviso(null)} />}
        <section className="app-card space-y-3 p-5" aria-label="Avance">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-[var(--app-ink-2)]">Folio <span className="font-mono font-semibold text-[var(--app-ink)]">{club.folio}</span></p>
            <span className="pill" data-tone={est.tono} data-dot="on">{est.etiqueta}</span>
          </div>
          <LineaAvanceClub estado={club.estado} avance={club} />
        </section>
        <AvisoEstadoClub estado={club.estado} avance={club} onVence={() => void cargar()} />
        {d.logistica && (
          <LogisticaLider clubId={club.id} folio={club.folio} logistica={d.logistica}
            onCambio={(logistica) => setD((x) => (x ? { ...x, logistica } : x))}
            onAviso={(ok, texto) => { setAviso({ tipo: ok ? 'success' : 'error', texto }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
        )}
        <ClubResumen club={club} integrantes={d.integrantes} documentos={d.documentos} campos={config.campos} camposIntegrante={pi}
          kit={config.kit_nombre} onDescargar={descargarDoc} descargando={ocupado?.startsWith('dl-') ? ocupado.slice(3) : null} />
        <HistorialClub entradas={d.historial} />
      </div>
    );
  }

  // ─────────── Edición (captura o corrección dentro del plazo) ───────────
  return (
    <div className="space-y-6 pb-8">
      {header}
      {aviso && <AlertBox type={aviso.tipo} message={aviso.texto} onClose={() => setAviso(null)} />}

      <section className="app-card space-y-3 p-5" aria-label="Avance">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-[var(--app-ink-2)]">Folio <span className="font-mono font-semibold text-[var(--app-ink)]">{club.folio}</span></p>
          <span className="pill" data-tone={est.tono} data-dot="on">{est.etiqueta}</span>
        </div>
        <LineaAvanceClub estado={club.estado} avance={club} />
        {!subsanando && d.convocatoria.fecha_limite && (
          <p className="text-center text-sm text-[var(--app-ink-2)]">
            {d.convocatoria.acepta ? `Tienes hasta el ${formatDate(d.convocatoria.fecha_limite)} para enviarlo.` : 'La convocatoria ya no recibe registros.'}
          </p>
        )}
      </section>
      {subsanando && <AvisoEstadoClub estado={club.estado} avance={club} onVence={() => void cargar()} />}

      {/* ── Datos del club ── */}
      <section className="app-card space-y-5 p-5" aria-labelledby="sec-datos">
        <h2 id="sec-datos" className="flex items-center gap-2 text-base font-bold text-[var(--app-ink)]"><Shapes className="h-5 w-5" style={{ color: 'var(--auth-vino)' }} aria-hidden="true" />Datos del club</h2>
        {pc.logo?.pedir && (
          <div className="flex flex-wrap items-center gap-4">
            <FotoClub src={club.logo_url} alt="Logo del club" className="h-20 w-20 rounded-[20px]" fallback={<Shapes className="h-8 w-8 text-[var(--app-ink-2)]" aria-hidden="true" />} />
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-[var(--app-ink)]">Logo o foto del club{pc.logo.obligatorio ? ' *' : ' (opcional)'}</p>
              <p className="text-xs text-[var(--app-ink-2)]">JPG, PNG o WebP de hasta {IMAGEN_MAX_MB} MB. Se recorta en cuadrado.</p>
              <div className="flex flex-wrap gap-2">
                <BotonArchivo accept={ACCEPT_IMAGEN} etiqueta={club.logo_url ? 'Cambiar logo' : 'Subir logo'} disabled={ocupado === 'logo'}
                  onArchivo={(f) => { if (validarImagen(f)) void accion('logo', () => subirArchivo(`/club/clubes/${club.id}/logo`, 'imagen', f), 'Logo actualizado.'); }}>
                  {ocupado === 'logo' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
                  {club.logo_url ? 'Cambiar' : 'Subir logo'}
                </BotonArchivo>
                {club.logo_url && (
                  <Button size="sm" variant="destructive" disabled={ocupado === 'logo'} onClick={() => void accion('logo', () => api.delete(`/club/clubes/${club.id}/logo`), 'Logo quitado.')} aria-label="Quitar logo">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="club-nombre" className={labelCls}>Nombre del club *</label>
            <input id="club-nombre" className={inputCls} maxLength={255} value={nombre} onChange={(e) => setNombre(e.target.value)} aria-invalid={erroresClub.nombre ? 'true' : undefined} />
            {erroresClub.nombre && <p className="text-xs font-medium" style={{ color: 'var(--auth-danger)' }}>{erroresClub.nombre}</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="club-escuela" className={labelCls}>Escuela *</label>
            <EscuelaPicker id="club-escuela" value={escuela} onChange={setEscuela} invalido={Boolean(erroresClub.escuela_id)} />
            {erroresClub.escuela_id && <p className="text-xs font-medium" style={{ color: 'var(--auth-danger)' }}>{erroresClub.escuela_id}</p>}
          </div>
          {pc.descripcion?.pedir && (
            <div className="space-y-1.5">
              <label htmlFor="club-desc" className={labelCls}>Descripción del proyecto del club{pc.descripcion.obligatorio ? ' *' : ' (opcional)'}</label>
              <textarea id="club-desc" className={`${inputCls} !h-auto min-h-[110px] resize-y py-3`} maxLength={2000} value={datosClub.descripcion ?? ''}
                placeholder="Qué hace el club, qué quieren lograr con el kit…" onChange={(e) => setDatosClub({ ...datosClub, descripcion: e.target.value })} />
            </div>
          )}
          {camposClub.map((c) => (
            <CampoDinamico key={c.nombre_campo} campo={c} idBase="club" valor={datosClub[c.nombre_campo]} error={erroresClub[`datos.${c.nombre_campo}`]}
              onChange={(v) => setDatosClub({ ...datosClub, [c.nombre_campo]: v })} />
          ))}
        </div>
        <div className="flex justify-end">
          <Button onClick={guardarDatos} disabled={ocupado === 'datos'}>
            {ocupado === 'datos' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />} Guardar datos
          </Button>
        </div>
      </section>

      {/* ── Integrantes ── */}
      <section className="space-y-4" aria-labelledby="sec-int">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="sec-int" className="flex items-center gap-2 text-base font-bold text-[var(--app-ink)]"><User className="h-5 w-5" style={{ color: 'var(--auth-vino)' }} aria-hidden="true" />Integrantes</h2>
            <p className="text-sm text-[var(--app-ink-2)]">
              {d.integrantes.length} de {config.max_integrantes} · se necesitan al menos {config.min_integrantes} (tú cuentas como integrante)
              {!config.participan_menores ? ' · no participan menores de edad' : ''}
            </p>
          </div>
          <Button onClick={() => abrirIntegrante(null)} disabled={lleno}>
            <Plus className="h-4 w-4" aria-hidden="true" /> {lleno ? 'Club completo' : 'Agregar integrante'}
          </Button>
        </div>
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {d.integrantes.map((i) => {
            const faltaFoto = pi.foto?.obligatorio && !i.foto_url;
            return (
              <li key={i.id} className="app-card flex gap-3 p-4">
                <div className="flex shrink-0 flex-col items-center gap-1.5">
                  <FotoClub src={i.foto_url} alt={`Foto de ${i.nombre}`} className="h-16 w-16 rounded-full" fallback={<User className="h-6 w-6 text-[var(--app-ink-2)]" aria-hidden="true" />} />
                  {pi.foto?.pedir && (
                    <BotonArchivo accept={ACCEPT_IMAGEN} variant="soft" etiqueta={`${i.foto_url ? 'Cambiar' : 'Subir'} foto de ${i.nombre}`} disabled={ocupado === `foto-${i.id}`}
                      onArchivo={(f) => { if (validarImagen(f)) void accion(`foto-${i.id}`, () => subirArchivo(`/club/clubes/${club.id}/integrantes/${i.id}/foto`, 'imagen', f), 'Foto actualizada.'); }}>
                      {ocupado === `foto-${i.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Camera className="h-3.5 w-3.5" aria-hidden="true" />}
                      <span className="text-xs">{i.foto_url ? 'Cambiar' : 'Foto'}</span>
                    </BotonArchivo>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-[var(--app-ink)]">
                    <span className="break-words">{i.nombre}</span>
                    {i.es_lider && <span className="pill" data-tone="gold"><Crown className="h-3 w-3" aria-hidden="true" />Líder</span>}
                    {i.menor_de_edad && <span className="pill" data-tone="sky">Menor</span>}
                  </p>
                  <p className="break-words text-xs text-[var(--app-ink-2)]">
                    {[
                      pi.fecha_nacimiento?.pedir && i.fecha_nacimiento ? formatDate(i.fecha_nacimiento) : null,
                      pi.sexo?.pedir && i.sexo ? SEXO[i.sexo] : null,
                      pi.grado_grupo?.pedir && i.grado_grupo ? i.grado_grupo : null,
                      ...camposInt.map((c) => (i.datos?.[c.nombre_campo] ? `${c.etiqueta}: ${valorCampo(c, i.datos[c.nombre_campo])}` : null)),
                    ].filter(Boolean).join(' · ') || 'Sin datos adicionales'}
                  </p>
                  {faltaFoto && <p className="text-xs font-medium" style={{ color: 'var(--tile-gold-fg)' }}>Falta su foto.</p>}
                  <div className="flex gap-1.5 pt-1">
                    <Button size="sm" variant="soft" onClick={() => abrirIntegrante(i)} aria-label={`Editar a ${i.nombre}`}><Pencil className="h-4 w-4" aria-hidden="true" /><span className="max-sm:sr-only">Editar</span></Button>
                    {!i.es_lider && (
                      <Button size="sm" variant="destructive" onClick={() => setQuitar(i)} aria-label={`Quitar a ${i.nombre}`}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Documentos ── */}
      <section className="space-y-4" aria-labelledby="sec-docs">
        <h2 id="sec-docs" className="flex items-center gap-2 text-base font-bold text-[var(--app-ink)]"><FileDown className="h-5 w-5" style={{ color: 'var(--auth-vino)' }} aria-hidden="true" />Documentos</h2>
        <ul className="divide-y rounded-[16px] border bg-[var(--app-card-bg)]" style={{ borderColor: 'var(--app-rule)' }}>
          {d.documentos.map((doc) => {
            const formatos = Array.isArray(doc.formatos) && doc.formatos.length ? doc.formatos : ['pdf'];
            const accept = formatos.map((f) => ACCEPT_FORMATO[f] ?? '').filter(Boolean).join(',');
            const esCarta = doc.clave === CARTA_ESCUELA;
            const clave = `doc-${doc.clave}`;
            return (
              <li key={doc.clave} className="space-y-2 px-4 py-4">
                <div className="flex items-start gap-3">
                  {doc.subido
                    ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--tile-emerald-fg)' }} aria-label="Subido" />
                    : <CircleDashed className="mt-0.5 h-5 w-5 shrink-0 text-[var(--app-ink-2)]" aria-label="Sin subir" />}
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold text-[var(--app-ink)]">{doc.nombre}{doc.obligatorio ? ' *' : ' (opcional)'}</p>
                    {doc.descripcion && <p className="break-words text-xs text-[var(--app-ink-2)]">{doc.descripcion}</p>}
                    <p className="text-xs text-[var(--app-ink-2)]">
                      {formatos.map((f) => ETIQUETA_FORMATO[f] ?? f).join(' o ')}, hasta {doc.max_mb ?? 5} MB
                      {doc.subido ? ` · Subido: ${doc.subido.nombre_original}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pl-8">
                  {esCarta && (
                    <Button size="sm" variant="soft" disabled={ocupado === 'carta'} onClick={async () => {
                      setOcupado('carta');
                      try { await descargarCartaEscuela(club.id, club.folio); } catch { setAviso({ tipo: 'error', texto: 'No se pudo generar la carta.' }); } finally { setOcupado(null); }
                    }}>
                      {ocupado === 'carta' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileDown className="h-4 w-4" aria-hidden="true" />} Descargar formato
                    </Button>
                  )}
                  <BotonArchivo accept={accept} etiqueta={`${doc.subido ? 'Reemplazar' : 'Subir'} ${doc.nombre}`} disabled={ocupado === clave} variant={doc.subido ? 'outline' : 'default'}
                    onArchivo={(f) => {
                      if (f.size > (doc.max_mb ?? 5) * 1024 * 1024) { setAviso({ tipo: 'error', texto: `«${doc.nombre}» no puede pesar más de ${doc.max_mb ?? 5} MB.` }); return; }
                      void accion(clave, () => subirArchivo(`/club/clubes/${club.id}/documentos`, 'archivo', f, { clave: doc.clave }), `«${doc.nombre}» subido.`);
                    }}>
                    {ocupado === clave ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
                    {doc.subido ? 'Reemplazar' : 'Subir'}
                  </BotonArchivo>
                  {doc.subido && (
                    <>
                      <Button size="sm" variant="outline" disabled={ocupado === `dl-${doc.clave}`} onClick={() => void descargarDoc(doc.clave, doc.subido?.nombre_original ?? doc.clave)} aria-label={`Ver ${doc.nombre}`}>
                        <FileDown className="h-4 w-4" aria-hidden="true" /><span className="max-sm:sr-only">Ver</span>
                      </Button>
                      <Button size="sm" variant="destructive" disabled={ocupado === clave} aria-label={`Quitar ${doc.nombre}`}
                        onClick={() => void accion(clave, () => api.delete(`/club/clubes/${club.id}/documentos/${encodeURIComponent(doc.clave)}`), `«${doc.nombre}» quitado.`)}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </>
                  )}
                </div>
                {esCarta && !doc.subido && (
                  <p className="pl-8 text-xs text-[var(--app-ink-2)]">Descarga el formato con los datos de tu club, pide que la escuela lo firme y selle, y súbelo escaneado o en foto.</p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Envío ── */}
      <section className="app-card space-y-4 p-5" aria-labelledby="sec-envio">
        <h2 id="sec-envio" className="flex items-center gap-2 text-base font-bold text-[var(--app-ink)]"><ListChecks className="h-5 w-5" style={{ color: 'var(--auth-vino)' }} aria-hidden="true" />{subsanando ? 'Enviar correcciones' : 'Enviar a revisión'}</h2>
        {(faltantesEnvio.length ? faltantesEnvio : d.faltantes).length > 0 ? (
          <div className="rounded-[14px] border px-4 py-3" style={{ borderColor: 'var(--tile-gold-fg)', backgroundColor: 'var(--tile-gold-bg)' }}>
            <p className="flex items-center gap-2 text-sm font-bold text-[var(--app-ink)]"><AlertTriangle className="h-4 w-4" aria-hidden="true" />Antes de enviar, falta:</p>
            <ul className="mt-2 list-disc space-y-0.5 pl-6 text-sm text-[var(--app-ink)]">
              {(faltantesEnvio.length ? faltantesEnvio : d.faltantes).map((f) => <li key={f}>{f}</li>)}
            </ul>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm text-[var(--app-ink)]"><CheckCircle2 className="h-4 w-4" style={{ color: 'var(--tile-emerald-fg)' }} aria-hidden="true" />
            {subsanando ? 'Tu club está completo. Revisa tus correcciones: al enviarlas ya no podrás cambiarlas.' : 'Tu club está completo. Revisa que todo esté correcto: después de enviarlo ya no podrás cambiarlo.'}</p>
        )}
        {/* E52 · F2 (decisión del usuario): aviso de privacidad obligatorio en el primer envío; queda registrado con fecha. */}
        {!subsanando && (
          <label className="flex cursor-pointer items-start gap-3 rounded-[14px] border px-4 py-3" style={{ borderColor: 'var(--app-rule)', backgroundColor: aceptoPrivacidad ? 'var(--tile-sky-bg)' : 'var(--auth-field)' }}>
            <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--auth-vino)]" checked={aceptoPrivacidad} onChange={(e) => setAceptoPrivacidad(e.target.checked)} />
            <span className="text-sm text-[var(--app-ink)]">
              Leí el <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="font-semibold underline">aviso de privacidad</a> y confirmo que tengo el
              consentimiento de la escuela y de madres, padres o tutores para registrar los datos y las fotos de los integrantes (incluidos menores de edad).
            </span>
          </label>
        )}
        <div className="flex justify-end">
          <Button onClick={() => setConfirmarEnvio(true)}
            disabled={d.faltantes.length > 0 || (!subsanando && (!d.convocatoria.acepta || !aceptoPrivacidad)) || ocupado === 'enviar'}>
            {ocupado === 'enviar' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />} {subsanando ? 'Enviar correcciones' : 'Enviar a revisión'}
          </Button>
        </div>
      </section>

      <HistorialClub entradas={d.historial} />

      <ConfirmDialog open={confirmarEnvio} title={subsanando ? 'Enviar mis correcciones' : 'Enviar mi club a revisión'}
        description={subsanando
          ? 'Tu club regresará a revisión con tus cambios. Mientras se revisa no podrás editarlo.'
          : 'Después de enviarlo ya no podrás editar los datos, integrantes ni documentos. Si el COMECYT encuentra algo por corregir, te avisará.'}
        confirmLabel="Enviar" onConfirm={() => void enviar()} onCancel={() => setConfirmarEnvio(false)} />
      <ConfirmDialog open={quitar !== null} title="Quitar integrante" description={`Se quitará a «${quitar?.nombre ?? ''}» del club, con su foto.`}
        confirmLabel="Quitar" variant="destructive" onCancel={() => setQuitar(null)}
        onConfirm={() => { const x = quitar; setQuitar(null); if (x) void accion(`q-${x.id}`, () => api.delete(`/club/clubes/${club.id}/integrantes/${x.id}`), 'Integrante quitado.'); }} />

      <StepFrame
        open={dialogo !== null}
        size="md"
        title={dialogo?.id ? 'Editar integrante' : 'Nuevo integrante'}
        icon={<User className="h-5 w-5" />}
        intro={dialogo?.lider ? <>Tus datos como <strong>líder</strong> del club.</> : <>Los campos con * son obligatorios para enviar el club; puedes guardar y completarlos después.</>}
        onClose={() => setDialogo(null)}
        onSubmit={guardarIntegrante}
        submitting={ocupado === 'integrante'}
        submitLabel={dialogo?.id ? 'Guardar cambios' : 'Agregar'}
        error={errDialogo}
        steps={dialogo ? [{
          key: 'datos',
          label: 'Datos',
          question: '¿Quién es?',
          validate: () => (dialogo.form.nombre.trim().length < 3 ? 'Escribe el nombre completo.' : null),
          content: (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Campo id="int-nombre" etiqueta="Nombre completo *" error={erroresInt.nombre} className="sm:col-span-2">
                <input id="int-nombre" className={inputCls} maxLength={255} value={dialogo.form.nombre}
                  onChange={(e) => setDialogo({ ...dialogo, form: { ...dialogo.form, nombre: e.target.value } })} />
              </Campo>
              {pi.fecha_nacimiento?.pedir && (
                <Campo id="int-fn" etiqueta={`Fecha de nacimiento${pi.fecha_nacimiento.obligatorio ? ' *' : ''}`} error={erroresInt.fecha_nacimiento}>
                  <input id="int-fn" type="date" className={inputCls} value={dialogo.form.fecha_nacimiento} max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setDialogo({ ...dialogo, form: { ...dialogo.form, fecha_nacimiento: e.target.value } })} />
                </Campo>
              )}
              {pi.sexo?.pedir && (
                <Campo id="int-sexo" etiqueta={`Sexo${pi.sexo.obligatorio ? ' *' : ''}`} error={erroresInt.sexo}>
                  <select id="int-sexo" className={inputCls} value={dialogo.form.sexo} onChange={(e) => setDialogo({ ...dialogo, form: { ...dialogo.form, sexo: e.target.value } })}>
                    <option value="">Elige</option>
                    {Object.entries(SEXO).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                  </select>
                </Campo>
              )}
              {pi.curp?.pedir && (
                <Campo id="int-curp" etiqueta={`CURP${pi.curp.obligatorio ? ' *' : ''}`} error={erroresInt.curp}>
                  <input id="int-curp" className={`${inputCls} uppercase`} maxLength={18} value={dialogo.form.curp}
                    onChange={(e) => setDialogo({ ...dialogo, form: { ...dialogo.form, curp: e.target.value.toUpperCase().replace(/\s/g, '') } })} />
                </Campo>
              )}
              {pi.grado_grupo?.pedir && (
                <Campo id="int-gg" etiqueta={`Grado y grupo${pi.grado_grupo.obligatorio ? ' *' : ''}`} error={erroresInt.grado_grupo}>
                  <input id="int-gg" className={inputCls} maxLength={30} value={dialogo.form.grado_grupo} placeholder="Ej. 2° B"
                    onChange={(e) => setDialogo({ ...dialogo, form: { ...dialogo.form, grado_grupo: e.target.value } })} />
                </Campo>
              )}
              {pi.correo?.pedir && (
                <Campo id="int-correo" etiqueta={`Correo${pi.correo.obligatorio ? ' *' : ''}`} error={erroresInt.correo}>
                  <input id="int-correo" type="email" className={inputCls} maxLength={255} value={dialogo.form.correo}
                    onChange={(e) => setDialogo({ ...dialogo, form: { ...dialogo.form, correo: e.target.value.trim() } })} />
                </Campo>
              )}
              {pi.telefono?.pedir && (
                <Campo id="int-tel" etiqueta={`Teléfono${pi.telefono.obligatorio ? ' *' : ''}`} error={erroresInt.telefono}>
                  <input id="int-tel" inputMode="numeric" className={inputCls} maxLength={10} value={dialogo.form.telefono}
                    onChange={(e) => setDialogo({ ...dialogo, form: { ...dialogo.form, telefono: e.target.value.replace(/\D/g, '') } })} />
                </Campo>
              )}
              {camposInt.map((c) => (
                <div key={c.nombre_campo} className={c.tipo_campo === 'textarea' ? 'sm:col-span-2' : ''}>
                  <CampoDinamico campo={c} idBase="int" valor={dialogo.form.datos[c.nombre_campo]} error={erroresInt[`datos.${c.nombre_campo}`]}
                    onChange={(v) => setDialogo({ ...dialogo, form: { ...dialogo.form, datos: { ...dialogo.form.datos, [c.nombre_campo]: v } } })} />
                </div>
              ))}
              {pi.foto?.pedir && !dialogo.id && (
                <p className="text-xs text-[var(--app-ink-2)] sm:col-span-2">La foto se sube después, desde la tarjeta del integrante.</p>
              )}
            </div>
          ),
        }] : []}
      />
    </div>
  );
}

function Campo({ id, etiqueta, error, children, className = '' }: { id: string; etiqueta: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className={labelCls}>{etiqueta}</label>
      {children}
      {error && <p className="text-xs font-medium" style={{ color: 'var(--auth-danger)' }}>{error}</p>}
    </div>
  );
}
