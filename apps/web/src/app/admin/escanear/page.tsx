'use client';

import { ScanLine } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import EscanerEventos from '@/components/especie/EscanerEventos';

/** E52 · F4 — Escaneo en eventos para admin y admin de convocatoria (este último, solo en sus convocatorias). */
export default function AdminEscanearPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Escanear en eventos" eyebrow="Apoyo en especie" icon={<ScanLine className="h-5 w-5" />}
        description="Lee el QR de los clubes para registrar asistencia, box lunch y entrega del kit. Si la cámara falla, búscalos a mano." />
      <EscanerEventos />
    </div>
  );
}
