'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, ExternalLink, X } from 'lucide-react';
import api from '@/lib/api';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import ClubResumen from '@/components/especie/ClubResumen';
import LineaAvanceClub, { quienesDeHistorial } from '@/components/especie/LineaAvanceClub';
import HistorialClub from '@/components/especie/HistorialClub';
import { documentosDe, leer, type DetalleClubPersonal } from '@/components/especie/FichaClubPersonal';
import { descargarDocumentoClub } from '@/lib/especie-api';
import { CAMPOS_INTEGRANTE, leerCamposApi, normalizarPredef } from '@/lib/especie';

/**
 * 02/10/2026 — Vista previa de un club sin salir de la lista (admin/clubes): avance con su línea de tiempo, datos,
 * integrantes, documentos e historial. Usa el mismo endpoint de la ficha (el servidor aplica el alcance) y solo lee.
 */
export default function VistaPreviaClub({ clubId, onClose, hrefFicha, endpoint = (id) => `/admin/clubes/${id}` }: {
  clubId: number | null; onClose: () => void; hrefFicha: (id: number) => string;
  /** /admin/clubes/{id} (admin, admin de convocatoria, consulta) o /revision/clubes/{id} (revisor). */
  endpoint?: (id: number) => string;
}) {
  const [d, setD] = useState<DetalleClubPersonal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [descargando, setDescargando] = useState<string | null>(null);

  useEffect(() => {
    if (clubId === null) return;
    let vivo = true;
    setD(null); setError(null);
    api.get(endpoint(clubId))
      .then(({ data }) => { if (!vivo) return; const x = leer(data); if (x) setD(x); else setError('No se pudo leer el club.'); })
      .catch(() => { if (vivo) setError('No encontramos este club o no está dentro de tus convocatorias.'); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  const descargar = async (clave: string, nombre: string) => {
    if (!d) return;
    setDescargando(clave);
    try { await descargarDocumentoClub(d.club.id, clave, nombre); } catch { setError('No se pudo descargar el documento.'); } finally { setDescargando(null); }
  };

  return (
    <Dialog open={clubId !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent showCloseButton={false} className="max-h-[90dvh] overflow-y-auto p-0 sm:max-w-4xl">
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b bg-[var(--app-card-bg,var(--background))] px-5 py-4" style={{ borderColor: 'var(--app-rule)' }}>
          <div className="min-w-0 flex-1">
            <DialogTitle className="break-words text-lg font-bold text-[var(--app-ink)]">{d?.club.nombre ?? 'Vista previa del club'}</DialogTitle>
            <DialogDescription className="text-xs text-[var(--app-ink-2)]">{d?.config.convocatoria?.nombre ?? 'Cargando…'}</DialogDescription>
          </div>
          {clubId !== null && (
            <Link href={hrefFicha(clubId)} className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold text-white" style={{ backgroundColor: 'var(--auth-vino)' }}>
              <ExternalLink className="h-4 w-4" aria-hidden="true" />Abrir ficha
            </Link>
          )}
          <button type="button" onClick={onClose} aria-label="Cerrar vista previa" className="grid h-10 w-10 place-items-center rounded-full text-[var(--app-ink-2)] hover:bg-[var(--auth-field)]"><X className="h-5 w-5" aria-hidden="true" /></button>
        </div>
        <div className="space-y-6 p-5">
          {error && <p role="alert" className="text-sm" style={{ color: 'var(--auth-danger)' }}>{error}</p>}
          {!d && !error && <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin" aria-label="Cargando" /></div>}
          {d && (
            <>
              <section className="app-card p-5" aria-label="Línea de tiempo del club"><LineaAvanceClub estado={d.club.estado} avance={d.club} quienes={quienesDeHistorial(d.historial)} /></section>
              <ClubResumen club={d.club} integrantes={d.integrantes} documentos={documentosDe(d)} campos={leerCamposApi(d.config.campos)}
                camposIntegrante={normalizarPredef(d.config.campos_integrante, CAMPOS_INTEGRANTE, {})} kit={d.config.kit_nombre ?? null}
                onDescargar={descargar} descargando={descargando} />
              <HistorialClub entradas={d.historial} />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
