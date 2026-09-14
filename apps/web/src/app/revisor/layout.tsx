'use client';

import {
  LayoutDashboard,
  FileCheck2,
  Clock,
  FolderSearch,
  FileText,
} from 'lucide-react';
import RoleTopLayout from '@/components/layout/RoleTopLayout';
import { useNotifications } from '@/hooks/useNotifications';
import { useSessionRefresh } from '@/hooks/useSessionRefresh';
import { useT } from '@/i18n/I18nProvider';

export default function RevisorLayout({ children }: { children: React.ReactNode }) {
  const { t } = useT();
  const { notifs, count, markAsRead, markAllAsRead } = useNotifications();
  useSessionRefresh();

  const navItems = [
    { name: t('nav.dashboard'),        href: '/revisor/dashboard',    icon: LayoutDashboard, description: t('nav.desc.revisor_dashboard') },
    { name: t('nav.bandeja_entrada'),  href: '/revisor/solicitudes',  icon: FolderSearch,    description: t('nav.desc.bandeja_entrada') },
    { name: t('nav.en_subsanacion'),   href: '/revisor/observadas',   icon: Clock,           description: t('nav.desc.en_subsanacion') },
    { name: t('nav.completadas'),      href: '/revisor/completadas',  icon: FileCheck2,      description: t('nav.desc.completadas') },
    { name: t('nav.informes_finales'), href: '/revisor/informes',     icon: FileText,        description: t('nav.desc.informes_finales') },
  ];

  return (
    <RoleTopLayout
      navItems={navItems}
      roleLabel={t('roles.revisor')}
      menuTitle={t('nav.workspace_revisor')}
      homeHref="/revisor/dashboard"
      notificationCount={count}
      notifications={notifs}
      onMarkAsRead={markAsRead}
      onMarkAllAsRead={markAllAsRead}
      searchEndpoint="/revisor/search"
      searchSolicitudHref={(folio) => `/revisor/solicitudes?folio=${encodeURIComponent(folio)}`}
      notificationSolicitudHref={(id) => `/revisor/solicitudes/${id}`}
    >
      {children}
    </RoleTopLayout>
  );
}
