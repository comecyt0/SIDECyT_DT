'use client';

import { useCallback, useEffect, useState } from 'react';
import { Shapes, Loader2, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import PageHeader from '@/components/ui/page-header';
import { AlertBox } from '@/components/ui/alert-box';
import ClubResumen from '@/components/especie/ClubResumen';
import LineaAvanceClub from '@/components/especie/LineaAvanceClub';
import HistorialClub from '@/components/especie/HistorialClub';
import RevisionClubPanel, { type PermisosRevision } from '@/components/especie/RevisionClubPanel';
import LogisticaPersonal from '@/components/especie/LogisticaPersonal';
import { descargarDocumentoClub } from '@/lib/especie-api';
import {
  CARTA_ESCUELA, leerCamposApi, normalizarPredef, CAMPOS_INTEGRANTE, leerLogistica, type LogisticaEstado,
  type ClubApi, type DocumentoClub, type EntradaHistorial, type IntegranteApi,
} from '@/lib/especie';

interface Detalle {
  club: ClubApi;
  integrantes: IntegranteApi[];
  documentos: { clave: string; nombre_original: string; subido_at: string | null }[];
  config: { kit_nombre?: string | null; campos?: unknown; campos_integrante?: unknown; documentos?: { clave: string; nombre: string; obligatorio: boolean }[];
    convocatoria?: { id: number; nombre: string }; acta_comite?: { nombre: string; subida_at: string } | null };
  faltantes: string[];
  historial: EntradaHistorial[];
  permisos: PermisosRevision & { logistica?: boolean };
  logistica: LogisticaEstado | null;
}

const SIN_PERMISOS: PermisosRevision & { logistica?: boolean } = { resolver: false, observar: false, rechazar: false, prorroga: false, visto_bueno: false, comite: false, acta: false, logistica: false };

function leer(data: unknown): Detalle | null {
  const d = data as Partial<Detalle> | null;
  if (!d?.club || typeof d.club.id !== 'number') return null;
  return {
    club: d.club,
    integrantes: Array.isArray(d.integrantes) ? d.integrantes : [],
    documentos: Array.isArray(d.documentos) ? d.documentos : [],
    config: d.config && typeof d.config === 'object' ? d.config : {},
    faltantes: Array.isArray(d.faltantes) ? d.faltantes.filter((x): x is string => typeof x === 'string') : [],
    historial: Array.isArray(d.historial) ? d.historial : [],
    permisos: { ...SIN_PERMISOS, ...(d.permisos ?? {}) },
    logistica: leerLogistica(d.logistica),
  };
}

/**
 * E52 · F2 — Ficha de un club para el personal: avance, acciones de revisión (según permisos del servidor), historial
 * con quién resolvió y los datos del club. `endpoint` = /admin/clubes/{id} (admin, admin de convocatoria, consulta) o
 * /revision/clubes/{id} (revisor). El servidor aplica el alcance (404 fuera de él).
 */
export default function FichaClubPersonal({ endpoint, volverHref }: { endpoint: string; volverHref: (convocatoriaId?: number) => string }) {
  const [d, setD] = useState<Detalle | null>(null);
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

  const subidos = new Map(d.documentos.map((x) => [x.clave, x]));
  const documentos: DocumentoClub[] = [
    { clave: CARTA_ESCUELA, nombre: 'Carta de consentimiento de la escuela', obligatorio: true },
    ...(Array.isArray(d.config.documentos) ? d.config.documentos : []).map((x) => ({ clave: x.clave, nombre: x.nombre, obligatorio: Boolean(x.obligatorio) })),
  ].map((x) => {
    const s = subidos.get(x.clave);
    return { ...x, subido: s ? { nombre_original: s.nombre_original, subido_at: s.subido_at } : null };
  });

  const descargar = async (clave: string, nombre: string) => {
    setDescargando(clave);
    try { await descargarDocumentoClub(d.club.id, clave, nombre); }
    catch { setError('No se pudo descargar el documento.'); }
    finally { setDescargando(null); }
  };

  const convId = d.config.convocatoria?.id;
  return (
    <div className="space-y-6">
      <PageHeader title={d.club.nombre} eyebrow={d.config.convocatoria?.nombre ?? 'Club'} icon={<Shapes className="h-5 w-5" />}
        backHref={volverHref(convId)} backLabel="Volver a clubes"
        description="Datos que registró el líder, su avance en la revisión y el historial de cada decisión." />
      {aviso && <AlertBox type="success" message={aviso} onClose={() => setAviso(null)} />}
      {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}
      <section className="app-card p-5" aria-label="Avance"><LineaAvanceClub estado={d.club.estado} avance={d.club} /></section>
      {d.club.estado === 'borrador' && d.faltantes.length > 0 && (
        <section className="rounded-[16px] border px-5 py-4" style={{ borderColor: 'var(--tile-gold-fg)', backgroundColor: 'var(--tile-gold-bg)' }}>
          <p className="flex items-center gap-2 text-sm font-bold text-[var(--app-ink)]"><AlertTriangle className="h-4 w-4" aria-hidden="true" />El líder aún no envía el club. Le falta:</p>
          <ul className="mt-2 list-disc space-y-0.5 pl-6 text-sm text-[var(--app-ink)]">{d.faltantes.map((f) => <li key={f}>{f}</li>)}</ul>
        </section>
      )}
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
        onDescargar={descargar} descargando={descargando} />
      <HistorialClub entradas={d.historial} />
    </div>
  );
}
