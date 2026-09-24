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
import PanelFooter from '@/components/layout/PanelFooter';
import { LogOut, Bell, Menu, X, ChevronRight } from 'lucide-react';
import { INSTITUTION } from '@/lib/institution';
import { useT } from '@/i18n/I18nProvider';
import { formatDate } from '@/lib/format';
import { usePanelScope } from '@/hooks/usePanelScope';

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  badge?: string | number;
}

interface RoleTopLayoutProps {
  children: React.ReactNode;
  /** Nav items shown in the dropdown menu */
  navItems: NavItem[];
  /** Default username (overridden by 'userName' cookie) */
  userName?: string;
  /** Role label shown under the user's name, e.g. "Revisor Documental" */
  roleLabel: string;
  /** Subtitle shown inside the dropdown header, e.g. "Centro de Validación" */
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
  /** Mark a single notification as read */
  onMarkAsRead?: (id: string | number) => void | Promise<void>;
  /** Mark all notifications as read */
  onMarkAllAsRead?: () => void | Promise<void>;
  /** Link for "Ver todas" in notifications panel */
  notificationsHref?: string;
  /** Endpoint backend para search global. Si se omite, no se muestra search. */
  searchEndpoint?: string;
  /** Cómo construir el link al hacer click en un resultado de solicitud. */
  searchSolicitudHref?: (folio: string) => string;
}

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
  usePanelScope();
  // Pastel de la sección por rol (el mismo de su dashboard): solicitante blush, revisor menta, evaluador mantequilla.
  const sectionTone = homeHref.startsWith('/revisor') ? 'mint' : homeHref.startsWith('/evaluador') ? 'butter' : 'blush';
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

  // Bell shake cuando llega una notificación nueva (count incrementa)
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

  // Cerrar dropdowns con tecla Escape (accesibilidad / UX)
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

  const userInitial = localUserName.substring(0, 2).toUpperCase() || roleLabel.substring(0, 2).toUpperCase();

  // Best-match: el item cuyo href sea el prefijo MÁS LARGO de la ruta actual.
  // Evita que `/solicitante/solicitudes/nueva` matchee con `/solicitante/solicitudes`
  // si existe un item más específico como `/solicitante/solicitudes/nueva`.
  const activeItem = navItems
    .filter((item) => pathname === item.href || pathname.startsWith(item.href + '/') || pathname.startsWith(item.href + '?'))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    // `panel-root`: alcance del sistema visual SIGAC (styles/panel-sigac.css). La estructura del menú no cambia (E26).
    <div className="panel-root min-h-screen flex flex-col">
      {/* Salpicaduras de color muy tenues al fondo (landing + referencia Aboard): vino, cielo y menta. */}
      <div className="panel-splash" aria-hidden="true"><span /><span /><span /></div>
      {/* ── TOP BAR ── */}
      {/* Barra flotante en píldora, como la de la landing (v3). Menú, búsqueda, avisos y sesión: sin cambios de lógica. */}
      <header className="panel-topbar sticky z-50">
        <div className="panel-topbar-row h-16 flex items-center gap-2 sm:gap-3">

          {/* Logo (recortado, mismo que la landing) + marca SIGAC */}
          <Link href={homeHref} className="panel-brand flex items-center gap-3 shrink-0" title="SIGAC — Sistema de Gestión de Apoyos Científicos">
            <Image src="/logo-recortado.png" alt={INSTITUTION.name} width={99} height={44} priority className="h-10 w-auto object-contain" />
            <div className="hidden sm:block">
              <span className="panel-brand-name">SIGAC<span className="panel-swatch" aria-hidden="true" /></span>
              <span className="panel-brand-sub">Gestión de Apoyos Científicos</span>
            </div>
          </Link>

          {/* Divider */}
          <div className="h-7 w-px bg-neutral-200 dark:bg-neutral-700 mx-1 hidden md:block" />

          {/* ☰ Menu Toggle */}
          <div ref={menuRef} className="relative">
            <motion.button
              aria-label={t('nav.menu')}
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
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
              {activeItem && !menuOpen && (
                <span className="hidden md:inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-300 font-normal">
                  · {activeItem.name}
                </span>
              )}
            </motion.button>

            {/* Overlay inerte: captura clicks fuera del dropdown y cierra el menú.
                Backup confiable cuando el mousedown del document no llega por
                stacking-context / overlays modales. */}
            {menuOpen && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
            )}

            {/* ─── Menú v3 (24/09/2026): tarjeta flotante clara, opciones con chip pastel, activo en vino ─── */}
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.12 } }}
                  transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                  style={{ transformOrigin: 'top left' }}
                  className="panel-menu absolute left-0 top-[calc(100%+12px)] w-[460px] max-w-[92vw] z-50 max-md:fixed max-md:left-3 max-md:right-3 max-md:top-[5.5rem] max-md:w-auto max-md:max-w-none max-md:max-h-[calc(100dvh-6.5rem)] max-md:overflow-y-auto"
                  role="dialog"
                  aria-label={menuTitle}
                >
                  <div className="panel-menu-head">
                    <div className="min-w-0">
                      <p className="panel-hero-pill !mb-2"><span aria-hidden="true" />{roleLabel}</p>
                      <p className="panel-menu-title">{menuTitle}</p>
                    </div>
                    <Image src="/logo-recortado.png" alt="" width={99} height={44} className="hidden sm:block h-10 w-auto opacity-90" />
                  </div>

                  <div className="panel-menu-body !grid-cols-1">
                    <section className="panel-menu-group" data-pastel="lavender">
                      <ul className="space-y-0.5">
                        {navItems.map((item) => {
                          const isActive = activeItem?.href === item.href;
                          const Icon = item.icon;
                          return (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                className="panel-menu-item"
                                data-active={isActive ? 'true' : undefined}
                                aria-current={isActive ? 'page' : undefined}
                                onClick={() => setMenuOpen(false)}
                              >
                                <span className="panel-menu-icon" aria-hidden="true"><Icon className="w-4 h-4" /></span>
                                <span className="min-w-0 flex-1">
                                  <span className="panel-menu-name">{item.name}</span>
                                  {item.description && <span className="panel-menu-desc">{item.description}</span>}
                                </span>
                                {item.badge ? (
                                  <span className="pill" data-tone="vino">{item.badge}</span>
                                ) : (
                                  <ChevronRight className="panel-menu-go w-4 h-4" aria-hidden="true" />
                                )}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  </div>

                  <div className="panel-menu-foot">
                    <p>{INSTITUTION.name} · {INSTITUTION.state}</p>
                    <button type="button" onClick={handleLogout} className="panel-menu-logout">
                      <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                      {t('common.logout')}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Search global (opcional, depende del rol) */}
          {searchEndpoint && (
            <GlobalSearch endpoint={searchEndpoint} solicitudHrefPattern={searchSolicitudHref} />
          )}

          {/* Right side */}
          <div className="ml-auto flex items-center gap-1 sm:gap-3">

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
                    {/* Glow-fade en lugar de animate-ping — más sutil */}
                    <span aria-hidden="true" className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full glow-fade opacity-70" />
                  </>
                )}
              </motion.button>

              {/* Overlay inerte para cerrar al click fuera (defensa en profundidad) */}
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
                    className="absolute right-0 top-[calc(100%+10px)] w-80 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-100 dark:border-neutral-700 overflow-hidden z-50"
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
                                  <p className="text-[10px] text-neutral-500 dark:text-neutral-300 mt-1">
                                    {formatDate(n.created_at)}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                    {notificationsHref && (
                      <Link href={notificationsHref} onClick={() => setShowNotifs(false)}>
                        <div className="p-3 text-center text-xs font-bold text-primary hover:bg-primary/5 transition-colors cursor-pointer border-t border-neutral-100 dark:border-neutral-700">
                          Ver todas →
                        </div>
                      </Link>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Divider */}
            <div className="h-7 w-px bg-neutral-200 dark:bg-neutral-700 hidden sm:block" />

            {/* User avatar + name */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-50 leading-none">{localUserName}</p>
                <p className="text-[11px] text-accent dark:text-amber-300 font-semibold uppercase tracking-wider mt-0.5">{roleLabel}</p>
              </div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-[var(--brand-vino-700)] text-white flex items-center justify-center font-bold text-sm shadow-md shadow-primary/20"
              >
                {userInitial}
              </motion.div>
            </div>

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              aria-label={t('common.logout')}
              className="hidden md:flex p-2.5 rounded-xl text-neutral-500 dark:text-neutral-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
              title={t('common.logout')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

      </header>

      {/* ── CONTENT ── */}
      <main className="panel-main flex-1 mx-auto w-full px-4 md:px-8" data-section-tone={sectionTone}>
        {/* ─── Breadcrumb / Active item bar ─── */}
        <nav aria-label="Ubicación" className="panel-crumbs">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {activeItem ? (
              <>
                <span className="text-xs text-neutral-500 dark:text-neutral-300">{roleLabel}</span>
                <ChevronRight className="w-3 h-3 text-neutral-300 dark:text-neutral-500" />
                <div className="flex items-center gap-1.5 bg-primary/[8%] text-primary px-3 py-1 rounded-full">
                  <activeItem.icon className="w-3 h-3" />
                  <span className="text-xs font-semibold whitespace-nowrap">{activeItem.name}</span>
                </div>
              </>
            ) : (
              <span className="text-xs text-neutral-500 dark:text-neutral-300">{roleLabel} · {INSTITUTION.name}</span>
            )}
          </div>
        </nav>
        <PageTransition>
          {children}
        </PageTransition>
      </main>

      {/* Notification detail modal */}
      <NotificationDetailModal
        notification={selectedNotif}
        onClose={() => setSelectedNotif(null)}
        solicitudHrefPattern={notificationSolicitudHref}
      />

      {/* Pie común de los paneles (E43) */}
      <PanelFooter />
    </div>
  );
}
