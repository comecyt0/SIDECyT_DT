'use client';

import { Suspense } from 'react';
import { MessagesSquare } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import Buzon from '@/components/buzon/Buzon';

/** Buzón de sugerencias con chat en tiempo real (E45, punto 2). */
export default function BuzonPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Buzón" description="Envía sugerencias, dudas o problemas al equipo de tu convocatoria y chatea en tiempo real." icon={<MessagesSquare className="h-5 w-5" />} />
      {/* Suspense: Buzon lee ?hilo= con useSearchParams */}
      <Suspense fallback={null}><Buzon modo="solicitante" /></Suspense>
    </div>
  );
}
