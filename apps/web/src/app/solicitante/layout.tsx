'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FolderOpen,
  PlusCircle,
  Settings,
  DollarSign,
  FileText,
} from 'lucide-react';
import api from '@/lib/api';
import RoleTopLayout from '@/components/layout/RoleTopLayout';
import { useNotifications } from '@/hooks/useNotifications';
import { useSessionRefresh } from '@/hooks/useSessionRefresh';
import { useT } from '@/i18n/I18nProvider';

export default function SolicitanteLayout({ children }: { children: React.ReactNode }) {
  const { t } = useT();
  const { notifs, count, markAsRead, markAllAsRead } = useNotifications();
  useSessionRefresh();
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { name: t('nav.mi_panel'),          href: '/solicitante/dashboard',           icon: LayoutDashboard, description: t('nav.desc.mi_panel') },
    { name: t('nav.mis_solicitudes'),   href: '/solicitante/solicitudes',         icon: FolderOpen,      description: t('nav.desc.mis_solicitudes') },
    { name: t('nav.nueva_solicitud'),   href: '/solicitante/solicitudes/nueva',   icon: PlusCircle,      description: t('nav.desc.nueva_solicitud') },
    { name: t('nav.mis_informes'),      href: '/solicitante/informes',            icon: FileText,        description: t('nav.desc.mis_informes') },
    { name: t('nav.mis_ministraciones'),href: '/solicitante/ministraciones',      icon: DollarSign,      description: t('nav.desc.mis_ministraciones') },
    { name: t('nav.configuracion'),     href: '/solicitante/settings',            icon: Settings,        description: t('nav.desc.configuracion') },
  ];

  // Guard: si el solicitante aún no completa institución, redirige a onboarding.
  // Excepción: la propia pantalla de onboarding NO se autoredirige.
  useEffect(() => {
    if (pathname === '/solicitante/onboarding') return;
    let cancelled = false;
    api.get('/auth/me').then(({ data }) => {
      if (cancelled) return;
      if (data?.user && !data.user.empresa_id) {
        router.replace('/solicitante/onboarding');
      }
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  // En onboarding renderizamos sin la shell para que sea inmersivo
  if (pathname === '/solicitante/onboarding') {
    return <>{children}</>;
  }

  return (
    <RoleTopLayout
      navItems={navItems}
      roleLabel={t('roles.solicitante')}
      menuTitle={t('nav.workspace_solicitante')}
      homeHref="/solicitante/dashboard"
      notificationCount={count}
      notifications={notifs}
      onMarkAsRead={markAsRead}
      onMarkAllAsRead={markAllAsRead}
      notificationSolicitudHref={(id) => `/solicitante/solicitudes/${id}`}
    >
      {children}
    </RoleTopLayout>
  );
}
