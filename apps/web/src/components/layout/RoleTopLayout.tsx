'use client';

import React from 'react';
import AppShell from '@/components/layout/AppShell';

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  badge?: string | number;
}

interface RoleTopLayoutProps {
  children: React.ReactNode;
  /** Nav items shown en el sidebar */
  navItems: NavItem[];
  /** Default username (overridden by 'userName' cookie) */
  userName?: string;
  /** Role label shown bajo el nombre, e.g. "Revisor Documental" */
  roleLabel: string;
  /** Subtítulo del panel, e.g. "Centro de Validación" */
  menuTitle?: string;
  /** Home link for the logo */
  homeHref: string;
  /** Notification items */
  notificationCount?: number;
  notifications?: Array<{
    id: string | number;
    asunto: string;
    mensaje?: string;
    tipo?: string;
    solicitud_id?: number | null;
    solicitud?: { id: number; folio: string } | null;
    created_at?: string;
    leida_at?: string;
  }>;
  /** Construye la ruta a la solicitud relacionada cuando el usuario abre la notificación */
  notificationSolicitudHref?: (solicitudId: number) => string;
  onMarkAsRead?: (id: string | number) => void | Promise<void>;
  onMarkAllAsRead?: () => void | Promise<void>;
  /** Link for "Ver todas" en el panel de notificaciones */
  notificationsHref?: string;
  /** Endpoint backend para search global. Si se omite, no se muestra search. */
  searchEndpoint?: string;
  /** Cómo construir el link al hacer click en un resultado de solicitud. */
  searchSolicitudHref?: (folio: string) => string;
}

/**
 * Panel de los 3 roles no-admin (revisor, evaluador, solicitante). Envoltura delgada
 * sobre el sidebar compartido — ver AppShell.tsx y docs/DISENO_UI.md §Panel.
 */
export default function RoleTopLayout({
  children,
  navItems,
  userName = '',
  roleLabel,
  menuTitle = 'Panel de Control',
  homeHref,
  notificationCount = 0,
  notifications = [],
  onMarkAsRead,
  onMarkAllAsRead,
  notificationsHref,
  notificationSolicitudHref,
  searchEndpoint,
  searchSolicitudHref,
}: RoleTopLayoutProps) {
  return (
    <AppShell
      homeHref={homeHref}
      groups={[{ items: navItems }]}
      userName={userName}
      roleLabel={roleLabel}
      panelTitle={menuTitle}
      notificationCount={notificationCount}
      notifications={notifications}
      onMarkAsRead={onMarkAsRead}
      onMarkAllAsRead={onMarkAllAsRead}
      notificationsHref={notificationsHref}
      notificationSolicitudHref={notificationSolicitudHref}
      searchEndpoint={searchEndpoint}
      searchSolicitudHref={searchSolicitudHref}
    >
      {children}
    </AppShell>
  );
}
