'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import AdminTopLayout from '@/components/layout/AdminTopLayout';
import { useNotifications } from '@/hooks/useNotifications';
import { useSessionRefresh } from '@/hooks/useSessionRefresh';
import NotificationToast from '@/components/notifications/NotificationToast';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // No usamos string hardcodeado como inicial — esperamos a useEffect para leer
  // el nombre real desde la cookie userName (que se setea en login).
  const [userName, setUserName] = useState('');
  const { notifs, count, markAsRead, markAllAsRead, incoming, dismissIncoming } = useNotifications({
    endpoint: '/admin/notificaciones?all=true',
    basePath: '/admin/notificaciones',
  });
  useSessionRefresh();

  useEffect(() => {
    setUserName(Cookies.get('userName') || '');
  }, []);

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
      <NotificationToast notification={incoming} href="/admin/notificaciones" onClose={dismissIncoming} />
    </AdminTopLayout>
  );
}
