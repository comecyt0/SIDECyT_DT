'use client';

import { ScanLine, UserCircle, Settings } from 'lucide-react';
import RoleTopLayout from '@/components/layout/RoleTopLayout';
import { useNotifications } from '@/hooks/useNotifications';
import { useSessionRefresh } from '@/hooks/useSessionRefresh';
import { useT } from '@/i18n/I18nProvider';
import NotificationToast from '@/components/notifications/NotificationToast';

/** E52 · F4 — Panel del operador de evento: escanear el QR de los clubes en los eventos de sus convocatorias. */
export default function OperadorLayout({ children }: { children: React.ReactNode }) {
  const { t } = useT();
  const { notifs, count, markAsRead, markAllAsRead, incoming, dismissIncoming } = useNotifications();
  useSessionRefresh();

  const navItems = [
    { name: t('nav.escanear'), href: '/operador/escanear', icon: ScanLine, description: t('nav.desc.escanear') },
    { name: t('nav.my_account'), href: '/operador/cuenta', icon: UserCircle, description: t('nav.desc.cuenta') },
    { name: t('nav.configuracion'), href: '/operador/settings', icon: Settings, description: t('nav.desc.configuracion') },
  ];

  return (
    <RoleTopLayout
      navItems={navItems}
      roleLabel={t('roles.operador_evento')}
      menuTitle={t('nav.workspace_operador')}
      homeHref="/operador/escanear"
      notificationCount={count}
      notifications={notifs}
      onMarkAsRead={markAsRead}
      onMarkAllAsRead={markAllAsRead}
    >
      {children}
      <NotificationToast notification={incoming} href="/operador/escanear" onClose={dismissIncoming} />
    </RoleTopLayout>
  );
}
