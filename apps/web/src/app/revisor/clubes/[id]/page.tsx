'use client';

import { useParams } from 'next/navigation';
import FichaClubPersonal from '@/components/especie/FichaClubPersonal';

/** E52 · F2 — Ficha de un club para el revisor documental (el servidor aplica alcance y permisos por etapa). */
export default function RevisorClubPage() {
  const { id } = useParams<{ id: string }>();
  return <FichaClubPersonal endpoint={`/revision/clubes/${encodeURIComponent(String(id))}`} volverHref={() => '/revisor/clubes'} />;
}
