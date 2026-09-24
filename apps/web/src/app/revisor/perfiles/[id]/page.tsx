'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { IdCard } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import FichaUsuario from '@/components/perfil/FichaUsuario';

/** Ficha completa de usuario / folio (E45): foto, portada, datos y seguimiento. El backend aplica el alcance. */
export default function FichaPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const [folio, setFolio] = useState<number | undefined>(undefined);
  useEffect(() => {
    const f = Number(new URLSearchParams(window.location.search).get('folio'));
    setFolio(Number.isInteger(f) && f > 0 ? f : undefined);
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader title="Ficha" description="Foto, portada, datos completos, solicitudes y seguimiento." icon={<IdCard className="h-5 w-5" />} backHref="/revisor/solicitudes" />
      {Number.isInteger(id) && id > 0 ? <FichaUsuario userId={id} folioId={folio} /> : <p className="text-sm">Ficha no válida.</p>}
    </div>
  );
}
