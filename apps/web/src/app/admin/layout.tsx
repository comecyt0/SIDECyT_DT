'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import AdminTopLayout from '@/components/layout/AdminTopLayout';
import { useNotifications } from '@/hooks/useNotifications';
import { useSessionRefresh } from '@/hooks/useSessionRefresh';
import NotificationToast from '@/components/notifications/NotificationToast';

/** Campana del panel /admin (E45: el admin de convocatoria y la consulta ven solo SUS notificaciones). */
function AdminShell({ children, esAdmin, userName }: { children: React.ReactNode; esAdmin: boolean; userName: string }) {
  const { notifs, count, markAsRead, markAllAsRead, incoming, dismissIncoming } = useNotifications(
    esAdmin
      ? { endpoint: '/admin/notificaciones?all=true', basePath: '/admin/notificaciones' }
      : { endpoint: '/mis-notificaciones?all=true', basePath: '/mis-notificaciones' },
  );

  return (
    <AdminTopLayout
      userName={userName}
      navItems={[]}
      notificationCount={count}
      notifications={notifs}
      onMarkAsRead={markAsRead}
      onMarkAllAsRead={markAllAsRead}
    >
      {children}
      <NotificationToast notification={incoming} href={esAdmin ? '/admin/notificaciones' : '/admin/buzon'} onClose={dismissIncoming} />
    </AdminTopLayout>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // No usamos string hardcodeado como inicial — esperamos a useEffect para leer
  // el nombre real desde la cookie userName (que se setea en login).
  const [userName, setUserName] = useState('');
  const [rol, setRol] = useState<string | null>(null);
  useSessionRefresh();

  useEffect(() => {
    setUserName(Cookies.get('userName') || '');
    setRol(Cookies.get('userRole') || 'admin');
  }, []);

  if (rol === null) return null;
  // `key` distinto por rol: el hook de notificaciones se monta con su endpoint correcto desde el inicio.
  return <AdminShell key={rol} esAdmin={rol === 'admin'} userName={userName}>{children}</AdminShell>;
}
