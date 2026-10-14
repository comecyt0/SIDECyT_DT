'use client';

import PageHeader from '@/components/ui/page-header';
import MiCuenta from '@/components/perfil/MiCuenta';
import TwoFactorSetup from '@/components/auth/TwoFactorSetup';
import { UserCircle } from 'lucide-react';

/** Mi cuenta (E45, punto 3): foto de perfil, portada y datos. */
export default function CuentaPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Mi cuenta" description="Tu foto y portada te identifican en todo el sistema. Aquí también actualizas tus datos." icon={<UserCircle className="h-5 w-5" />} />
      <MiCuenta />
      {/* Verificación en dos pasos para los roles internos (antes solo existía en la configuración del solicitante). */}
      <section aria-label="Seguridad de la cuenta" className="perfil-tarjeta">
        <TwoFactorSetup />
      </section>
    </div>
  );
}
