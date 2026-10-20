'use client';

import { useRef, useState } from 'react';
import { ArrowLeftRight, Loader2, FileDown, Upload, Eye, Camera, History, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import StepFrame from '@/components/ui/step-frame';
import CampoDinamico from '@/components/especie/CampoDinamico';
import { useVistaPrevia } from '@/components/ui/VistaPreviaProvider';
import { archivoCambio, descargarPermisoNuevo } from '@/lib/especie-api';
import { ACCEPT_FORMATO, ACCEPT_IMAGEN, ESTADO_CAMBIO, IMAGEN_MAX_MB, SEXO, type CambiosClub, type CampoApi, type IntegranteApi, type Predef } from '@/lib/especie';
import { PATRON_CURP, PATRON_TELEFONO, PATRON_CORREO, fechaDeCurp } from '@/lib/registro';
import { nombrePropio, problemaNombre, revisarIdentidad } from '@/lib/curp';
import { textoLegible } from '@/lib/errores-formulario';
import { formatDate } from '@/lib/format';

const labelCls = 'text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]';
const inputCls = 'auth-input auth-input-static pl-4';
const COLUMNAS = ['fecha_nacimiento', 'sexo', 'curp', 'grado_grupo', 'grado', 'grupo', 'domicilio', 'tutor_nombre', 'correo', 'telefono'] as const;
type Columna = (typeof COLUMNAS)[number];
type Form = Record<'nombre' | 'nombres' | 'primer_apellido' | 'segundo_apellido' | Columna, string> & { curp_revision: boolean; datos: Record<string, string> };
const VACIO: Form = { nombre: '', nombres: '', primer_apellido: '', segundo_apellido: '', fecha_nacimiento: '', sexo: '', curp: '', grado_grupo: '', grado: '', grupo: '', domicilio: '', tutor_nombre: '', correo: '', telefono: '', curp_revision: false, datos: {} };
const ETIQUETA: Record<string, string> = { nombre: 'Nombre', fecha_nacimiento: 'Nacimiento', grado: 'Grado', grupo: 'Grupo', grado_grupo: 'Grado y grupo', tutor_nombre: 'Tutor(a)', domicilio: 'Domicilio', correo: 'Correo', telefono: 'Teléfono', curp: 'CURP' };
const PASO_DE: Record<string, string> = { integrante_sale_id: 'sale', justificacion: 'sale', club: 'sale', foto: 'documentos', permiso: 'documentos' };

function errorDe(e: unknown): { mensaje: string; campos: Record<string, string> } {
  const d = (e as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } } })?.response;
  const campos: Record<string, string> = {};
  for (const [k, v] of Object.entries(d?.data?.errors ?? {})) campos[k] = textoLegible(Array.isArray(v) ? String(v[0]) : String(v));
  const mensaje = d?.status === 429 ? 'Demasiadas solicitudes seguidas. Espera un momento.' : Object.values(campos)[0] || d?.data?.message || 'No se pudo enviar la solicitud. Inténtalo de nuevo.';
  return { mensaje, campos };
}

/**
 * E92 (20/10/2026, pedido del usuario) — Cambio de integrante de un club ya enviado: el líder pide cambiar a un integrante
 * (no a los líderes A y B) con justificación, los datos del nuevo integrante y sus documentos; el COMECYT lo aprueba o
 * rechaza. Muestra el historial: solicitudes y bajas.
 */
export default function CambiosIntegrante({ clubId, folio, integrantes, cambios, pi, camposInt, permisoImagen, puedeOperar, onCambio, onAviso }: {
  clubId: number; folio: string; integrantes: IntegranteApi[]; cambios: CambiosClub; pi: Record<string, Predef>; camposInt: CampoApi[];
  /** Si la convocatoria pide el permiso de uso de imagen (y si es obligatorio). */
  permisoImagen: { obligatorio: boolean } | null;
  puedeOperar: boolean;
  onCambio: () => void;
  onAviso: (ok: boolean, texto: string) => void;
}) {
  const { ver, confirmarSubida } = useVistaPrevia();
  const [abierto, setAbierto] = useState(false);
  const [saleId, setSaleId] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [f, setF] = useState<Form>(VACIO);
  const [foto, setFoto] = useState<File | null>(null);
  const [permiso, setPermiso] = useState<File | null>(null);
  const [error, setError] = useState<{ mensaje: string; paso: string } | null>(null);
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [cancelar, setCancelar] = useState<number | null>(null);
  const refFoto = useRef<HTMLInputElement>(null);
  const refPermiso = useRef<HTMLInputElement>(null);

  const conCurp = !!pi.curp?.pedir;
  const elegibles = integrantes.filter((i) => !i.es_lider && !i.es_lider_b);
  const pendiente = cambios.solicitudes.find((s) => s.estado === 'pendiente') ?? null;
  const resueltas = cambios.solicitudes.filter((s) => s.estado !== 'pendiente');
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }));

  const cuerpo = (): Record<string, unknown> => {
    const c: Record<string, unknown> = conCurp
      ? { nombres: nombrePropio(f.nombres, true), primer_apellido: nombrePropio(f.primer_apellido), segundo_apellido: nombrePropio(f.segundo_apellido) || null, curp_revision: f.curp_revision }
      : { nombre: nombrePropio(f.nombre, true) };
    for (const k of COLUMNAS) if (pi[k]?.pedir) c[k] = f[k].trim() || null;
    c.datos = Object.fromEntries(camposInt.map((x) => [x.nombre_campo, f.datos[x.nombre_campo] ?? '']));
    return c;
  };

  const validarNuevo = (): string | null => {
    const n = conCurp
      ? problemaNombre(f.nombres, 'nombre') ?? problemaNombre(f.primer_apellido, 'primer apellido') ?? problemaNombre(f.segundo_apellido, 'segundo apellido', false)
      : problemaNombre(f.nombre, 'nombre completo');
    if (n) return n;
    for (const k of COLUMNAS) {
      if (k === 'tutor_nombre') continue;
      if (pi[k]?.obligatorio && !f[k].trim()) return `Falta «${ETIQUETA[k] ?? k}».`;
    }
    if (conCurp && f.curp && !PATRON_CURP.test(f.curp)) return 'La CURP no tiene un formato válido.';
    if (conCurp && f.curp.length === 18 && f.fecha_nacimiento) {
      const r = revisarIdentidad({ ...f, sin_segundo: !f.segundo_apellido.trim() });
      if (!r.coincide && r.problemas.length && (!r.revisable || !f.curp_revision)) return r.revisable ? 'La CURP no coincide con el nombre o la fecha. Corrige los datos o confirma que es correcta.' : r.problemas[0];
    }
    if (f.telefono && !PATRON_TELEFONO.test(f.telefono)) return 'El teléfono debe tener 10 dígitos.';
    if (f.correo && !PATRON_CORREO.test(f.correo)) return 'Revisa el correo.';
    return null;
  };

  const abrir = () => { setSaleId(''); setJustificacion(''); setF(VACIO); setFoto(null); setPermiso(null); setError(null); setCampos({}); setAbierto(true); };

  const enviar = async () => {
    setError(null);
    if (pi.foto?.obligatorio && !foto) { setError({ mensaje: 'Sube la foto del nuevo integrante.', paso: 'documentos' }); return; }
    if (permisoImagen?.obligatorio && !permiso) { setError({ mensaje: 'Sube el permiso de uso de imagen firmado (PDF).', paso: 'documentos' }); return; }
    const fd = new FormData();
    fd.append('integrante_sale_id', saleId);
    fd.append('justificacion', justificacion.trim());
    for (const [k, v] of Object.entries(cuerpo())) {
      if (k === 'datos') { for (const [dk, dv] of Object.entries(v as Record<string, string>)) fd.append(`datos[${dk}]`, dv); continue; }
      if (v === null || v === undefined) continue;
      fd.append(k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v));
    }
    if (foto) fd.append('foto', foto);
    if (permiso) fd.append('permiso', permiso);
    setEnviando(true);
    try {
      // E32: sin Content-Type propio, el navegador arma el multipart con su boundary.
      await api.post(`/club/clubes/${clubId}/cambios-integrante`, fd, { headers: { 'Content-Type': undefined } });
      setAbierto(false);
      onAviso(true, 'Solicitud de cambio enviada. Te avisaremos cuando el COMECYT la revise.');
      onCambio();
    } catch (e) {
      const r = errorDe(e);
      setCampos(r.campos);
      const primero = Object.keys(r.campos)[0] ?? '';
      setError({ mensaje: r.mensaje, paso: PASO_DE[primero.split('.')[0]] ?? 'nuevo' });
    } finally {
      setEnviando(false);
    }
  };

  const elegirArchivo = (file: File | undefined, tipo: 'foto' | 'permiso') => {
    if (!file) return;
    if (tipo === 'foto' && (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > IMAGEN_MAX_MB * 1024 * 1024)) { setError({ mensaje: `La foto debe ser JPG, PNG o WebP de hasta ${IMAGEN_MAX_MB} MB.`, paso: 'documentos' }); return; }
    if (tipo === 'permiso' && (file.type !== 'application/pdf' || file.size > 10 * 1024 * 1024)) { setError({ mensaje: 'El permiso debe ser un PDF de hasta 10 MB.', paso: 'documentos' }); return; }
    void confirmarSubida(file, { etiqueta: tipo === 'foto' ? 'Usar esta foto' : 'Adjuntar este permiso' }).then((r) => {
      if (r === 'subir') { if (tipo === 'foto') setFoto(file); else setPermiso(file); setError(null); }
      else if (r === 'otro') (tipo === 'foto' ? refFoto : refPermiso).current?.click();
    });
  };

  const campo = (k: Columna, etiqueta: string, input: React.ReactNode, ancho = false) => (
    <div className={`space-y-1.5 ${ancho ? 'sm:col-span-2' : ''}`}>
      <label htmlFor={`ci-${k}`} className={labelCls}>{etiqueta}{pi[k]?.obligatorio && k !== 'tutor_nombre' ? ' *' : ''}</label>
      {input}
      {campos[k] && <p className="text-xs font-medium" style={{ color: 'var(--auth-danger)' }}>{campos[k]}</p>}
    </div>
  );

  return (
    <section className="app-card space-y-4 p-5" aria-labelledby="sec-cambios">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="sec-cambios" className="flex items-center gap-2 text-base font-bold text-[var(--app-ink)]"><ArrowLeftRight className="h-5 w-5" style={{ color: 'var(--auth-vino)' }} aria-hidden="true" />Cambio de integrante</h2>
          <p className="text-sm text-[var(--app-ink-2)]">
            {cambios.ventana.abierta
              ? <>Puedes pedir cambiar a un integrante hasta el <strong>{cambios.ventana.hasta ? formatDate(cambios.ventana.hasta) : '—'}</strong>, con la justificación y los documentos del nuevo integrante. Los líderes A y B se cambian en «Acompañantes del club».</>
              : cambios.ventana.motivo}
          </p>
        </div>
        {cambios.ventana.abierta && puedeOperar && !pendiente && elegibles.length > 0 && (
          <Button onClick={abrir}><ArrowLeftRight className="h-4 w-4" aria-hidden="true" /> Solicitar cambio</Button>
        )}
      </div>

      {pendiente && (
        <div className="space-y-2 rounded-[16px] border p-4" style={{ borderColor: 'var(--tile-gold-fg)', backgroundColor: 'var(--tile-gold-bg)' }}>
          <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-[var(--app-ink)]">
            <span className="pill" data-tone="gold" data-dot="on">{ESTADO_CAMBIO.pendiente.etiqueta}</span>
            Sale {pendiente.sale} · entra {pendiente.entra.nombre ?? '—'}
          </p>
          <p className="whitespace-pre-wrap break-words text-sm text-[var(--app-ink)]">{pendiente.justificacion}</p>
          <div className="flex flex-wrap gap-2">
            {pendiente.tiene_permiso && <Button size="sm" variant="outline" onClick={() => void ver({ nombre: 'Permiso del nuevo integrante.pdf', cargar: () => archivoCambio(clubId, pendiente.id, 'permiso') })}><Eye className="h-4 w-4" aria-hidden="true" />Ver permiso</Button>}
            {pendiente.tiene_foto && <Button size="sm" variant="outline" onClick={() => void ver({ nombre: 'Foto del nuevo integrante.webp', cargar: () => archivoCambio(clubId, pendiente.id, 'foto') })}><Camera className="h-4 w-4" aria-hidden="true" />Ver foto</Button>}
            {puedeOperar && <Button size="sm" variant="destructive" onClick={() => setCancelar(pendiente.id)}><XCircle className="h-4 w-4" aria-hidden="true" />Cancelar solicitud</Button>}
          </div>
        </div>
      )}

      {(resueltas.length > 0 || cambios.bajas.length > 0) && (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--app-ink)]"><History className="h-4 w-4" aria-hidden="true" />Historial de integrantes</p>
          <ul className="libreta divide-y rounded-[14px] border" style={{ borderColor: 'var(--app-rule)' }}>
            {resueltas.map((s) => (
              <li key={`s-${s.id}`} className="space-y-1 px-4 py-3 text-sm">
                <p className="flex flex-wrap items-center gap-2 text-[var(--app-ink)]">
                  <span className="pill" data-tone={ESTADO_CAMBIO[s.estado].tono}>{ESTADO_CAMBIO[s.estado].etiqueta}</span>
                  <span className="break-words">Sale <strong>{s.sale}</strong> · entra <strong>{s.entra.nombre ?? '—'}</strong></span>
                  <span className="text-xs text-[var(--app-ink-2)]">{s.resuelto_at ? formatDate(s.resuelto_at) : s.fecha ? formatDate(s.fecha) : ''}</span>
                </p>
                <p className="break-words text-xs text-[var(--app-ink-2)]">Justificación: {s.justificacion}</p>
                {s.estado === 'rechazada' && s.motivo && <p className="text-xs font-medium" style={{ color: 'var(--auth-danger)' }}>Motivo: {s.motivo}</p>}
              </li>
            ))}
            {cambios.bajas.filter((b) => !resueltas.some((s) => s.estado === 'aprobada' && s.sale === b.nombre)).map((b) => (
              <li key={`b-${b.id}`} className="px-4 py-3 text-sm text-[var(--app-ink)]">Baja: <strong>{b.nombre}</strong>{b.baja_at ? ` · ${formatDate(b.baja_at)}` : ''}</li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmDialog open={cancelar !== null} title="Cancelar la solicitud de cambio" description="La solicitud se cancela y sus archivos se borran. Podrás pedir otra mientras siga abierto el plazo."
        confirmLabel="Cancelar solicitud" variant="destructive" onCancel={() => setCancelar(null)}
        onConfirm={async () => {
          const id = cancelar; setCancelar(null);
          try { await api.delete(`/club/clubes/${clubId}/cambios-integrante/${id}`); onAviso(true, 'Solicitud cancelada.'); onCambio(); }
          catch (e) { onAviso(false, errorDe(e).mensaje); }
        }} />

      <StepFrame
        open={abierto}
        title="Solicitar cambio de integrante"
        icon={<ArrowLeftRight className="h-5 w-5" />}
        intro={<>Quien sale queda en el <strong>historial</strong> del club. El COMECYT revisa la justificación y los documentos y te avisa si se aprueba.</>}
        onClose={() => setAbierto(false)}
        onSubmit={enviar}
        submitting={enviando}
        submitLabel="Enviar solicitud"
        error={error?.mensaje ?? null}
        errorStep={error?.paso ?? null}
        steps={[
          {
            key: 'sale', label: 'Quién sale', question: '¿A quién cambias y por qué?',
            validate: () => (!saleId ? 'Elige al integrante que sale.' : justificacion.trim().length < 20 ? 'Explica el motivo del cambio con al menos 20 caracteres.' : null),
            content: (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="ci-sale" className={labelCls}>Integrante que sale *</label>
                  <select id="ci-sale" className={inputCls} value={saleId} onChange={(e) => setSaleId(e.target.value)}>
                    <option value="">Elige</option>
                    {elegibles.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="ci-just" className={labelCls}>Justificación *</label>
                  <textarea id="ci-just" className={`${inputCls} !h-auto min-h-[110px] resize-y py-3`} maxLength={2000} value={justificacion}
                    placeholder="Ej. Se cambió de escuela a mitad del ciclo y ya no puede asistir." onChange={(e) => setJustificacion(e.target.value)} />
                  <p className="text-right text-xs text-[var(--app-ink-2)]">{justificacion.trim().length} / 2000</p>
                </div>
              </div>
            ),
          },
          {
            key: 'nuevo', label: 'Nuevo integrante', question: '¿Quién entra?', validate: validarNuevo,
            content: (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {conCurp ? (<>
                  <div className="space-y-1.5 sm:col-span-2"><label htmlFor="ci-nombres" className={labelCls}>Nombre(s) *</label>
                    <input id="ci-nombres" className={inputCls} maxLength={60} value={f.nombres} onChange={(e) => set({ nombres: e.target.value, curp_revision: false })} onBlur={() => set({ nombres: nombrePropio(f.nombres, true) })} /></div>
                  <div className="space-y-1.5"><label htmlFor="ci-ap1" className={labelCls}>Primer apellido *</label>
                    <input id="ci-ap1" className={inputCls} maxLength={60} value={f.primer_apellido} onChange={(e) => set({ primer_apellido: e.target.value, curp_revision: false })} onBlur={() => set({ primer_apellido: nombrePropio(f.primer_apellido) })} /></div>
                  <div className="space-y-1.5"><label htmlFor="ci-ap2" className={labelCls}>Segundo apellido</label>
                    <input id="ci-ap2" className={inputCls} maxLength={60} value={f.segundo_apellido} onChange={(e) => set({ segundo_apellido: e.target.value, curp_revision: false })} onBlur={() => set({ segundo_apellido: nombrePropio(f.segundo_apellido) })} /></div>
                </>) : (
                  <div className="space-y-1.5 sm:col-span-2"><label htmlFor="ci-nombre" className={labelCls}>Nombre completo *</label>
                    <input id="ci-nombre" className={inputCls} maxLength={255} value={f.nombre} onChange={(e) => set({ nombre: e.target.value })} onBlur={() => set({ nombre: nombrePropio(f.nombre, true) })} /></div>
                )}
                {pi.curp?.pedir && campo('curp', 'CURP', <input id="ci-curp" className={`${inputCls} uppercase`} maxLength={18} value={f.curp} onChange={(e) => {
                  const curp = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 18);
                  const fn = pi.fecha_nacimiento?.pedir ? fechaDeCurp(curp) : null;
                  const sexo = pi.sexo?.pedir && curp.length === 18 && /[HMX]/.test(curp[10]) ? curp[10] : f.sexo;
                  set({ curp, sexo, curp_revision: false, ...(fn ? { fecha_nacimiento: fn } : {}) });
                }} />)}
                {pi.fecha_nacimiento?.pedir && campo('fecha_nacimiento', 'Fecha de nacimiento', <input id="ci-fecha_nacimiento" type="date" className={inputCls} value={f.fecha_nacimiento} max={new Date().toISOString().slice(0, 10)} onChange={(e) => set({ fecha_nacimiento: e.target.value })} />)}
                {conCurp && f.curp.length === 18 && f.fecha_nacimiento && (() => {
                  const r = revisarIdentidad({ ...f, sin_segundo: !f.segundo_apellido.trim() });
                  if (r.coincide || !r.problemas.length) return <p className="text-xs font-semibold sm:col-span-2" style={{ color: 'var(--tile-emerald-fg)' }}>La CURP coincide con el nombre y la fecha de nacimiento.</p>;
                  return (
                    <div className="space-y-1.5 rounded-[12px] border p-3 text-xs sm:col-span-2" style={{ borderColor: 'var(--auth-danger)' }}>
                      <ul className="list-disc space-y-0.5 pl-5">{r.problemas.map((p) => <li key={p}>{p}</li>)}</ul>
                      {r.revisable && <label className="flex cursor-pointer items-start gap-2"><input type="checkbox" checked={f.curp_revision} className="mt-0.5 h-4 w-4 accent-[var(--auth-vino)]" onChange={(e) => set({ curp_revision: e.target.checked })} /><span><strong>La CURP es correcta.</strong> Mándala a revisión.</span></label>}
                    </div>
                  );
                })()}
                {pi.sexo?.pedir && campo('sexo', 'Sexo', <select id="ci-sexo" className={inputCls} value={f.sexo} onChange={(e) => set({ sexo: e.target.value })}><option value="">Elige</option>{Object.entries(SEXO).map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>)}
                {pi.grado_grupo?.pedir && campo('grado_grupo', 'Grado y grupo', <input id="ci-grado_grupo" className={inputCls} maxLength={30} value={f.grado_grupo} placeholder="Ej. 2° B" onChange={(e) => set({ grado_grupo: e.target.value })} />)}
                {pi.grado?.pedir && campo('grado', 'Grado', <input id="ci-grado" className={inputCls} maxLength={20} value={f.grado} placeholder="Ej. 2°" onChange={(e) => set({ grado: e.target.value })} />)}
                {pi.grupo?.pedir && campo('grupo', 'Grupo', <input id="ci-grupo" className={inputCls} maxLength={20} value={f.grupo} placeholder="Ej. B" onChange={(e) => set({ grupo: e.target.value })} />)}
                {pi.domicilio?.pedir && campo('domicilio', 'Domicilio', <input id="ci-domicilio" className={inputCls} maxLength={300} value={f.domicilio} onChange={(e) => set({ domicilio: e.target.value })} />, true)}
                {pi.tutor_nombre?.pedir && campo('tutor_nombre', 'Madre, padre o tutor (menores de edad)', <input id="ci-tutor_nombre" className={inputCls} maxLength={150} value={f.tutor_nombre} onChange={(e) => set({ tutor_nombre: e.target.value })} onBlur={() => set({ tutor_nombre: nombrePropio(f.tutor_nombre, true) })} />, true)}
                {pi.correo?.pedir && campo('correo', 'Correo', <input id="ci-correo" type="email" className={inputCls} maxLength={255} value={f.correo} onChange={(e) => set({ correo: e.target.value.trim() })} />)}
                {pi.telefono?.pedir && campo('telefono', 'Teléfono', <input id="ci-telefono" inputMode="numeric" className={inputCls} maxLength={10} value={f.telefono} onChange={(e) => set({ telefono: e.target.value.replace(/\D/g, '') })} />)}
                {camposInt.map((c) => (
                  <div key={c.nombre_campo} className={c.tipo_campo === 'textarea' ? 'sm:col-span-2' : ''}>
                    <CampoDinamico campo={c} idBase="ci" valor={f.datos[c.nombre_campo]} error={campos[`datos.${c.nombre_campo}`]}
                      onChange={(v) => set({ datos: { ...f.datos, [c.nombre_campo]: v } })} />
                  </div>
                ))}
              </div>
            ),
          },
          {
            key: 'documentos', label: 'Documentos', question: '¿Cuáles son sus documentos?',
            content: (
              <div className="space-y-4">
                {!pi.foto?.pedir && !permisoImagen && <p className="text-sm text-[var(--app-ink-2)]">Esta convocatoria no pide foto ni permiso de imagen: puedes enviar la solicitud.</p>}
                {pi.foto?.pedir && (
                  <div className="space-y-2 rounded-[14px] border p-4" style={{ borderColor: 'var(--app-rule)' }}>
                    <p className="text-sm font-semibold text-[var(--app-ink)]">Foto{pi.foto.obligatorio ? ' *' : ' (opcional)'}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" size="sm" variant={foto ? 'outline' : 'default'} onClick={() => refFoto.current?.click()}><Camera className="h-4 w-4" aria-hidden="true" />{foto ? 'Cambiar foto' : 'Elegir foto'}</Button>
                      {foto && <span className="break-all text-xs text-[var(--app-ink-2)]">{foto.name}</span>}
                      <input ref={refFoto} type="file" accept={ACCEPT_IMAGEN} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { const x = e.target.files?.[0]; e.target.value = ''; elegirArchivo(x, 'foto'); }} />
                    </div>
                  </div>
                )}
                {permisoImagen && (
                  <div className="space-y-2 rounded-[14px] border p-4" style={{ borderColor: 'var(--app-rule)' }}>
                    <p className="text-sm font-semibold text-[var(--app-ink)]">Permiso de uso de imagen{permisoImagen.obligatorio ? ' *' : ' (opcional)'}</p>
                    <p className="text-xs text-[var(--app-ink-2)]">Descárgalo lleno con los datos que escribiste, recaba las firmas y súbelo escaneado en PDF.</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" size="sm" variant="soft" disabled={descargando} onClick={async () => {
                        setDescargando(true);
                        try { await descargarPermisoNuevo(clubId, cuerpo(), folio); }
                        catch { setError({ mensaje: 'No se pudo generar el permiso: revisa los datos del nuevo integrante.', paso: 'nuevo' }); }
                        finally { setDescargando(false); }
                      }}>
                        {descargando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileDown className="h-4 w-4" aria-hidden="true" />}Descargar permiso lleno
                      </Button>
                      <Button type="button" size="sm" variant={permiso ? 'outline' : 'default'} onClick={() => refPermiso.current?.click()}><Upload className="h-4 w-4" aria-hidden="true" />{permiso ? 'Cambiar archivo' : 'Adjuntar firmado'}</Button>
                      {permiso && <span className="break-all text-xs text-[var(--app-ink-2)]">{permiso.name}</span>}
                      <input ref={refPermiso} type="file" accept={ACCEPT_FORMATO.pdf} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { const x = e.target.files?.[0]; e.target.value = ''; elegirArchivo(x, 'permiso'); }} />
                    </div>
                  </div>
                )}
                <p className="text-xs text-[var(--app-ink-2)]">Al aprobarse, los formatos que listan a los integrantes (carta, A, B y C) se tendrán que descargar, firmar y subir de nuevo.</p>
              </div>
            ),
          },
        ]}
      />
    </section>
  );
}
