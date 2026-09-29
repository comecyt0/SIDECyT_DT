'use client';

import { UserCircle } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import MiCuenta from '@/components/perfil/MiCuenta';

/** Mi cuenta del operador de evento (E52 · F4): foto y datos. */
export default function CuentaOperadorPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Mi cuenta" description="Tu foto y tus datos te identifican en el sistema." icon={<UserCircle className="h-5 w-5" />} />
      <MiCuenta seguridadHref="/operador/settings" />
    </div>
  );
}
