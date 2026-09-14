'use client';

import React from 'react';
import AppShell, { type AppNavGroup } from '@/components/layout/AppShell';
import {
  LayoutDashboard, FileText, Users, BookOpen, Building,
  Banknote, ShieldAlert, Zap, Images, UserCheck,
  BarChart3, KeyRound, FileSignature, ClipboardList, BellRing, Activity
} from 'lucide-react';
import { useT } from '@/i18n/I18nProvider';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  badge?: string | number;
}

interface AdminTopLayoutProps {
  children: React.ReactNode;
  userName?: string;
  navItems: NavItem[];
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
  onMarkAsRead?: (id: string | number) => void | Promise<void>;
  onMarkAllAsRead?: () => void | Promise<void>;
}

const NAV_GROUPS: AppNavGroup[] = [
  {
    label: 'Gestión Principal',
    items: [
      { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, description: 'Métricas y estadísticas generales' },
      { name: 'Programas', href: '/admin/programas', icon: Zap, description: 'Configuración de programas dinámicos' },
      { name: 'Convocatorias', href: '/admin/convocatorias', icon: BookOpen, description: 'Publicaciones y periodos de solicitud' },
      { name: 'Solicitudes', href: '/admin/solicitudes', icon: FileText, description: 'Seguimiento de solicitudes activas' },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { name: 'Ministraciones', href: '/admin/ministraciones', icon: Banknote, description: 'Control de pagos y tranches' },
      { name: 'Convenios', href: '/admin/convenios', icon: FileSignature, description: 'Convenios formales con empresas' },
      { name: 'Informes Finales', href: '/admin/informes', icon: ClipboardList, description: 'Revisión y aprobación de informes' },
      { name: 'Empresas', href: '/admin/empresas', icon: Building, description: 'Catálogo de empresas registradas' },
      { name: 'Evaluadores', href: '/admin/evaluadores', icon: BarChart3, description: 'Asignación y seguimiento' },
    ],
  },
  {
    label: 'Administración',
    items: [
      { name: 'Usuarios', href: '/admin/usuarios', icon: Users, description: 'Gestión de cuentas y roles' },
      { name: 'Notificaciones', href: '/admin/notificaciones', icon: BellRing, description: 'Historial de correos y alertas' },
      { name: 'Solicitudes de Acceso', href: '/admin/solicitudes-acceso', icon: UserCheck, description: 'Nuevos registros pendientes' },
      { name: 'Recuperación Contraseñas', href: '/admin/reset-requests', icon: KeyRound, description: 'Solicitudes de restablecimiento' },
      { name: 'Lista Negra', href: '/admin/lista-negra', icon: ShieldAlert, description: 'Empresas con restricción' },
      { name: 'Bitácora de Auditoría', href: '/admin/audit-logs', icon: Activity, description: 'Registro de acciones por usuario' },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { name: 'Carrusel Login', href: '/admin/carrusel', icon: Images, description: 'Slides de la pantalla de inicio' },
    ],
  },
];

export default function AdminTopLayout({
  children,
  userName = '',
  notificationCount = 0,
  notifications = [],
  onMarkAsRead,
  onMarkAllAsRead,
}: AdminTopLayoutProps) {
  const { t } = useT();

  return (
    <AppShell
      homeHref="/admin/dashboard"
      groups={NAV_GROUPS}
      userName={userName}
      roleLabel={t('roles.admin')}
      panelTitle={t('nav.control_panel')}
      notificationCount={notificationCount}
      notifications={notifications}
      onMarkAsRead={onMarkAsRead}
      onMarkAllAsRead={onMarkAllAsRead}
      notificationsHref="/admin/notificaciones"
      notificationSolicitudHref={(id) => `/admin/solicitudes?id=${id}`}
      searchEndpoint="/admin/search"
    >
      {children}
    </AppShell>
  );
}
