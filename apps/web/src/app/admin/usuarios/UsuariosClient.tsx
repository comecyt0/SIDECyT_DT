'use client';

import { useState, useEffect, Children, cloneElement, isValidElement, type ReactElement } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StepFrame from '@/components/ui/step-frame';
import {
  Edit, Trash2, UserPlus, Users,
  Mail, UserCircle, Lock, Briefcase, Phone, Building2, ShieldCheck, IdCard, CalendarDays, Search
} from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import api from '@/lib/api';
import type { User, Rol, Empresa } from '@/types/api';
import { AlertBox } from '@/components/ui/alert-box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import PaginationControls from '@/components/ui/pagination-controls';
import { DataCardGrid } from '@/components/ui/DataCardGrid';
import UserAvatar from '@/components/ui/user-avatar';
import AvisoErrores from '@/components/ui/aviso-errores';
import { erroresFormulario, type ErroresFormulario } from '@/lib/errores-formulario';
import { PASSWORD_HINT, validarPassword } from '@/lib/password-policy';
import { BotonVerContrasena, SemaforoContrasena } from '@/components/ui/campo-contrasena';
import { conAsterisco } from '@/components/ui/obligatorio';
import { PATRON_CORREO } from '@/lib/registro';
import { limpiarCurp, nombrePropio, problemaNombre, revisarIdentidad } from '@/lib/curp';

/** Nombre visible y paso de cada campo: los errores del servidor se muestran así y regresan al paso correcto. */
const ETIQUETA_CAMPO: Record<string, string> = {
  name: 'Nombre completo', nombres: 'Nombre(s)', primer_apellido: 'Primer apellido', segundo_apellido: 'Segundo apellido',
  curp: 'CURP', fecha_nacimiento: 'Fecha de nacimiento', email: 'Correo electrónico', password: 'Contraseña', password_confirmation: 'Confirmar contraseña', rol_id: 'Papel en el sistema',
  empresa_id: 'Institución', cargo: 'Cargo', telefono: 'Teléfono', activo: 'Puede entrar al sistema',
  convocatoria_ids: 'Convocatorias a su cargo', periodo_ids: 'Periodos visibles',
};
const PASO_CAMPO: Record<string, string> = {
  name: 'cuenta', nombres: 'cuenta', primer_apellido: 'cuenta', segundo_apellido: 'cuenta', curp: 'cuenta', fecha_nacimiento: 'cuenta', curp_revision: 'cuenta', email: 'cuenta', password: 'cuenta', password_confirmation: 'cuenta', rol_id: 'papel', empresa_id: 'papel', cargo: 'papel',
  telefono: 'papel', activo: 'papel', convocatoria_ids: 'alcance', periodo_ids: 'alcance',
};

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

/** Campo con etiqueta fija arriba + ícono dentro — mismo patrón que "Solicitar acceso".
 * Clona el hijo (input/select) para inyectarle el `id` y asociar el label (axe: regla `label`). */
function FField({
  id,
  icon: Icon,
  label,
  error,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  const kids = Children.map(children, (child) =>
    isValidElement(child) && (child.type === 'input' || child.type === 'select')
      ? cloneElement(child as ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>, {
          id,
          'aria-invalid': error ? true : undefined,
          'aria-describedby': error ? `${id}-error` : undefined,
        })
      : child
  );
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest flex items-center gap-1.5">
        {conAsterisco(label)}
      </label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--app-ink-2)] pointer-events-none" aria-hidden="true" />
        {kids}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs" style={{ color: 'var(--auth-danger)' }}>
          {error}
        </p>
      )}
    </div>
  );
}

interface Props {
  users: User[];
  pagination: PaginationMeta;
  /** E83: total por tipo de cuenta, tipo elegido y búsqueda. */
  porRol?: Record<string, number>;
  rolId?: string;
  busqueda?: string;
}

export default function UsuariosClient({ users, pagination, porRol = {}, rolId = '', busqueda = '' }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [catalogs, setCatalogs] = useState<{ roles: Rol[]; instituciones: Empresa[] }>({ roles: [], instituciones: [] });
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [verPass, setVerPass] = useState(false);
  // 15/10/2026 (pedido del usuario): confirmar la contraseña con su propio ojo
  const [confPass, setConfPass] = useState('');
  const [verConf, setVerConf] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Error al guardar: se muestra DENTRO de la ventana y regresa al paso del campo (antes quedaba detrás del modal).
  const [errorGuardar, setErrorGuardar] = useState<ErroresFormulario | null>(null);
  const [feedback, setFeedback] = useState<{type: 'error'|'success'|'info'|'warning', message: string}|null>(null);
  const [confirmState, setConfirmState] = useState<{open: boolean, action: () => void, title: string, description: string}>({open: false, action: () => {}, title: '', description: ''});

  const [formData, setFormData] = useState({
    name: '',
    // E76: nombre por partes; CURP y fecha opcionales al dar de alta (se verifican si se escriben).
    nombres: '',
    primer_apellido: '',
    segundo_apellido: '',
    curp: '',
    fecha_nacimiento: '',
    curp_revision: false,
    email: '',
    password: '',
    rol_id: '',
    empresa_id: '',
    telefono: '',
    cargo: '',
    activo: true,
    // E45: alcance — convocatorias (admin de convocatoria) y periodos (roles con alcance por periodo).
    convocatoria_ids: [] as number[],
    periodo_ids: [] as number[],
  });
  const [convocatoriasOp, setConvocatoriasOp] = useState<{ id: number; nombre: string }[]>([]);
  const [periodosOp, setPeriodosOp] = useState<{ id: number; nombre: string }[]>([]);
  useEffect(() => {
    Promise.all([
      api.get('/admin/convocatorias').catch(() => ({ data: [] })),
      api.get('/admin/periodos').catch(() => ({ data: [] })),
    ]).then(([c, p]) => {
      setConvocatoriasOp(Array.isArray(c.data) ? c.data.map((x: { id: number; nombre: string }) => ({ id: x.id, nombre: x.nombre })) : []);
      setPeriodosOp(Array.isArray(p.data) ? p.data.map((x: { id: number; nombre: string }) => ({ id: x.id, nombre: x.nombre })) : []);
    });
  }, []);
  // E76: alta y cuentas con nombre por partes → tres campos; cuentas anteriores al validador → nombre completo.
  const porPartes = !editingUser || !!editingUser.nombres;
  const revisionCurp = revisarIdentidad({
    nombres: formData.nombres, primer_apellido: formData.primer_apellido, segundo_apellido: formData.segundo_apellido,
    sin_segundo: !formData.segundo_apellido.trim(), fecha_nacimiento: formData.fecha_nacimiento, curp: formData.curp, curp_revision: formData.curp_revision,
  });
  const rolSlug = catalogs.roles.find((r) => String(r.id) === formData.rol_id)?.slug ?? '';
  // E52 · F4: el operador de evento también trabaja solo en sus convocatorias asignadas (sin periodos).
  const pideConvocatorias = rolSlug === 'admin_convocatoria' || rolSlug === 'operador_evento';
  const pidePeriodos = ['admin_convocatoria', 'revisor', 'evaluador', 'consulta'].includes(rolSlug);
  const alternarId = (campo: 'convocatoria_ids' | 'periodo_ids', id: number) =>
    setFormData((f) => ({ ...f, [campo]: f[campo].includes(id) ? f[campo].filter((x) => x !== id) : [...f[campo], id] }));

  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const response = await api.get('/catalogos');
        const data = response.data || {};
        setCatalogs({
          roles: data.roles || [],
          instituciones: data.empresas || data.instituciones || []
        });
      } catch (error) {
        console.error("Error al cargar catálogos:", error);
        setCatalogs({ roles: [], instituciones: [] });
      }
    };
    fetchCatalogs();
  }, []);

  const updateSearchParams = (next: { page?: number; per_page?: number; rol_id?: string; search?: string }) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (next.page !== undefined) params.set('page', String(next.page));
    if (next.per_page !== undefined) params.set('per_page', String(next.per_page));
    for (const k of ['rol_id', 'search'] as const) {
      if (next[k] !== undefined) { if (next[k]) params.set(k, next[k]!); else params.delete(k); }
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  // E83 (20/10/2026, pedido del usuario): separar las cuentas por tipo y buscar, para que no salgan todas juntas.
  const [texto, setTexto] = useState(busqueda);
  useEffect(() => {
    if (texto === busqueda) return;
    const t = setTimeout(() => updateSearchParams({ page: 1, search: texto.trim() }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al escribir
  }, [texto]);
  const totalTodos = Object.values(porRol).reduce((a, n) => a + Number(n || 0), 0);
  const pestanasRol = [
    { id: '', nombre: 'Todos', total: totalTodos },
    ...catalogs.roles.map((r) => ({ id: String(r.id), nombre: r.nombre, total: Number(porRol[String(r.id)] ?? 0) })).filter((r) => r.total > 0 || r.id === rolId),
  ];

  const handleOpenModal = (user: User | null = null) => {
    setErrors({});
    setErrorGuardar(null);
    setConfPass(''); setVerPass(false); setVerConf(false);
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        nombres: user.nombres ?? '',
        primer_apellido: user.primer_apellido ?? '',
        segundo_apellido: user.segundo_apellido ?? '',
        curp: '',
        fecha_nacimiento: '',
        curp_revision: false,
        email: user.email,
        password: '',
        rol_id: user.rol_id.toString(),
        empresa_id: user.empresa_id?.toString() || '',
        telefono: user.telefono || '',
        cargo: user.cargo || '',
        activo: !!user.activo,
        convocatoria_ids: ((user as unknown as { convocatorias_asignadas?: { id: number }[] }).convocatorias_asignadas ?? []).map((c) => c.id),
        periodo_ids: ((user as unknown as { periodos?: { id: number }[] }).periodos ?? []).map((p) => p.id),
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        nombres: '',
        primer_apellido: '',
        segundo_apellido: '',
        curp: '',
        fecha_nacimiento: '',
        curp_revision: false,
        email: '',
        password: '',
        rol_id: '',
        empresa_id: '',
        telefono: '',
        cargo: '',
        activo: true,
        convocatoria_ids: [],
        periodo_ids: [],
      });
    }
    setShowModal(true);
  };

  /** Mismas reglas que el servidor (UserController + Password::defaults), para avisar antes de enviar. */
  const erroresCuenta = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (porPartes) {
      const n1 = problemaNombre(formData.nombres, 'nombre'); if (n1) e.nombres = n1;
      const n2 = problemaNombre(formData.primer_apellido, 'primer apellido'); if (n2) e.primer_apellido = n2;
      const n3 = problemaNombre(formData.segundo_apellido, 'segundo apellido', false); if (n3) e.segundo_apellido = n3;
    } else if (!formData.name.trim()) e.name = 'Escribe el nombre completo.';
    else if (formData.name.length > 255) e.name = 'Máximo 255 caracteres.';
    if (!editingUser && formData.curp) {
      if (revisionCurp.campos.fecha_nacimiento) e.fecha_nacimiento = revisionCurp.campos.fecha_nacimiento;
      if (revisionCurp.campos.curp) e.curp = revisionCurp.campos.curp;
      else if (!revisionCurp.coincide && revisionCurp.problemas.length) {
        if (!revisionCurp.revisable) e.curp = revisionCurp.problemas[0];
        else if (!formData.curp_revision) e.curp = 'La CURP no coincide con el nombre o la fecha. Corrígela o confirma que es correcta.';
      }
    }
    if (!formData.email.trim()) e.email = 'Escribe el correo electrónico.';
    else if (!PATRON_CORREO.test(formData.email.trim())) e.email = 'Revisa el correo: debe verse como nombre@dominio.mx.';
    if (!editingUser && !formData.password) e.password = 'Define una contraseña inicial.';
    else if (formData.password) { const p = validarPassword(formData.password); if (p) e.password = p; }
    if (formData.password && confPass !== formData.password) e.password_confirmation = confPass ? 'Las contraseñas no coinciden.' : 'Confirma la contraseña.';
    return e;
  };
  const erroresPapel = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!formData.rol_id) e.rol_id = 'Elige el papel que tendrá.';
    if (formData.telefono.length > 20) e.telefono = 'Máximo 20 caracteres.';
    if (formData.cargo.length > 255) e.cargo = 'Máximo 255 caracteres.';
    return e;
  };
  /** Valida un paso: marca los campos y devuelve el primer mensaje (StepFrame no deja avanzar). */
  const validarPaso = (e: Record<string, string>, claves: string[]) => {
    setErrors((prev) => {
      const limpio = { ...prev };
      for (const k of claves) delete limpio[k];
      return { ...limpio, ...e };
    });
    return Object.values(e)[0] ?? null;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErrorGuardar(null);

    const locales = { ...erroresCuenta(), ...erroresPapel() };
    if (Object.keys(locales).length) {
      setErrors(locales);
      const primero = Object.keys(locales)[0];
      setErrorGuardar({ titulo: 'Hay datos por corregir.', lineas: Object.entries(locales).map(([k, m]) => `${ETIQUETA_CAMPO[k] ?? k}: ${m}`), campos: locales, paso: PASO_CAMPO[primero] ?? null });
      return;
    }

    setSubmitting(true);
    try {
      // Convert string IDs to numbers and filter empty values
      const payload: Partial<User> & Record<string, unknown> & { password?: string; password_confirmation?: string; convocatoria_ids?: number[]; periodo_ids?: number[] } = {
        ...(porPartes
          ? { nombres: nombrePropio(formData.nombres, true), primer_apellido: nombrePropio(formData.primer_apellido), segundo_apellido: nombrePropio(formData.segundo_apellido) || null, curp_revision: formData.curp_revision }
          : { name: nombrePropio(formData.name, true) }),
        ...(!editingUser && formData.curp ? { curp: formData.curp, fecha_nacimiento: formData.fecha_nacimiento } : {}),
        email: formData.email,
        rol_id: parseInt(formData.rol_id, 10),
        telefono: formData.telefono || undefined,
        cargo: formData.cargo || undefined,
        activo: formData.activo,
        // El backend limpia lo que no corresponde al rol (App\Http\Controllers\Admin\UserController).
        convocatoria_ids: pideConvocatorias ? formData.convocatoria_ids : [],
        periodo_ids: pidePeriodos ? formData.periodo_ids : [],
      };

      // Only add password for new users or when password is provided
      if (!editingUser || formData.password) {
        payload.password = formData.password;
        payload.password_confirmation = confPass;
      }

      // Only add empresa_id if it's selected
      if (formData.empresa_id) {
        payload.empresa_id = parseInt(formData.empresa_id, 10);
      }

      if (editingUser) {
        await api.put(`/admin/usuarios/${editingUser.id}`, payload);
      } else {
        await api.post('/admin/usuarios', payload);
      }
      const nombreMostrado = porPartes
        ? [nombrePropio(formData.nombres, true), nombrePropio(formData.primer_apellido), nombrePropio(formData.segundo_apellido)].filter(Boolean).join(' ')
        : formData.name.trim();
      setShowModal(false);
      setErrors({});
      setFeedback({
        type: 'success',
        message: editingUser ? `Se guardaron los cambios de ${nombreMostrado}.` : `Usuario ${nombreMostrado} creado. Ya puede entrar con ${formData.email.trim()}.`,
      });
      router.refresh();
    } catch (error: unknown) {
      const r = erroresFormulario(error, ETIQUETA_CAMPO, PASO_CAMPO);
      setErrors(r.campos);
      setErrorGuardar(r);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: number) => {
    setConfirmState({
      open: true,
      title: 'Eliminar usuario',
      description: 'La cuenta se elimina de forma definitiva y ya no podrá iniciar sesión. Si solo quieres impedir el acceso, edítala y apaga «Puede entrar al sistema».',
      action: async () => {
        try {
          await api.delete(`/admin/usuarios/${id}`);
          router.refresh();
        } catch (error: unknown) {
          const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al eliminar usuario';
          setFeedback({ type: 'error', message: msg });
        }
      },
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {feedback && <AlertBox type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}
      <PageHeader
        eyebrow="Administración"
        title="Gestión de usuarios"
        description="Administra accesos, roles y adscripciones institucionales."
        icon={<Users className="h-5 w-5" />}
        actions={
          <Button variant="rainbow" onClick={() => handleOpenModal()}>
            <UserPlus className="h-4 w-4" />
            Nuevo usuario
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="seg-tabs flex-wrap" role="tablist" aria-label="Tipo de cuenta">
          {pestanasRol.map((p) => (
            <button key={p.id || 'todos'} type="button" role="tab" aria-selected={rolId === p.id}
              onClick={() => updateSearchParams({ page: 1, rol_id: p.id })}
              className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold">
              {p.nombre}<span className="text-xs opacity-70">{p.total}</span>
            </button>
          ))}
        </div>
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-ink-2)]" aria-hidden="true" />
          <input type="search" aria-label="Buscar por nombre o correo" placeholder="Buscar por nombre o correo" maxLength={100}
            className="auth-input auth-input-static pl-10" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </div>
      </div>

      <DataCardGrid
        items={users}
        getKey={(u) => u.id}
        columns={3}
        accentColor={(u) => {
          if (!u.activo) return 'red';
          const slug = u.rol?.slug;
          if (slug === 'admin') return 'primary';
          if (slug === 'revisor') return 'emerald';
          if (slug === 'evaluador') return 'amber';
          if (slug === 'admin_convocatoria') return 'purple';
          if (slug === 'consulta') return 'teal';
          if (slug === 'operador_evento') return 'amber';
          return 'sky'; // solicitante
        }}
        emptyState={
          <div className="empty-state">
            <span className="tone-chip" data-tone="violet"><UserCircle aria-hidden="true" /></span>
            <p className="font-bold text-[var(--app-ink)]">Sin usuarios registrados</p>
          </div>
        }
        renderCard={(user) => (
          <div className="pl-3 group">
            <div className="flex items-start gap-3 mb-3">
              <UserAvatar user={user as unknown as { id: number; name: string; avatar_url?: string | null }} size="md" />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-50 truncate">{user.name}</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-300 flex items-center gap-1 truncate">
                  <Mail className="h-3 w-3 shrink-0" /> {user.email}
                </p>
              </div>
              <Badge variant={user.activo ? 'default' : 'destructive'} className="shrink-0 text-[10px]">
                {user.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            <div className="space-y-1.5 mb-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-bold">{user.rol?.nombre || 'Sin rol'}</Badge>
                {user.cargo && (
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider truncate">{user.cargo}</span>
                )}
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 truncate">
                {user.empresa?.nombre || 'Gobierno (Sede Central)'}
              </p>
            </div>
            <div className="flex items-center justify-end gap-1.5 pt-3 border-t" style={{ borderColor: 'var(--app-rule)' }}>
              <Button variant="soft" size="icon-sm" onClick={() => handleOpenModal(user)} aria-label="Editar usuario" title="Editar">
                <Edit />
              </Button>
              <Button variant="destructive" size="icon-sm" onClick={() => handleDelete(user.id)} aria-label="Eliminar usuario" title="Eliminar">
                <Trash2 />
              </Button>
            </div>
          </div>
        )}
      />
      <PaginationControls
        currentPage={pagination.current_page}
        lastPage={pagination.last_page}
        total={pagination.total}
        perPage={pagination.per_page}
        onPageChange={(p) => updateSearchParams({ page: p })}
        onPerPageChange={(pp) => updateSearchParams({ page: 1, per_page: pp })}
      />

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        onConfirm={() => { confirmState.action(); setConfirmState(s => ({...s, open: false})); }}
        onCancel={() => setConfirmState(s => ({...s, open: false}))}
        variant="destructive"
      />

      {/* Alta / edición por pasos (StepFrame) — mismo marco que todo el sistema */}
      <StepFrame
        open={showModal}
        title={editingUser ? `Editar a ${editingUser.name}` : 'Nuevo usuario'}
        icon={<UserCircle className="h-5 w-5" />}
        intro={
          editingUser
            ? <>Cambia solo lo necesario. Si dejas la contraseña vacía, <strong>se conserva la actual</strong>.</>
            : <>Un usuario es <strong>una persona que entra al sistema</strong> con su correo y contraseña. Su papel define qué puede ver y hacer.</>
        }
        steps={[
          {
            key: 'cuenta',
            label: 'La cuenta',
            question: '¿Quién es y cómo entra?',
            validate: () => validarPaso(erroresCuenta(), ['name', 'nombres', 'primer_apellido', 'segundo_apellido', 'curp', 'fecha_nacimiento', 'email', 'password', 'password_confirmation']),
            content: (
              <>
                {porPartes ? (
                  <>
                    <FField id="usr-nombres" icon={UserCircle} label="Nombre(s) *" error={errors.nombres}>
                      <input value={formData.nombres} maxLength={60} onChange={e => setFormData({ ...formData, nombres: e.target.value })} onBlur={() => setFormData((f) => ({ ...f, nombres: nombrePropio(f.nombres, true) }))} className="auth-input auth-input-static pl-10" autoComplete="off" placeholder="Ej. Ana María" />
                    </FField>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FField id="usr-apellido1" icon={UserCircle} label="Primer apellido *" error={errors.primer_apellido}>
                        <input value={formData.primer_apellido} maxLength={60} onChange={e => setFormData({ ...formData, primer_apellido: e.target.value })} onBlur={() => setFormData((f) => ({ ...f, primer_apellido: nombrePropio(f.primer_apellido) }))} className="auth-input auth-input-static pl-10" autoComplete="off" placeholder="Ej. Pérez" />
                      </FField>
                      <FField id="usr-apellido2" icon={UserCircle} label="Segundo apellido" error={errors.segundo_apellido}>
                        <input value={formData.segundo_apellido} maxLength={60} onChange={e => setFormData({ ...formData, segundo_apellido: e.target.value })} onBlur={() => setFormData((f) => ({ ...f, segundo_apellido: nombrePropio(f.segundo_apellido) }))} className="auth-input auth-input-static pl-10" autoComplete="off" placeholder="Ej. López" />
                      </FField>
                    </div>
                  </>
                ) : (
                  <FField id="usr-name" icon={UserCircle} label="Nombre completo *" error={errors.name}>
                    <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} onBlur={() => setFormData((f) => ({ ...f, name: nombrePropio(f.name, true) }))} className="auth-input auth-input-static pl-10" autoComplete="name" placeholder="Ej. Ana Pérez López" />
                  </FField>
                )}
                {!editingUser && (
                  <div className="space-y-3 rounded-[12px] border p-3" style={{ borderColor: 'var(--app-rule)' }}>
                    <p className="text-xs text-[var(--app-ink-2)]"><strong className="text-[var(--app-ink)]">CURP (opcional).</strong> Si la escribes, se compara con el nombre y la fecha de nacimiento.</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FField id="usr-curp" icon={IdCard} label="CURP" error={errors.curp}>
                        <input value={formData.curp} onChange={e => setFormData({ ...formData, curp: limpiarCurp(e.target.value), curp_revision: false })} className="auth-input auth-input-static pl-10" autoComplete="off" spellCheck={false} placeholder="18 caracteres" />
                      </FField>
                      <FField id="usr-fecha" icon={CalendarDays} label={formData.curp ? 'Fecha de nacimiento *' : 'Fecha de nacimiento'} error={errors.fecha_nacimiento}>
                        <input type="date" value={formData.fecha_nacimiento} max={new Date().toISOString().slice(0, 10)} onChange={e => setFormData({ ...formData, fecha_nacimiento: e.target.value, curp_revision: false })} className="auth-input auth-input-static pl-10" />
                      </FField>
                    </div>
                    {formData.curp.length === 18 && revisionCurp.coincide && (
                      <p className="text-xs font-semibold" style={{ color: 'var(--tile-emerald-fg)' }} role="status">La CURP coincide con el nombre y la fecha de nacimiento.</p>
                    )}
                    {revisionCurp.problemas.length > 0 && (
                      <div className="space-y-1.5 text-xs" role="status">
                        <ul className="list-disc space-y-0.5 pl-5" style={{ color: 'var(--auth-danger)' }}>
                          {revisionCurp.problemas.map((p) => <li key={p}>{p}</li>)}
                        </ul>
                        {revisionCurp.revisable && (
                          <label className="flex cursor-pointer items-start gap-2">
                            <input type="checkbox" checked={formData.curp_revision} onChange={e => setFormData({ ...formData, curp_revision: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[var(--auth-vino)]" />
                            <span>Revisé el documento: <strong>la CURP es correcta</strong> aunque no coincida (queda como aprobada por ti).</span>
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {editingUser?.curp_verificacion && porPartes && (
                  <label className="flex cursor-pointer items-start gap-2 text-xs text-[var(--app-ink-2)]">
                    <input type="checkbox" checked={formData.curp_revision} onChange={e => setFormData({ ...formData, curp_revision: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[var(--auth-vino)]" />
                    <span>Su nombre está ligado a su CURP. Si lo corriges y el sistema dice que ya no coincide, marca esta casilla para confirmarlo tú.</span>
                  </label>
                )}
                <FField id="usr-email" icon={Mail} label="Correo electrónico *" error={errors.email}>
                  <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="auth-input auth-input-static pl-10" autoComplete="email" placeholder="nombre@institucion.mx" />
                </FField>
                <FField id="usr-password" icon={Lock} label={editingUser ? 'Nueva contraseña (opcional)' : 'Contraseña inicial *'} error={errors.password}>
                  <input type={verPass ? 'text' : 'password'} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="auth-input auth-input-static pl-10 !pr-12" autoComplete="new-password" placeholder={editingUser ? 'Déjala vacía para no cambiarla' : 'Crea una contraseña segura'} />
                  <BotonVerContrasena visible={verPass} onToggle={() => setVerPass(!verPass)} />
                </FField>
                <p className="-mt-2 text-xs text-[var(--app-ink-2)]">{PASSWORD_HINT}</p>
                {formData.password && <SemaforoContrasena valor={formData.password} />}
                {(formData.password || !editingUser) && (
                  <FField id="usr-password2" icon={Lock} label={editingUser ? 'Confirma la nueva contraseña' : 'Confirmar contraseña *'} error={errors.password_confirmation}>
                    <input type={verConf ? 'text' : 'password'} value={confPass} onChange={e => setConfPass(e.target.value)} className="auth-input auth-input-static pl-10 !pr-12" autoComplete="new-password" placeholder="Escríbela otra vez" />
                    <BotonVerContrasena visible={verConf} onToggle={() => setVerConf(!verConf)} etiqueta="confirmación" />
                  </FField>
                )}
              </>
            ),
          },
          {
            key: 'papel',
            label: 'Su papel',
            question: '¿Qué hará en el sistema?',
            validate: () => validarPaso(erroresPapel(), ['rol_id', 'telefono', 'cargo']),
            content: (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FField id="usr-rol" icon={ShieldCheck} label="Papel en el sistema *" error={errors.rol_id}>
                    <select value={formData.rol_id} onChange={e => setFormData({ ...formData, rol_id: e.target.value })} className="auth-input auth-input-static pl-10 cursor-pointer">
                      <option value="">Elige…</option>
                      {catalogs.roles.map((r) => (
                        <option key={r.id} value={String(r.id)}>{r.nombre}</option>
                      ))}
                    </select>
                  </FField>
                  <FField id="usr-empresa" icon={Building2} label="Institución" error={errors.empresa_id}>
                    <select value={formData.empresa_id} onChange={e => setFormData({ ...formData, empresa_id: e.target.value })} className="auth-input auth-input-static pl-10 cursor-pointer">
                      <option value="">Ninguna (oficina central)</option>
                      {catalogs.instituciones.map((i) => (
                        <option key={i.id} value={String(i.id)}>{i.nombre}</option>
                      ))}
                    </select>
                  </FField>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FField id="usr-cargo" icon={Briefcase} label="Cargo" error={errors.cargo}>
                    <input maxLength={255} value={formData.cargo} onChange={e => setFormData({ ...formData, cargo: e.target.value })} className="auth-input auth-input-static pl-10" placeholder="Ej. Coordinadora de proyectos" />
                  </FField>
                  <FField id="usr-telefono" icon={Phone} label="Teléfono" error={errors.telefono}>
                    <input maxLength={20} value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} className="auth-input auth-input-static pl-10" autoComplete="tel" placeholder="Ej. 722 123 4567" />
                  </FField>
                </div>
                <label className="flex items-center justify-between gap-4 rounded-[var(--auth-radius-field)] border px-4 py-3 cursor-pointer" style={{ borderColor: 'var(--app-rule)', backgroundColor: formData.activo ? 'var(--tile-emerald-bg)' : 'var(--app-hover-bg)' }}>
                  <span>
                    <span className="block text-sm font-semibold text-[var(--app-ink)]">Puede entrar al sistema</span>
                    <span className="block text-xs text-[var(--app-ink-2)]">Si lo apagas, la cuenta se conserva pero no podrá iniciar sesión.</span>
                  </span>
                  <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
                    <input
                      type="checkbox"
                      role="switch"
                      aria-checked={formData.activo}
                      checked={formData.activo}
                      onChange={e => setFormData({ ...formData, activo: e.target.checked })}
                      className="peer sr-only"
                    />
                    <span className="h-6 w-11 rounded-full transition-colors duration-160" style={{ background: formData.activo ? 'var(--tile-emerald-fg)' : 'var(--auth-rule-strong)' }} />
                    <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-160" style={{ transform: formData.activo ? 'translateX(20px)' : 'translateX(0)' }} />
                  </span>
                </label>
              </>
            ),
          },
          ...((pideConvocatorias || pidePeriodos) ? [{
            key: 'alcance',
            label: 'Alcance',
            question: rolSlug === 'operador_evento' ? '¿En los eventos de qué convocatorias escanea?' : pideConvocatorias ? '¿Qué convocatorias opera y de qué periodos?' : '¿Qué periodos puede ver?',
            validate: () => (pideConvocatorias && formData.convocatoria_ids.length === 0 ? 'Elige al menos una convocatoria.' : null),
            content: (
              <div className="space-y-5">
                {pideConvocatorias && (
                  <fieldset>
                    <legend className="mb-2 text-sm font-semibold text-[var(--app-ink)]">Convocatorias a su cargo</legend>
                    <p className="mb-3 text-xs text-[var(--app-ink-2)]">
                      {rolSlug === 'operador_evento'
                        ? 'Solo podrá escanear y registrar asistencia, box lunch y kits de los clubes de estas convocatorias.'
                        : 'Solo verá y operará estas convocatorias.'}
                    </p>
                    <div className="max-h-56 space-y-1.5 overflow-y-auto">
                      {convocatoriasOp.length === 0 && <p className="text-xs text-[var(--app-ink-2)]">No hay convocatorias.</p>}
                      {convocatoriasOp.map((c) => (
                        <label key={c.id} className="flex items-center gap-2 rounded-xl bg-[var(--sg-canvas,#f6f8fb)] px-3 py-2 text-sm text-[var(--app-ink)]">
                          <input type="checkbox" checked={formData.convocatoria_ids.includes(c.id)} onChange={() => alternarId('convocatoria_ids', c.id)} />{c.nombre}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}
                {pidePeriodos && (
                  <fieldset>
                    <legend className="mb-2 text-sm font-semibold text-[var(--app-ink)]">Periodos visibles</legend>
                    <p className="mb-3 text-xs text-[var(--app-ink-2)]">
                      {rolSlug === 'consulta'
                        ? 'Sin periodos no verá nada.'
                        : rolSlug === 'admin_convocatoria'
                          ? 'Opcional: si eliges periodos, de sus convocatorias solo verá las de esos periodos.'
                          : 'Sin periodos ve todo; con periodos, solo lo de esos periodos.'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {periodosOp.length === 0 && <p className="text-xs text-[var(--app-ink-2)]">No hay periodos. Créalos en Configuración › Periodos.</p>}
                      {periodosOp.map((p) => (
                        <label key={p.id} className="inline-flex items-center gap-2 rounded-full bg-[var(--sg-canvas,#f6f8fb)] px-3 py-1.5 text-sm text-[var(--app-ink)]">
                          <input type="checkbox" checked={formData.periodo_ids.includes(p.id)} onChange={() => alternarId('periodo_ids', p.id)} />{p.nombre}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}
              </div>
            ),
          }] : []),
        ]}
        onClose={() => { setShowModal(false); setErrors({}); setErrorGuardar(null); }}
        onSubmit={() => handleSubmit()}
        error={errorGuardar ? <AvisoErrores errores={errorGuardar} /> : null}
        errorStep={errorGuardar?.paso ?? null}
        submitting={submitting}
        submitLabel={editingUser ? 'Guardar cambios' : 'Crear usuario'}
      />
    </div>
  );
}
