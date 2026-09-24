'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import AdminTopLayout from '@/components/layout/AdminTopLayout';
import { useNotifications } from '@/hooks/useNotifications';
import { useSessionRefresh } from '@/hooks/useSessionRefresh';
import NotificationToast from '@/components/notifications/NotificationToast';
import { hrefAvisoAdmin, hrefBuzon } from '@/lib/notificaciones';

/** Campana del panel /admin: cada quien ve solo SUS notificaciones. */
function AdminShell({ children, esAdmin, userName }: { children: React.ReactNode; esAdmin: boolean; userName: string }) {
  // 24/09/2026: la campana muestra solo las notificaciones PROPIAS, también al admin. Antes el admin veía las de
  // todos (/admin/notificaciones); las ajenas no las puede marcar como leídas (403), así que se quedaban "nuevas"
  // para siempre — p. ej. la copia del aviso del buzón que recibe cada admin de convocatoria. El historial completo
  // sigue en la página /admin/notificaciones.
  const { notifs, count, markAsRead, markAllAsRead, incoming, dismissIncoming } = useNotifications(
    { endpoint: '/mis-notificaciones?all=true', basePath: '/mis-notificaciones' },
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
      <NotificationToast
        notification={incoming}
        href={(incoming && (hrefBuzon(incoming, '/admin/buzon') ?? (esAdmin ? hrefAvisoAdmin(incoming) : null)))
          || (esAdmin ? '/admin/notificaciones' : '/admin/buzon')}
        onClose={dismissIncoming}
      />
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
