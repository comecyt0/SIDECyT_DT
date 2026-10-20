'use client';

import { useCallback, useEffect, useState } from 'react';
import { Shapes, Loader2, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import api from '@/lib/api';
import PageHeader from '@/components/ui/page-header';
import { AlertBox } from '@/components/ui/alert-box';
import ClubResumen from '@/components/especie/ClubResumen';
import TarjetaKit from '@/components/especie/TarjetaKit';
import LineaAvanceClub, { quienesDeHistorial } from '@/components/especie/LineaAvanceClub';
import HistorialClub from '@/components/especie/HistorialClub';
import RevisionClubPanel, { type PermisosRevision } from '@/components/especie/RevisionClubPanel';
import LogisticaPersonal from '@/components/especie/LogisticaPersonal';
import { descargarDocumentoClub } from '@/lib/especie-api';
import { mensajeError } from '@/lib/errores-formulario';
import {
  CARTA_ESCUELA, leerCamposApi, leerResumenKit, type ResumenKit, normalizarPredef, CAMPOS_INTEGRANTE, leerLogistica, type LogisticaEstado,
  type ClubApi, type DocumentoClub, type EntradaHistorial, type IntegranteApi,
} from '@/lib/especie';

export interface DetalleClubPersonal {
  club: ClubApi;
  integrantes: IntegranteApi[];
  documentos: { clave: string; nombre_original: string; subido_at: string | null }[];
  documentos_requeridos?: DocumentoClub[];
  config: { kit_nombre?: string | null; campos?: unknown; campos_integrante?: unknown; documentos?: { clave: string; nombre: string; obligatorio: boolean }[];
    convocatoria?: { id: number; nombre: string }; acta_comite?: { nombre: string; subida_at: string } | null };
  faltantes: string[];
  historial: EntradaHistorial[];
  permisos: PermisosRevision & { logistica?: boolean; curp?: boolean; documentos?: boolean; kit_perfil?: boolean };
  /** E86: qué kit le toca al club. */
  kit?: ResumenKit | null;
  logistica: LogisticaEstado | null;
  /** E70: personas asignadas a la etapa actual y aprobaciones que lleva (solo personal). */
  aprobaciones: { requeridas: number; dadas: number; ya_aprobe: boolean; asignados: { nombre: string; aprobo: boolean }[] } | null;
}

/** Documentos que pide la convocatoria con lo que subió el club. E79: el servidor ya manda la lista completa (formatos
 *  marcados, documentos del programa y permisos de imagen) con su revisión; la versión anterior queda de respaldo. */
export function documentosDe(d: DetalleClubPersonal): DocumentoClub[] {
  if (Array.isArray(d.documentos_requeridos)) return d.documentos_requeridos;
  const subidos = new Map(d.documentos.map((x) => [x.clave, x]));
  return [
    { clave: CARTA_ESCUELA, nombre: 'Carta de consentimiento de la escuela', obligatorio: true },
    ...(Array.isArray(d.config.documentos) ? d.config.documentos : []).map((x) => ({ clave: x.clave, nombre: x.nombre, obligatorio: Boolean(x.obligatorio) })),
  ].map((x) => {
    const s = subidos.get(x.clave);
    return { ...x, subido: s ? { nombre_original: s.nombre_original, subido_at: s.subido_at } : null };
  });
}

const SIN_PERMISOS: PermisosRevision & { logistica?: boolean; curp?: boolean; documentos?: boolean } = { resolver: false, observar: false, rechazar: false, prorroga: false, visto_bueno: false, comite: false, acta: false, logistica: false, curp: false, documentos: false };

export function leer(data: unknown): DetalleClubPersonal | null {
  const d = data as Partial<DetalleClubPersonal> | null;
  if (!d?.club || typeof d.club.id !== 'number') return null;
  return {
    club: d.club,
    integrantes: Array.isArray(d.integrantes) ? d.integrantes : [],
    documentos: Array.isArray(d.documentos) ? d.documentos : [],
    documentos_requeridos: Array.isArray(d.documentos_requeridos) ? d.documentos_requeridos : undefined,
    config: d.config && typeof d.config === 'object' ? d.config : {},
    faltantes: Array.isArray(d.faltantes) ? d.faltantes.filter((x): x is string => typeof x === 'string') : [],
    historial: Array.isArray(d.historial) ? d.historial : [],
    permisos: { ...SIN_PERMISOS, ...(d.permisos ?? {}) },
    logistica: leerLogistica(d.logistica),
    aprobaciones: leerAprobaciones((d as { aprobaciones?: unknown }).aprobaciones),
    kit: leerResumenKit((d as { kit?: unknown }).kit),
  };
}

function leerAprobaciones(v: unknown): DetalleClubPersonal['aprobaciones'] {
  if (!v || typeof v !== 'object') return null;
  const a = v as Record<string, unknown>;
  const n = (x: unknown) => (typeof x === 'number' && Number.isInteger(x) && x >= 0 ? x : 0);
  return {
    requeridas: Math.max(1, n(a.requeridas)), dadas: n(a.dadas), ya_aprobe: a.ya_aprobe === true,
    asignados: (Array.isArray(a.asignados) ? a.asignados : []).filter((x): x is { nombre: string; aprobo: boolean } => typeof x?.nombre === 'string')
      .map((x) => ({ nombre: x.nombre.slice(0, 150), aprobo: x.aprobo === true })).slice(0, 20),
  };
}

/**
 * E76 — CURP de integrantes que el líder mandó a revisión (no coinciden con nombre o fecha y confirmó que son correctas).
 * Aprueban o rechazan el admin y el admin de convocatoria (permiso curp del servidor); los demás solo las ven.
 */
function CurpPorRevisar({ clubId, integrantes, puede, onHecho }: {
  clubId: number;
  integrantes: IntegranteApi[];
  puede: boolean;
  onHecho: (nuevo: unknown, mensaje: string, ok: boolean) => void;
}) {
  const [enviando, setEnviando] = useState<number | null>(null);
  const pendientes = integrantes.filter((i) => (i as { curp_verificacion?: string | null }).curp_verificacion === 'revision');
  if (pendientes.length === 0) return null;
  const decidir = async (id: number, decision: 'aprobar' | 'rechazar') => {
    setEnviando(id);
    try {
      const { data } = await api.post(`/revision/clubes/${clubId}/integrantes/${id}/curp`, { decision });
      onHecho(data, decision === 'aprobar' ? 'CURP aprobada.' : 'CURP rechazada: el líder deberá corregirla antes de enviar.', true);
    } catch (e) {
      onHecho(null, mensajeError(e, 'No se pudo guardar la revisión de la CURP.'), false);
    } finally {
      setEnviando(null);
    }
  };
  return (
    <section className="rounded-[16px] border px-5 py-4" style={{ borderColor: 'var(--tile-gold-fg)', backgroundColor: 'var(--tile-gold-bg)' }} aria-labelledby="curp-revision">
      <h3 id="curp-revision" className="flex items-center gap-2 text-sm font-bold text-[var(--app-ink)]"><AlertTriangle className="h-4 w-4" aria-hidden="true" />CURP por revisar ({pendientes.length})</h3>
      <p className="mt-1 text-xs text-[var(--app-ink-2)]">No coinciden con el nombre o la fecha de nacimiento; el líder confirmó que son correctas. Compáralas con el documento.</p>
      <ul className="mt-3 space-y-3">
        {pendientes.map((i) => {
          const x = i as IntegranteApi & { curp?: string | null; curp_problemas?: string[] | null };
          return (
            <li key={i.id} className="rounded-[12px] bg-[var(--app-card,white)] p-3 text-sm">
              <p className="font-bold text-[var(--app-ink)]">{i.nombre} · <span className="font-mono text-xs">{x.curp}</span></p>
              {!!x.curp_problemas?.length && <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-[var(--app-ink-2)]">{x.curp_problemas.map((p) => <li key={p}>{p}</li>)}</ul>}
              {puede && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className="pill" data-tone="emerald" disabled={enviando === i.id} onClick={() => void decidir(i.id, 'aprobar')}><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />La CURP es correcta</button>
                  <button type="button" className="pill" data-tone="red" disabled={enviando === i.id} onClick={() => void decidir(i.id, 'rechazar')}>Rechazar</button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** E70: quién revisa la etapa actual y cuántas aprobaciones lleva. */
function AprobacionesEtapa({ a }: { a: NonNullable<DetalleClubPersonal['aprobaciones']> }) {
  if (a.requeridas <= 1 && a.asignados.length === 0) return null;
  return (
    <section className="app-card space-y-2 p-5" aria-labelledby="aprob-etapa">
      <h3 id="aprob-etapa" className="text-sm font-bold text-[var(--app-ink)]">
        Revisión de esta etapa · {a.dadas} de {a.requeridas} aprobación{a.requeridas === 1 ? '' : 'es'}
      </h3>
      {a.asignados.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {a.asignados.map((x) => (
            <li key={x.nombre} className="pill" data-tone={x.aprobo ? 'emerald' : 'neutral'}>
              {x.aprobo ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Clock className="h-3.5 w-3.5" aria-hidden="true" />}
              {x.nombre}<span className="sr-only">{x.aprobo ? ': aprobó' : ': pendiente'}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-xs text-[var(--app-ink-2)]">Sin personas asignadas: la revisa cualquiera con el rol de la etapa.</p>}
      {a.ya_aprobe && <p className="text-xs font-semibold" style={{ color: 'var(--tile-emerald-fg)' }}>Ya diste tu aprobación; faltan las demás personas.</p>}
    </section>
  );
}

/**
 * E52 · F2 — Ficha de un club para el personal: avance, acciones de revisión (según permisos del servidor), historial
 * con quién resolvió y los datos del club. `endpoint` = /admin/clubes/{id} (admin, admin de convocatoria, consulta) o
 * /revision/clubes/{id} (revisor). El servidor aplica el alcance (404 fuera de él).
 */
export default function FichaClubPersonal({ endpoint, volverHref }: { endpoint: string; volverHref: (convocatoriaId?: number) => string }) {
  const [d, setD] = useState<DetalleClubPersonal | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [descargando, setDescargando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get(endpoint);
      const x = leer(data);
      if (!x) throw new Error('forma');
      setD(x);
    } catch {
      setError('No encontramos este club o no está dentro de tus convocatorias.');
    } finally {
      setCargando(false);
    }
  }, [endpoint]);
  useEffect(() => { void cargar(); }, [cargar]);

  if (cargando) return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin" aria-label="Cargando" /></div>;
  if (!d) return <div className="space-y-6"><PageHeader title="Club" backHref={volverHref()} backLabel="Volver" /><AlertBox type="error" message={error ?? 'No se pudo cargar el club.'} /></div>;

  const documentos = documentosDe(d);

  const descargar = async (clave: string, nombre: string) => {
    setDescargando(clave);
    try { await descargarDocumentoClub(d.club.id, clave, nombre); }
    catch { setError('No se pudo descargar el documento.'); }
    finally { setDescargando(null); }
  };

  // E79: aprobar o rechazar (con motivo) un documento subido.
  const revisarDocumento = async (clave: string, decision: 'aprobar' | 'rechazar', motivo?: string) => {
    try {
      const { data } = await api.post(`/revision/clubes/${d.club.id}/documentos/${encodeURIComponent(clave)}/revision`, { decision, motivo });
      const x = leer(data);
      if (x) setD(x);
      setAviso(decision === 'aprobar' ? 'Documento aprobado.' : 'Documento rechazado: el líder verá el motivo. Usa «Observar» para que pueda corregirlo.');
      setError(null);
      return true;
    } catch (e) {
      setError(mensajeError(e, 'No se pudo guardar la revisión del documento.'));
      return false;
    }
  };

  const convId = d.config.convocatoria?.id;
  return (
    <div className="space-y-6">
      <PageHeader title={d.club.nombre} eyebrow={d.config.convocatoria?.nombre ?? 'Club'} icon={<Shapes className="h-5 w-5" />}
        backHref={volverHref(convId)} backLabel="Volver a clubes"
        description="Datos que registró el líder, su avance en la revisión y el historial de cada decisión." />
      {aviso && <AlertBox type="success" message={aviso} onClose={() => setAviso(null)} />}
      {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}
      <section className="app-card p-5" aria-label="Avance"><LineaAvanceClub estado={d.club.estado} avance={d.club} quienes={quienesDeHistorial(d.historial)} /></section>
      {d.aprobaciones && <AprobacionesEtapa a={d.aprobaciones} />}
      {d.club.estado === 'borrador' && d.faltantes.length > 0 && (
        <section className="rounded-[16px] border px-5 py-4" style={{ borderColor: 'var(--tile-gold-fg)', backgroundColor: 'var(--tile-gold-bg)' }}>
          <p className="flex items-center gap-2 text-sm font-bold text-[var(--app-ink)]"><AlertTriangle className="h-4 w-4" aria-hidden="true" />El líder aún no envía el club. Le falta:</p>
          <ul className="mt-2 list-disc space-y-0.5 pl-6 text-sm text-[var(--app-ink)]">{d.faltantes.map((f) => <li key={f}>{f}</li>)}</ul>
        </section>
      )}
      {d.kit && (
        <TarjetaKit kit={d.kit} onCambiarPerfil={d.permisos.kit_perfil ? async (perfil) => {
          try {
            const { data } = await api.post(`/revision/clubes/${d.club.id}/kit-perfil`, { perfil });
            const x = leer(data); if (x) setD(x);
            setAviso('Perfil de kit actualizado.'); setError(null);
          } catch (e) { setError(mensajeError(e, 'No se pudo cambiar el perfil de kit.')); }
        } : undefined} />
      )}
      <CurpPorRevisar clubId={d.club.id} integrantes={d.integrantes} puede={Boolean(d.permisos.curp)}
        onHecho={(nuevo, mensaje, ok) => {
          const x = ok && nuevo ? leer(nuevo) : null;
          if (x) { setD(x); setAviso(mensaje); setError(null); } else { setError(mensaje); }
        }} />
      {d.club.estado !== 'borrador' && (
        <RevisionClubPanel clubId={d.club.id} estado={d.club.estado} avance={d.club} permisos={d.permisos} hayActa={Boolean(d.config.acta_comite)}
          convocatoriaId={convId ?? 0}
          onHecho={(nuevo, mensaje) => {
            const x = nuevo ? leer(nuevo) : null;
            if (x) { setD(x); setAviso(mensaje); setError(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }
            else { setError(mensaje); void cargar(); }
          }} />
      )}
      {d.logistica && (
        <LogisticaPersonal clubId={d.club.id} estadoClub={d.club.estado} logistica={d.logistica} puede={Boolean(d.permisos.logistica)}
          onHecho={(nuevo, mensaje, ok = true) => {
            if (!ok) { setError(mensaje); return; }
            setAviso(mensaje); setError(null);
            const det = nuevo.detalle ? leer(nuevo.detalle) : null;
            const log = nuevo.logistica ? leerLogistica(nuevo.logistica) : null;
            if (det) setD(det);
            else if (log) setD((x) => (x ? { ...x, logistica: log } : x));
            else void cargar();
          }} />
      )}
      <ClubResumen club={d.club} integrantes={d.integrantes} documentos={documentos} campos={leerCamposApi(d.config.campos)}
        camposIntegrante={normalizarPredef(d.config.campos_integrante, CAMPOS_INTEGRANTE, {})} kit={d.config.kit_nombre ?? null}
        onDescargar={descargar} descargando={descargando}
        onRevisar={d.permisos.documentos ? revisarDocumento : undefined} />
      <HistorialClub entradas={d.historial} />
    </div>
  );
}
