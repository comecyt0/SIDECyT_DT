'use client';

import { School } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';

/**
 * E52 — Inicio del panel del líder de club. Fase 5 deja listo el acceso (registro con rol "Líder de club" aprobado por
 * un admin); el registro del club, integrantes y la línea de avance se construyen en la Fase 1 (docs/APOYO_EN_ESPECIE.md).
 */
export default function ClubDashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Mi club"
        description="Aquí registrarás a tu club en las convocatorias de Apoyo en especie y darás seguimiento a cada etapa."
        icon={<School className="h-5 w-5" />}
      />
      <div className="empty-state">
        <p className="font-semibold">Tu cuenta de líder de club ya está activa.</p>
        <p className="text-sm text-[var(--app-ink-2)]">En cuanto el COMECYT publique una convocatoria de Apoyo en especie podrás registrar a tu club desde aquí.</p>
      </div>
    </div>
  );
}
