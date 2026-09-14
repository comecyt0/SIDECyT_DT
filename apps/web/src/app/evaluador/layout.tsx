'use client';

import {
  LayoutDashboard,
  ClipboardList,
  History,
} from 'lucide-react';
import RoleTopLayout from '@/components/layout/RoleTopLayout';
import { useNotifications } from '@/hooks/useNotifications';
import { useSessionRefresh } from '@/hooks/useSessionRefresh';
import { useT } from '@/i18n/I18nProvider';

export default function EvaluadorLayout({ children }: { children: React.ReactNode }) {
  const { t } = useT();
  const { notifs, count, markAsRead, markAllAsRead } = useNotifications();
  useSessionRefresh();

  const navItems = [
    { name: t('nav.panel_principal'),       href: '/evaluador/dashboard',    icon: LayoutDashboard, description: t('nav.desc.panel_principal') },
    { name: t('nav.evaluaciones_tecnicas'), href: '/evaluador/asignaciones', icon: ClipboardList,   description: t('nav.desc.evaluaciones_tecnicas') },
    { name: t('nav.historico_dictamenes'),  href: '/evaluador/historico',    icon: History,         description: t('nav.desc.historico_dictamenes') },
  ];

  return (
    <RoleTopLayout
      navItems={navItems}
      roleLabel={t('roles.evaluador')}
      menuTitle={t('nav.workspace_evaluador')}
      homeHref="/evaluador/dashboard"
      notificationCount={count}
      notifications={notifs}
      onMarkAsRead={markAsRead}
      onMarkAllAsRead={markAllAsRead}
      searchEndpoint="/evaluador/search"
      searchSolicitudHref={(folio) => `/evaluador/asignaciones?folio=${encodeURIComponent(folio)}`}
      notificationSolicitudHref={(id) => `/evaluador/asignaciones?solicitud=${id}`}
    >
      {children}
    </RoleTopLayout>
  );
}
