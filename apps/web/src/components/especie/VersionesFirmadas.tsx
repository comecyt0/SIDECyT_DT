'use client';

import { Eye, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ESTADO_FIRMADO, fechaHora, type VersionFirmada } from '@/lib/especie';
import { useVistaPrevia } from '@/components/ui/VistaPreviaProvider';
import { archivoFirmado } from '@/lib/especie-api';

/**
 * E52 · F3 — Versiones de un documento firmado (la más reciente arriba): estado, motivo de rechazo, quién revisó y descarga.
 * Con `onRevisar` (personal con permiso) la versión pendiente muestra Aprobar / Rechazar.
 */
export default function VersionesFirmadas({ versiones, onDescargar, onRevisar, ocupado, clubId }: {
  versiones: VersionFirmada[];
  /** 02/10/2026: con el club, «Ver» abre la vista previa dentro de la página (antes descargaba). */
  clubId?: number;
  onDescargar: (v: VersionFirmada) => void;
  onRevisar?: (v: VersionFirmada, resultado: 'aprobar' | 'rechazar') => void;
  ocupado?: boolean;
}) {
  const { ver } = useVistaPrevia();
  const abrir = (v: VersionFirmada) => (clubId ? void ver({ nombre: v.nombre_original, cargar: () => archivoFirmado(clubId, v.id) }) : onDescargar(v));
  if (!versiones.length) return <p className="text-xs text-[var(--app-ink-2)]">Aún no se sube ninguna versión firmada.</p>;
  return (
    <ul className="space-y-2">
      {versiones.map((v, i) => {
        const e = ESTADO_FIRMADO[v.estado] ?? { etiqueta: v.estado, tono: 'neutral' };
        return (
          <li key={v.id} className={`rounded-[12px] border px-3 py-2 ${i > 0 ? 'opacity-80' : ''}`} style={{ borderColor: 'var(--app-rule)' }}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="pill" data-tone={e.tono}>{e.etiqueta}</span>
              {/* E90: los datos cambiaron después de subir esta versión */}
              {i === 0 && v.desactualizado && <span className="pill" data-tone="gold" title="Los datos cambiaron: descárgalo de nuevo, fírmalo y súbelo">Desactualizado</span>}
              {/* En teléfono el nombre va en su propia línea (antes se partía letra por letra junto a la fecha y el botón). */}
              <span className="order-last w-full min-w-0 break-all text-xs text-[var(--app-ink)] sm:order-none sm:w-auto sm:flex-1">{v.nombre_original}</span>
              <span className="flex-1 text-xs text-[var(--app-ink-2)] sm:flex-none">{fechaHora(v.subido_at)}</span>
              <Button size="sm" variant="outline" onClick={() => abrir(v)} aria-label={`Ver versión subida el ${fechaHora(v.subido_at)}`}>
                <Eye className="h-4 w-4" aria-hidden="true" /><span className="max-sm:sr-only">Ver</span>
              </Button>
            </div>
            {v.motivo && <p className="mt-1 whitespace-pre-wrap break-words text-xs" style={{ color: v.estado === 'rechazado' ? 'var(--auth-danger)' : 'var(--app-ink-2)' }}>Motivo: {v.motivo}</p>}
            {v.revisor && v.revisado_at && <p className="mt-0.5 text-xs text-[var(--app-ink-2)]">Revisó {v.revisor} · {fechaHora(v.revisado_at)}</p>}
            {onRevisar && v.estado === 'pendiente' && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" disabled={ocupado} onClick={() => onRevisar(v, 'aprobar')}><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Aprobar</Button>
                <Button size="sm" variant="destructive" disabled={ocupado} onClick={() => onRevisar(v, 'rechazar')}><XCircle className="h-4 w-4" aria-hidden="true" />Rechazar</Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
