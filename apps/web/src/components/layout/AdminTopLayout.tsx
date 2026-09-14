'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Cookies from 'js-cookie';
import PageTransition from '@/components/ui/PageTransition';
import GlobalSearch from '@/components/admin/GlobalSearch';
import ThemeToggle from '@/components/ui/ThemeToggle';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import NotificationDetailModal, { type NotificationDetail } from '@/components/notifications/NotificationDetailModal';
import DualBranding from '@/components/branding/DualBranding';
import {
  LogOut, Bell, Menu, X, ChevronRight,
  LayoutDashboard, FileText, Users, BookOpen, Building,
  Banknote, ShieldAlert, Zap, Images, UserCheck,
  BarChart3, KeyRound, FileSignature, ClipboardList, BellRing, Activity
} from 'lucide-react';
import { INSTITUTION, copyrightLine } from '@/lib/institution';
import { useT } from '@/i18n/I18nProvider';
import { formatDate } from '@/lib/format';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  badge?: string | number;
}

interface NavGroup {
  group: string;
  items: NavItem[];
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

const NAV_GROUPS: NavGroup[] = [
  {
    group: 'Gestión Principal',
    items: [
      { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, description: 'Métricas y estadísticas generales' },
      { name: 'Programas', href: '/admin/programas', icon: Zap, description: 'Configuración de programas dinámicos' },
      { name: 'Convocatorias', href: '/admin/convocatorias', icon: BookOpen, description: 'Publicaciones y periodos de solicitud' },
      { name: 'Solicitudes', href: '/admin/solicitudes', icon: FileText, description: 'Seguimiento de solicitudes activas' },
    ],
  },
  {
    group: 'Operaciones',
    items: [
      { name: 'Ministraciones', href: '/admin/ministraciones', icon: Banknote, description: 'Control de pagos y tranches' },
      { name: 'Convenios', href: '/admin/convenios', icon: FileSignature, description: 'Convenios formales con empresas' },
      { name: 'Informes Finales', href: '/admin/informes', icon: ClipboardList, description: 'Revisión y aprobación de informes' },
      { name: 'Empresas', href: '/admin/empresas', icon: Building, description: 'Catálogo de empresas registradas' },
      { name: 'Evaluadores', href: '/admin/evaluadores', icon: BarChart3, description: 'Asignación y seguimiento' },
    ],
  },
  {
    group: 'Administración',
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
    group: 'Configuración',
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
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useT();
  const [localUserName, setLocalUserName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<NotificationDetail | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifsRef = useRef<HTMLDivElement>(null);
  const prevNotifCount = useRef(notificationCount);
  const [bellShake, setBellShake] = useState(false);

  useEffect(() => {
    if (notificationCount > prevNotifCount.current) {
      setBellShake(true);
      const t = setTimeout(() => setBellShake(false), 700);
      return () => clearTimeout(t);
    }
    prevNotifCount.current = notificationCount;
  }, [notificationCount]);

  useEffect(() => {
    setLocalUserName(Cookies.get('userName') || userName);
  }, [userName]);

  // Cerrar dropdowns con tecla Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setShowNotifs(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Close dropdowns on outside click (mousedown + touchstart para mobile)
  useEffect(() => {
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (notifsRef.current && !notifsRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, []);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    Cookies.remove('token');
    Cookies.remove('userRole');
    Cookies.remove('userName');
    router.push('/login');
  };

  const userInitial = localUserName.substring(0, 2).toUpperCase() || 'AD';

  const getActiveGroup = () => {
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        if (pathname.startsWith(item.href)) return group.group;
      }
    }
    return null;
  };

  const activeGroup = getActiveGroup();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col">
      {/* ── TOP BAR ── */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border-b border-neutral-100 dark:border-neutral-700 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8 h-16 flex items-center gap-4">

          {/* Logo */}
          <Link href="/admin/dashboard" className="flex items-center gap-3 shrink-0">
            <Image src="/logo.png" alt={INSTITUTION.name} width={46} height={36} priority className="h-9 w-auto object-contain" />
            <div className="hidden sm:block">
              <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-300 uppercase tracking-[0.15em] block leading-none">Sistema</span>
              <span className="text-sm font-extrabold text-primary leading-tight block">{INSTITUTION.name}</span>
            </div>
          </Link>

          {/* Divider */}
          <div className="h-7 w-px bg-neutral-200 dark:bg-neutral-700 mx-1 hidden md:block" />

          {/* ☰ Menu Toggle */}
          <div ref={menuRef} className="relative">
            <motion.button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 ${
                menuOpen
                  ? 'bg-primary text-white shadow-lg'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-primary/10 hover:text-primary'
              }`}
              whileTap={{ scale: 0.97 }}
            >
              <motion.div animate={{ rotate: menuOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
                {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </motion.div>
              <span className="hidden sm:block">{t('nav.menu')}</span>
              {activeGroup && !menuOpen && (
                <span className="hidden md:inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-300 font-normal">
                  · {activeGroup}
                </span>
              )}
            </motion.button>

            {/* Overlay inerte para cerrar al click fuera */}
            {menuOpen && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
            )}

            {/* ─── Mega Dropdown ─── */}
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="absolute left-0 top-[calc(100%+10px)] w-[680px] max-w-[90vw] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-100 dark:border-neutral-700 overflow-hidden z-50"
                >
                  {/* Dropdown header */}
                  <div className="px-6 py-4 bg-gradient-to-r from-primary to-[var(--brand-vino-700)] flex items-center justify-between">
                    <div>
                      <p className="text-white font-bold text-sm">{t('nav.control_panel')}</p>
                      <p className="text-white/60 text-xs">{t('nav.control_panel_hint')}</p>
                    </div>
                    <Image src="/logo.png" alt="" width={41} height={32} className="h-8 w-auto opacity-30 brightness-0 invert" />
                  </div>

                  {/* Groups grid */}
                  <div className="p-4 grid grid-cols-2 gap-4">
                    {NAV_GROUPS.map((group) => (
                      <div key={group.group}>
                        <p className="text-[10px] font-bold text-neutral-500 dark:text-neutral-300 uppercase tracking-widest mb-2 px-2">
                          {group.group}
                        </p>
                        <div className="space-y-0.5">
                          {group.items.map((item) => {
                            const isActive = pathname.startsWith(item.href);
                            const Icon = item.icon;
                            return (
                              <Link key={item.href} href={item.href}>
                                <motion.div
                                  whileHover={{ x: 3 }}
                                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors duration-150 group/item ${
                                    isActive
                                      ? 'bg-primary/10 text-primary'
                                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200'
                                  }`}
                                >
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                    isActive ? 'bg-primary text-white' : 'bg-neutral-100 dark:bg-neutral-800 group-hover/item:bg-primary/10 group-hover/item:text-primary'
                                  }`}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className={`text-sm font-semibold leading-none mb-0.5 ${isActive ? 'text-primary' : ''}`}>
                                      {item.name}
                                    </p>
                                    {item.description && (
                                      <p className="text-xs text-neutral-500 dark:text-neutral-300 truncate">{item.description}</p>
                                    )}
                                  </div>
                                  {isActive && (
                                    <ChevronRight className="w-3.5 h-3.5 text-primary ml-auto shrink-0" />
                                  )}
                                </motion.div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-3 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
                    <p className="text-xs text-neutral-500 dark:text-neutral-300">{INSTITUTION.name} · {INSTITUTION.state}</p>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-semibold transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      {t('common.logout')}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Search global */}
          <GlobalSearch />

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3">

            <LanguageSwitcher />
            <ThemeToggle />

            {/* Bell */}
            <div ref={notifsRef} className="relative">
              <motion.button
                type="button"
                onClick={() => setShowNotifs(!showNotifs)}
                aria-label={t('notifications.title')}
                aria-expanded={showNotifs}
                aria-haspopup="dialog"
                animate={bellShake ? { y: [0, -3, 0, -2, 0] } : { y: 0 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                className="relative p-2.5 rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-primary hover:bg-primary/[8%] transition-all duration-200"
              >
                <Bell className="w-5 h-5" />
                {notificationCount > 0 && (
                  <>
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-neutral-900 z-10"
                    />
                    <span aria-hidden="true" className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full glow-fade opacity-70" />
                  </>
                )}
              </motion.button>

              {/* Overlay inerte para cerrar al click fuera */}
              {showNotifs && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifs(false)}
                  aria-hidden="true"
                />
              )}

              <AnimatePresence>
                {showNotifs && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-[calc(100%+10px)] w-80 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-100 dark:border-neutral-700 overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-neutral-800 dark:text-neutral-100">{t('notifications.title')}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-500 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                          {t('notifications.unread_count', { count: notificationCount })}
                        </span>
                        {notificationCount > 0 && onMarkAllAsRead && (
                          <button
                            type="button"
                            onClick={() => onMarkAllAsRead()}
                            className="text-[10px] font-bold text-primary hover:text-[var(--brand-vino-700)] uppercase tracking-wider"
                          >
                            {t('notifications.mark_all_read')}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-neutral-50 dark:divide-neutral-800">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-sm text-neutral-500 dark:text-neutral-300">{t('notifications.empty')}</div>
                      ) : (
                        notifications.map((n, i) => {
                          const isUnread = !n.leida_at;
                          return (
                            <button
                              type="button"
                              key={n.id ?? i}
                              onClick={() => {
                                setSelectedNotif(n as NotificationDetail);
                                setShowNotifs(false);
                                if (isUnread) onMarkAsRead?.(n.id);
                              }}
                              className={`w-full text-left p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer ${isUnread ? 'bg-amber-50/40 dark:bg-amber-900/20' : ''}`}
                            >
                              <div className="flex items-start gap-2">
                                {isUnread && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 leading-snug">{n.asunto}</p>
                                  {n.mensaje && <p className="text-xs text-neutral-500 dark:text-neutral-300 mt-0.5 line-clamp-1">{n.mensaje}</p>}
                                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
                                    {formatDate(n.created_at)}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                    <Link href="/admin/notificaciones" onClick={() => setShowNotifs(false)}>
                      <div className="p-3 text-center text-xs font-bold text-primary hover:bg-primary/5 transition-colors cursor-pointer border-t border-neutral-100 dark:border-neutral-700">
                        Ver todas →
                      </div>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Divider */}
            <div className="h-7 w-px bg-neutral-200 dark:bg-neutral-700" />

            {/* User avatar + name */}
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-50 leading-none">{localUserName}</p>
                <p className="text-[11px] text-accent dark:text-amber-300 font-semibold uppercase tracking-wider mt-0.5">{t('roles.admin')}</p>
              </div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-[var(--brand-vino-700)] text-white flex items-center justify-center font-bold text-sm shadow-md shadow-primary/20"
              >
                {userInitial}
              </motion.div>
            </div>

            {/* Logout button */}
            <button
              type="button"
              onClick={handleLogout}
              aria-label={t('common.logout')}
              title={t('common.logout')}
              className="hidden md:flex p-2.5 rounded-xl text-neutral-500 dark:text-neutral-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── Breadcrumb / Active section bar ─── */}
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8 h-10 flex items-center gap-2 border-t border-neutral-50 dark:border-neutral-800">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {NAV_GROUPS.map((group) =>
              group.items.map((item) => {
                if (!pathname.startsWith(item.href)) return null;
                const Icon = item.icon;
                return (
                  <React.Fragment key={item.href}>
                    <span className="text-xs text-neutral-500 dark:text-neutral-300">{group.group}</span>
                    <ChevronRight className="w-3 h-3 text-neutral-300 dark:text-neutral-500" />
                    <div className="flex items-center gap-1.5 bg-primary/[8%] text-primary px-3 py-1 rounded-full">
                      <Icon className="w-3 h-3" />
                      <span className="text-xs font-semibold whitespace-nowrap">{item.name}</span>
                    </div>
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>
      </header>

      {/* ── CONTENT ── */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 md:px-8 py-8">
        <PageTransition>
          {children}
        </PageTransition>
      </main>

      {/* Notification detail modal */}
      <NotificationDetailModal
        notification={selectedNotif}
        onClose={() => setSelectedNotif(null)}
        solicitudHrefPattern={(id) => `/admin/solicitudes?id=${id}`}
      />

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 py-4 px-8 flex items-center justify-between gap-4 max-w-screen-2xl mx-auto w-full">
        <DualBranding size="sm" />
        <div className="flex flex-col items-end gap-0.5">
          <p className="text-xs text-neutral-500 dark:text-neutral-300">{copyrightLine()}</p>
          <p className="text-xs text-neutral-400 dark:text-neutral-400">{INSTITUTION.systemTagline}</p>
        </div>
      </footer>
    </div>
  );
}
