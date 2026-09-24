'use client';

import UserAvatar from '@/components/ui/user-avatar';
import { estadoLabel } from '@/lib/solicitud-estados';
import { formatDateTime } from '@/lib/format';

export interface PasoHistorial {
  id: number;
  estado_anterior: string | null;
  estado_nuevo: string;
  motivo?: string | null;
  created_at: string;
  user?: { id: number; name: string; avatar_url?: string | null } | null;
}

const APROBADOS = ['aprobada', 'convenio', 'ministracion', 'seguimiento', 'cerrada'];
const NO_APROBADOS = ['rechazada', 'cancelada'];

/**
 * Seguimiento de un folio (E45, punto 4): cada cambio de estado con la FOTO de quien lo hizo, fecha y motivo.
 * Los datos los escribe el servidor (solicitud_historial); aquí solo se pintan como texto.
 */
export default function Seguimiento({ pasos }: { pasos: PasoHistorial[] }) {
  if (!Array.isArray(pasos) || pasos.length === 0) {
    return <p className="text-sm text-[var(--app-ink-2)]">Todavía no hay movimientos registrados para este folio.</p>;
  }
  return (
    <ol className="seguimiento" aria-label="Seguimiento del folio">
      {pasos.map((p) => {
        const final = APROBADOS.includes(p.estado_nuevo) ? 'aprobado' : NO_APROBADOS.includes(p.estado_nuevo) ? 'no_aprobado' : undefined;
        return (
          <li key={p.id} className="seguimiento-paso">
            <UserAvatar user={p.user ?? { name: 'Sistema' }} size="sm" />
            <div className="seguimiento-caja" data-final={final}>
              <p className="text-sm text-[var(--app-ink)]">
                <strong className="font-semibold">{p.user?.name ?? 'Sistema'}</strong>{' '}
                {p.estado_anterior ? <>cambió de <em className="not-italic font-semibold">{estadoLabel(p.estado_anterior)}</em> a </> : <>registró el folio como </>}
                <em className="not-italic font-semibold">{estadoLabel(p.estado_nuevo)}</em>
              </p>
              {p.motivo && <p className="mt-1 text-sm text-[var(--app-ink-2)] whitespace-pre-wrap">{p.motivo}</p>}
              <p className="mt-1 text-xs text-[var(--app-ink-2)]">{formatDateTime(p.created_at)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
