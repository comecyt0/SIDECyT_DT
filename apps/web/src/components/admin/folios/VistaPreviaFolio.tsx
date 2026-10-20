'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, FileDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { descargarExportacionFolios } from '@/lib/folios-api';

/** Ficha de un folio (misma forma que `App\Support\FoliosReporte::ficha`). */
export interface FichaFolio {
  tipo: 'solicitud' | 'club'; id: number; clave: string; folio: string; titulo: string | null; estado: string; enlace: string;
  etiquetas: { texto: string; tono: string }[];
  secciones: { titulo: string; campos: { etiqueta: string; valor: string | null }[] }[];
  tablas: { titulo: string; columnas: string[]; filas: (string | number | null)[][] }[];
  historial: { fecha: string | null; texto: string; detalle: string | null; quien: string | null }[];
}

/**
 * E81 (20/10/2026, pedido del usuario) — Vista previa de un folio con todos sus datos y etiquetas (estado, tipo,
 * «Nueva escuela» / «Ya participó», modalidad, menores, publicación), sus tablas e historial. Exporta ese folio en PDF
 * o Excel. Ventana modal: se abre de vez en cuando, animación corta de la librería.
 */
export default function VistaPreviaFolio({ clave, onCerrar }: { clave: string | null; onCerrar: () => void }) {
  const [ficha, setFicha] = useState<FichaFolio | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportando, setExportando] = useState<'pdf' | 'xlsx' | null>(null);

  useEffect(() => {
    setFicha(null);
    setError(null);
    if (!clave) return;
    const [tipo, id] = clave.split('-');
    let vigente = true;
    api.get(`/admin/folios/${tipo}/${id}/ficha`)
      .then(({ data }) => { if (vigente) setFicha(data as FichaFolio); })
      .catch(() => { if (vigente) setError('No se pudo cargar el folio.'); });
    return () => { vigente = false; };
  }, [clave]);

  const exportar = async (formato: 'pdf' | 'xlsx') => {
    if (!ficha) return;
    setExportando(formato);
    try { await descargarExportacionFolios({ formato, modo: 'individual', ids: [ficha.clave] }, `folio-${ficha.folio}`); }
    catch { setError('No se pudo exportar el folio.'); }
    finally { setExportando(null); }
  };

  return (
    <Dialog open={clave !== null} onOpenChange={(abierto) => { if (!abierto) onCerrar(); }}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-3xl">
        {!ficha ? (
          <div className="grid place-items-center gap-2 py-12">
            <DialogTitle className="sr-only">Vista previa del folio</DialogTitle>
            {error ? <p className="text-sm" style={{ color: 'var(--auth-danger)' }}>{error}</p> : <Loader2 className="h-6 w-6 animate-spin" aria-label="Cargando" />}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2 pr-8">
              <DialogTitle className="font-mono text-lg font-bold text-[var(--sg-vino)]">{ficha.folio}</DialogTitle>
              <DialogDescription className="break-words text-sm text-[var(--app-ink)]">{ficha.titulo ?? '—'}</DialogDescription>
              <ul className="flex flex-wrap gap-1.5" aria-label="Etiquetas del folio">
                {ficha.etiquetas.map((e) => <li key={e.texto} className="pill" data-tone={e.tono}>{e.texto}</li>)}
              </ul>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="soft" onClick={() => void exportar('pdf')} disabled={exportando !== null}>
                  {exportando === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileDown className="h-4 w-4" aria-hidden="true" />}PDF
                </Button>
                <Button size="sm" variant="soft" onClick={() => void exportar('xlsx')} disabled={exportando !== null}>
                  {exportando === 'xlsx' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />}Excel
                </Button>
                <Link href={ficha.enlace} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--sg-vino)] hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />Abrir el expediente
                </Link>
              </div>
              {error && <p role="alert" className="text-sm" style={{ color: 'var(--auth-danger)' }}>{error}</p>}
            </div>

            {ficha.secciones.map((s) => (
              <section key={s.titulo} className="space-y-2" aria-label={s.titulo}>
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]">{s.titulo}</h3>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
                  {s.campos.map((c) => (
                    <div key={c.etiqueta} className="min-w-0 border-b border-dotted pb-1" style={{ borderColor: 'var(--app-rule)' }}>
                      <dt className="text-xs text-[var(--app-ink-2)]">{c.etiqueta}</dt>
                      <dd className="break-words text-sm font-semibold text-[var(--app-ink)]">{c.valor || '—'}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}

            {ficha.tablas.map((t) => (
              <section key={t.titulo} className="space-y-2" aria-label={t.titulo}>
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]">{t.titulo} ({t.filas.length})</h3>
                {t.filas.length ? (
                  <div className="overflow-x-auto rounded-[12px] border" style={{ borderColor: 'var(--app-rule)' }}>
                    <table className="w-full min-w-[420px] text-left text-sm">
                      <thead><tr>{t.columnas.map((c) => <th key={c} scope="col" className="px-3 py-2 text-xs font-bold text-white" style={{ backgroundColor: 'var(--sg-vino)' }}>{c}</th>)}</tr></thead>
                      <tbody>
                        {t.filas.map((f, i) => (
                          <tr key={i} className="border-t" style={{ borderColor: 'var(--app-rule)' }}>
                            {f.map((v, j) => <td key={j} className="break-words px-3 py-1.5 text-[var(--app-ink)]">{v ?? '—'}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-sm text-[var(--app-ink-2)]">Sin registros.</p>}
              </section>
            ))}

            <section className="space-y-2" aria-label="Historial">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]">Historial</h3>
              {ficha.historial.length ? (
                <ol className="space-y-2 border-l-2 pl-4" style={{ borderColor: 'var(--app-rule)' }}>
                  {ficha.historial.map((h, i) => (
                    <li key={i} className="text-sm">
                      <p className="font-semibold text-[var(--app-ink)]">{h.texto}</p>
                      <p className="text-xs text-[var(--app-ink-2)]">{[h.fecha, h.quien].filter(Boolean).join(' · ')}</p>
                      {h.detalle && <p className="break-words text-xs text-[var(--app-ink)]">{h.detalle}</p>}
                    </li>
                  ))}
                </ol>
              ) : <p className="text-sm text-[var(--app-ink-2)]">Sin movimientos registrados.</p>}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
