'use client';

import { UserCircle } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import MiCuenta from '@/components/perfil/MiCuenta';

/** Mi cuenta del líder de club (E52): foto, datos y "Mis roles". */
export default function CuentaClubPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Mi cuenta" description="Tu foto y tus datos te identifican en el sistema. Aquí también cambias de rol." icon={<UserCircle className="h-5 w-5" />} />
      <MiCuenta seguridadHref="/club/settings" />
    </div>
  );
}
