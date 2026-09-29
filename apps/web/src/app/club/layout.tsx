'use client';

import { School, UserCircle, Settings } from 'lucide-react';
import RoleTopLayout from '@/components/layout/RoleTopLayout';
import { useNotifications } from '@/hooks/useNotifications';
import { useSessionRefresh } from '@/hooks/useSessionRefresh';
import { useT } from '@/i18n/I18nProvider';
import NotificationToast from '@/components/notifications/NotificationToast';

/** E52 — Panel del líder de club (Apoyo en especie). La línea de avance del club llega en F1/F2. */
export default function ClubLayout({ children }: { children: React.ReactNode }) {
  const { t } = useT();
  const { notifs, count, markAsRead, markAllAsRead, incoming, dismissIncoming } = useNotifications();
  useSessionRefresh();

  const navItems = [
    { name: t('nav.mi_club'), href: '/club/dashboard', icon: School, description: t('nav.desc.mi_club') },
    { name: t('nav.my_account'), href: '/club/cuenta', icon: UserCircle, description: t('nav.desc.cuenta') },
    { name: t('nav.configuracion'), href: '/club/settings', icon: Settings, description: t('nav.desc.configuracion') },
  ];

  return (
    <RoleTopLayout
      navItems={navItems}
      roleLabel={t('roles.lider_club')}
      menuTitle={t('nav.workspace_club')}
      homeHref="/club/dashboard"
      notificationCount={count}
      notifications={notifs}
      onMarkAsRead={markAsRead}
      onMarkAllAsRead={markAllAsRead}
    >
      {children}
      <NotificationToast notification={incoming} href="/club/dashboard" onClose={dismissIncoming} />
    </RoleTopLayout>
  );
}
