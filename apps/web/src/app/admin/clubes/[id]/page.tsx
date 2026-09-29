'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Shapes, Loader2, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import PageHeader from '@/components/ui/page-header';
import { AlertBox } from '@/components/ui/alert-box';
import ClubResumen from '@/components/especie/ClubResumen';
import { descargarDocumentoClub } from '@/lib/especie-api';
import {
  CARTA_ESCUELA, leerCamposApi, normalizarPredef, CAMPOS_INTEGRANTE,
  type ClubApi, type DocumentoClub, type IntegranteApi,
} from '@/lib/especie';

interface Detalle {
  club: ClubApi;
  integrantes: IntegranteApi[];
  documentos: { clave: string; nombre_original: string; subido_at: string | null }[];
  config: { kit_nombre?: string | null; campos?: unknown; campos_integrante?: unknown; documentos?: { clave: string; nombre: string; obligatorio: boolean }[]; convocatoria?: { id: number; nombre: string } };
  faltantes: string[];
}

/** E52 · F1 — Ficha de un club para el personal (solo lectura; el servidor aplica el alcance y responde 404 fuera de él). */
export default function ClubAdminDetallePage() {
  const { id } = useParams();
  const [d, setD] = useState<Detalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [descargando, setDescargando] = useState<string | null>(null);

  useEffect(() => {
    api.get(`/admin/clubes/${id}`)
      .then(({ data }) => {
        if (!data?.club || typeof data.club.id !== 'number') throw new Error('forma');
        setD({
          club: data.club,
          integrantes: Array.isArray(data.integrantes) ? data.integrantes : [],
          documentos: Array.isArray(data.documentos) ? data.documentos : [],
          config: data.config && typeof data.config === 'object' ? data.config : {},
          faltantes: Array.isArray(data.faltantes) ? data.faltantes.filter((x: unknown) => typeof x === 'string') : [],
        });
      })
      .catch(() => setError('No encontramos este club o no está dentro de tus convocatorias.'))
      .finally(() => setCargando(false));
  }, [id]);

  if (cargando) return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin" aria-label="Cargando" /></div>;
  if (!d) return <div className="space-y-6"><PageHeader title="Club" backHref="/admin/clubes" backLabel="Volver a clubes" /><AlertBox type="error" message={error ?? 'No se pudo cargar el club.'} /></div>;

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
        backHref={convId ? `/admin/clubes?convocatoria=${convId}` : '/admin/clubes'} backLabel="Volver a clubes"
        description="Información que registró el líder del club. La revisión y la aceptación se habilitan en la siguiente fase." />
      {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}
      {d.club.estado === 'borrador' && d.faltantes.length > 0 && (
        <section className="rounded-[16px] border px-5 py-4" style={{ borderColor: 'var(--tile-gold-fg)', backgroundColor: 'var(--tile-gold-bg)' }}>
          <p className="flex items-center gap-2 text-sm font-bold text-[var(--app-ink)]"><AlertTriangle className="h-4 w-4" aria-hidden="true" />El líder aún no envía el club. Le falta:</p>
          <ul className="mt-2 list-disc space-y-0.5 pl-6 text-sm text-[var(--app-ink)]">{d.faltantes.map((f) => <li key={f}>{f}</li>)}</ul>
        </section>
      )}
      <ClubResumen club={d.club} integrantes={d.integrantes} documentos={documentos} campos={leerCamposApi(d.config.campos)}
        camposIntegrante={normalizarPredef(d.config.campos_integrante, CAMPOS_INTEGRANTE, {})} kit={d.config.kit_nombre ?? null}
        onDescargar={descargar} descargando={descargando} />
    </div>
  );
}
