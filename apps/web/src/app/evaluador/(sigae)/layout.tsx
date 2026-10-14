'use client';

import { ClipboardList, UserCircle } from 'lucide-react';
import RoleTopLayout from '@/components/layout/RoleTopLayout';
import { useNotifications } from '@/hooks/useNotifications';
import { useSessionRefresh } from '@/hooks/useSessionRefresh';
import { useT } from '@/i18n/I18nProvider';
import NotificationToast from '@/components/notifications/NotificationToast';

/**
 * Pantallas del evaluador que SÍ dependen de la sesión de SIGAE (Mi cuenta, perfiles). E72 paso 5: el trabajo de
 * evaluación vive en el panel compartido /evaluador (grupo (panel)), que funciona con la sesión de SIGAE o de SICEI.
 */
export default function EvaluadorSigaeLayout({ children }: { children: React.ReactNode }) {
  const { t } = useT();
  const { notifs, count, markAsRead, markAllAsRead, incoming, dismissIncoming } = useNotifications();
  useSessionRefresh();

  const navItems = [
    { name: t('nav.evaluaciones_tecnicas'), href: '/evaluador', icon: ClipboardList, description: t('nav.desc.evaluaciones_tecnicas') },
    { name: t('nav.my_account'), href: '/evaluador/cuenta', icon: UserCircle, description: t('nav.desc.cuenta') },
  ];

  return (
    <RoleTopLayout
      navItems={navItems}
      roleLabel={t('roles.evaluador')}
      menuTitle={t('nav.workspace_evaluador')}
      homeHref="/evaluador"
      notificationCount={count}
      notifications={notifs}
      onMarkAsRead={markAsRead}
      onMarkAllAsRead={markAllAsRead}
      searchEndpoint="/evaluador/search"
      searchSolicitudHref={() => '/evaluador?sistema=sigae'}
      notificationSolicitudHref={() => '/evaluador?sistema=sigae'}
    >
      {children}
      <NotificationToast notification={incoming} href="/evaluador?sistema=sigae" onClose={dismissIncoming} />
    </RoleTopLayout>
  );
}
