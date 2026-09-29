'use client';

import { ScanLine } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import EscanerEventos from '@/components/especie/EscanerEventos';

/** E52 · F4 — Escaneo en eventos del operador de evento (solo sus convocatorias asignadas; lo aplica el servidor). */
export default function OperadorEscanearPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Escanear" eyebrow="Eventos" icon={<ScanLine className="h-5 w-5" />}
        description="Elige el evento y qué registras, lee el QR de la credencial del club y confirma." />
      <EscanerEventos />
    </div>
  );
}
