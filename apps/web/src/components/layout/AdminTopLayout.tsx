'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { hrefAvisoAdmin, hrefBuzon } from '@/lib/notificaciones';
import { motion, AnimatePresence } from 'framer-motion';
import Cookies from 'js-cookie';
import { cerrarSesion } from '@/lib/logout';
import PageTransition from '@/components/ui/PageTransition';
import GlobalSearch from '@/components/admin/GlobalSearch';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import NotificationDetailModal, { type NotificationDetail } from '@/components/notifications/NotificationDetailModal';
import PanelFooter from '@/components/layout/PanelFooter';
import {
  LogOut, Bell, Menu, X, ChevronRight,
  LayoutDashboard, FileText, Users, BookOpen, Building,
  Banknote, ShieldAlert, Zap, Images, UserCheck,
  BarChart3, KeyRound, FileSignature, ClipboardList, BellRing, Activity,
  MessagesSquare, Award, CalendarRange, FileCog, UserCircle, Globe,
} from 'lucide-react';
import UserAvatar from '@/components/ui/user-avatar';
import { useMiPerfil } from '@/hooks/useMiPerfil';
import { useRol } from '@/hooks/useRol';
import { subrutaPermitida } from '@/lib/roles';
import { INSTITUTION } from '@/lib/institution';
import { LOGO_COMECYT } from '@/lib/identidad';
import { useT } from '@/i18n/I18nProvider';
import { formatDate } from '@/lib/format';
import { usePanelScope } from '@/hooks/usePanelScope';
import { useBloqueoScroll } from '@/hooks/useBloqueoScroll';

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

/** Tono pastel del chip de cada grupo del menú (v3, sin saturar). */
const MENU_TONES = ['lavender', 'powder', 'mint', 'butter'] as const;

/**
 * E50 (28/09/2026): `group`, `name` y `description` son CLAVES del diccionario (i18n/messages/*.json, sección
 * `admin_nav`); se traducen al pintar con `t()`. Página nueva del admin = entrada aquí + su clave en es.json y en.json.
 */
const NAV_GROUPS: NavGroup[] = [
  {
    group: 'admin_nav.groups.gestion',
    items: [
      { name: 'admin_nav.items.dashboard.name', href: '/admin/dashboard', icon: LayoutDashboard, description: 'admin_nav.items.dashboard.desc' },
      { name: 'admin_nav.items.programas.name', href: '/admin/programas', icon: Zap, description: 'admin_nav.items.programas.desc' },
      { name: 'admin_nav.items.convocatorias.name', href: '/admin/convocatorias', icon: BookOpen, description: 'admin_nav.items.convocatorias.desc' },
      { name: 'admin_nav.items.solicitudes.name', href: '/admin/solicitudes', icon: FileText, description: 'admin_nav.items.solicitudes.desc' },
      { name: 'admin_nav.items.folios.name', href: '/admin/folios', icon: Award, description: 'admin_nav.items.folios.desc' },
    ],
  },
  {
    group: 'admin_nav.groups.operaciones',
    items: [
      { name: 'admin_nav.items.ministraciones.name', href: '/admin/ministraciones', icon: Banknote, description: 'admin_nav.items.ministraciones.desc' },
      { name: 'admin_nav.items.convenios.name', href: '/admin/convenios', icon: FileSignature, description: 'admin_nav.items.convenios.desc' },
      { name: 'admin_nav.items.informes.name', href: '/admin/informes', icon: ClipboardList, description: 'admin_nav.items.informes.desc' },
      { name: 'admin_nav.items.empresas.name', href: '/admin/empresas', icon: Building, description: 'admin_nav.items.empresas.desc' },
      { name: 'admin_nav.items.evaluadores.name', href: '/admin/evaluadores', icon: BarChart3, description: 'admin_nav.items.evaluadores.desc' },
      { name: 'admin_nav.items.buzon.name', href: '/admin/buzon', icon: MessagesSquare, description: 'admin_nav.items.buzon.desc' },
    ],
  },
  {
    group: 'admin_nav.groups.administracion',
    items: [
      { name: 'admin_nav.items.usuarios.name', href: '/admin/usuarios', icon: Users, description: 'admin_nav.items.usuarios.desc' },
      { name: 'admin_nav.items.notificaciones.name', href: '/admin/notificaciones', icon: BellRing, description: 'admin_nav.items.notificaciones.desc' },
      { name: 'admin_nav.items.solicitudes_acceso.name', href: '/admin/solicitudes-acceso', icon: UserCheck, description: 'admin_nav.items.solicitudes_acceso.desc' },
      { name: 'admin_nav.items.reset_requests.name', href: '/admin/reset-requests', icon: KeyRound, description: 'admin_nav.items.reset_requests.desc' },
      { name: 'admin_nav.items.lista_negra.name', href: '/admin/lista-negra', icon: ShieldAlert, description: 'admin_nav.items.lista_negra.desc' },
      { name: 'admin_nav.items.audit_logs.name', href: '/admin/audit-logs', icon: Activity, description: 'admin_nav.items.audit_logs.desc' },
    ],
  },
  {
    group: 'admin_nav.groups.configuracion',
    items: [
      { name: 'admin_nav.items.sitio.name', href: '/admin/sitio', icon: Globe, description: 'admin_nav.items.sitio.desc' },
      { name: 'admin_nav.items.carrusel.name', href: '/admin/carrusel', icon: Images, description: 'admin_nav.items.carrusel.desc' },
      { name: 'admin_nav.items.periodos.name', href: '/admin/periodos', icon: CalendarRange, description: 'admin_nav.items.periodos.desc' },
      { name: 'admin_nav.items.documentos_fijos.name', href: '/admin/documentos-fijos', icon: FileCog, description: 'admin_nav.items.documentos_fijos.desc' },
      { name: 'admin_nav.items.cuenta.name', href: '/admin/cuenta', icon: UserCircle, description: 'admin_nav.items.cuenta.desc' },
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
  usePanelScope();
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
  // 25/09/2026: con el menú o los avisos abiertos en el teléfono, la página de atrás no se desplaza.
  useBloqueoScroll(menuOpen || showNotifs);

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

  // Cierre de sesión real: invalida el JWT en el backend y limpia cachés (lib/logout.ts).
  const handleLogout = () => {
    void cerrarSesion();
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
  // E45: el menú muestra solo lo que el rol puede abrir (mismo criterio que proxy.ts; el backend decide los datos).
  const { rol } = useRol();
  const { perfil } = useMiPerfil();
  const grupos = NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((i) => rol === 'admin' || (rol !== '' && subrutaPermitida(rol, i.href))) }))
    .filter((g) => g.items.length > 0);
  // Cada sección toma el pastel de su grupo en el menú: el marco de la vista y el chip del menú casan.
  const activeGroupIndex = NAV_GROUPS.findIndex((g) => g.group === activeGroup);
  const sectionTone = MENU_TONES[Math.max(0, activeGroupIndex) % MENU_TONES.length];

  return (
    // `panel-root`: alcance del sistema visual SIGAE (styles/panel-sigae.css). La estructura del menú no cambia (E26).
    <div className="panel-root min-h-screen flex flex-col">
      {/* Salpicaduras de color muy tenues al fondo (landing + referencia Aboard): vino, cielo y menta. */}
      <div className="panel-splash" aria-hidden="true"><span /><span /><span /></div>
      {/* ── TOP BAR ── */}
      {/* Barra flotante en píldora, como la de la landing (v3). Menú, búsqueda, avisos y sesión: sin cambios de lógica. */}
      <header className="panel-topbar sticky z-50">
        <div className="panel-topbar-row h-16 flex items-center gap-2 sm:gap-3">

          {/* Logo (recortado, mismo que la landing) + marca SIGAE */}
          <Link href="/admin/dashboard" className="panel-brand flex items-center gap-3 shrink-0" title={`SIGAE — ${t('footer.system_name')}`}>
            <Image src={LOGO_COMECYT.color.src} alt={LOGO_COMECYT.color.alt} width={LOGO_COMECYT.color.ancho} height={LOGO_COMECYT.color.alto} priority className="h-10 w-auto object-contain" />
            <div className="hidden lg:block">
              <span className="panel-brand-name">SIGAE<span className="panel-swatch" aria-hidden="true" /></span>
              <span className="panel-brand-sub">{t('nav.brand_sub')}</span>
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
              {activeGroup && !menuOpen && (
                <span className="panel-menu-seccion hidden lg:inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-300 font-normal">
                  · {t(activeGroup)}
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

            {/* ─── Menú v3 (24/09/2026): tarjeta flotante clara, grupos con chip pastel, activo en vino ─── */}
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.12 } }}
                  transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                  style={{ transformOrigin: 'top left' }}
                  className="panel-menu absolute left-0 top-[calc(100%+12px)] w-[780px] max-w-[92vw] z-50 max-md:fixed max-md:left-3 max-md:right-3 max-md:top-[5.5rem] max-md:w-auto max-md:max-w-none max-md:max-h-[calc(100dvh-6.5rem)] max-md:overflow-y-auto"
                  role="dialog"
                  aria-label={t('nav.control_panel')}
                >
                  <div className="panel-menu-head">
                    <div className="min-w-0">
                      <p className="panel-hero-pill !mb-2"><span aria-hidden="true" />{t(`roles.${rol || 'admin'}`)}</p>
                      <p className="panel-menu-title">{t('nav.control_panel')}</p>
                      <p className="panel-menu-hint">{t('nav.control_panel_hint')}</p>
                    </div>
                    <Image src={LOGO_COMECYT.color.src} alt="" width={LOGO_COMECYT.color.ancho} height={LOGO_COMECYT.color.alto} className="hidden sm:block h-12 w-auto" />
                  </div>

                  <div className="panel-menu-body">
                    {grupos.map((group, gi) => (
                      <section key={group.group} className="panel-menu-group" data-pastel={MENU_TONES[gi % MENU_TONES.length]}>
                        <p className="panel-menu-label">{t(group.group)}</p>
                        <ul className="space-y-0.5">
                          {group.items.map((item) => {
                            const isActive = pathname.startsWith(item.href);
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
                                    <span className="panel-menu-name">{t(item.name)}</span>
                                    {item.description && <span className="panel-menu-desc">{t(item.description)}</span>}
                                  </span>
                                  <ChevronRight className="panel-menu-go w-4 h-4" aria-hidden="true" />
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    ))}
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

          {/* Search global */}
          <GlobalSearch />

          {/* Right side */}
          <div className="ml-auto flex items-center gap-1 sm:gap-3">

            <LanguageSwitcher />

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
                    className="panel-notifs absolute right-0 top-[calc(100%+10px)] w-80 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-100 dark:border-neutral-700 overflow-hidden z-50 max-md:fixed max-md:left-3 max-md:right-3 max-md:top-[5.5rem] max-md:w-auto max-md:max-w-none"
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
                                setShowNotifs(false);
                                if (isUnread) onMarkAsRead?.(n.id);
                                // Aviso del buzón → directo a su hilo (E45); el resto abre el detalle.
                                const destino = hrefBuzon(n as NotificationDetail, '/admin/buzon') ?? hrefAvisoAdmin(n as NotificationDetail);
                                if (destino) router.push(destino);
                                else setSelectedNotif(n as NotificationDetail);
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
                        {t('notifications.view_all')}
                      </div>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Divider */}
            <div className="h-7 w-px bg-neutral-200 dark:bg-neutral-700 hidden sm:block" />

            {/* User avatar + name */}
            <Link href="/admin/cuenta" className="panel-user flex items-center gap-3 group rounded-full" title={t('nav.my_account')}>
              <div className="hidden lg:block text-right">
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-50 leading-none">{perfil?.name ?? localUserName}</p>
                <p className="text-[11px] text-accent dark:text-amber-300 font-semibold uppercase tracking-wider mt-0.5">{t(`roles.${rol || 'admin'}`)}</p>
              </div>
              {/* E45: la foto de perfil identifica al usuario en la barra (iniciales si no tiene). */}
              <UserAvatar user={perfil ?? { name: localUserName || userInitial }} size="sm" />
            </Link>

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

      </header>

      {/* ── CONTENT ── */}
      <main className="panel-main flex-1 mx-auto w-full px-4 md:px-8" data-section-tone={sectionTone}>
        {/* ─── Breadcrumb / Active section bar ─── */}
        <nav aria-label={t('nav.breadcrumb')} className="panel-crumbs">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {NAV_GROUPS.map((group) =>
              group.items.map((item) => {
                if (!pathname.startsWith(item.href)) return null;
                const Icon = item.icon;
                return (
                  <React.Fragment key={item.href}>
                    <span className="text-xs text-neutral-500 dark:text-neutral-300">{t(group.group)}</span>
                    <ChevronRight className="w-3 h-3 text-neutral-300 dark:text-neutral-500" />
                    <div className="flex items-center gap-1.5 bg-primary/[8%] text-primary px-3 py-1 rounded-full">
                      <Icon className="w-3 h-3" />
                      <span className="text-xs font-semibold whitespace-nowrap">{t(item.name)}</span>
                    </div>
                  </React.Fragment>
                );
              })
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
        solicitudHrefPattern={(id) => `/admin/solicitudes?id=${id}`}
      />

      {/* Pie común de los paneles (E43) */}
      <PanelFooter />
    </div>
  );
}
