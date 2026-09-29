'use client';

import { useParams } from 'next/navigation';
import FichaClubPersonal from '@/components/especie/FichaClubPersonal';

/** E52 · F1/F2 — Ficha de un club para admin, admin de convocatoria y consulta (el servidor aplica alcance y permisos). */
export default function ClubAdminDetallePage() {
  const { id } = useParams<{ id: string }>();
  return <FichaClubPersonal endpoint={`/admin/clubes/${encodeURIComponent(String(id))}`}
    volverHref={(conv) => (conv ? `/admin/clubes?convocatoria=${conv}` : '/admin/clubes')} />;
}
