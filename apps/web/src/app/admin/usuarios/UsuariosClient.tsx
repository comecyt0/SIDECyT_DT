'use client';

import { useState, useEffect, Children, cloneElement, isValidElement, type ReactElement } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Edit, Trash2, Loader2, UserPlus, X,
  Mail, UserCircle, Lock, Briefcase, Phone, Building2, ShieldCheck
} from 'lucide-react';
import api from '@/lib/api';
import type { User, Rol, Empresa } from '@/types/api';
import { AlertBox } from '@/components/ui/alert-box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import PaginationControls from '@/components/ui/pagination-controls';
import { DataCardGrid } from '@/components/ui/DataCardGrid';

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
        {label}
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
}

export default function UsuariosClient({ users, pagination }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [catalogs, setCatalogs] = useState<{ roles: Rol[]; instituciones: Empresa[] }>({ roles: [], instituciones: [] });
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{type: 'error'|'success'|'info'|'warning', message: string}|null>(null);
  const [confirmState, setConfirmState] = useState<{open: boolean, action: () => void, title: string, description: string}>({open: false, action: () => {}, title: '', description: ''});

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    rol_id: '',
    empresa_id: '',
    telefono: '',
    cargo: '',
    activo: true
  });

  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const response = await api.get('/catalogos');
        const data = response.data || {};
        setCatalogs({
          roles: data.roles || [],
          instituciones: data.instituciones || []
        });
      } catch (error) {
        console.error("Error al cargar catálogos:", error);
        setCatalogs({ roles: [], instituciones: [] });
      }
    };
    fetchCatalogs();
  }, []);

  const updateSearchParams = (next: { page?: number; per_page?: number }) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (next.page !== undefined) params.set('page', String(next.page));
    if (next.per_page !== undefined) params.set('per_page', String(next.per_page));
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleOpenModal = (user: User | null = null) => {
    setErrors({});
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        rol_id: user.rol_id.toString(),
        empresa_id: user.empresa_id?.toString() || '',
        telefono: user.telefono || '',
        cargo: user.cargo || '',
        activo: !!user.activo
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        rol_id: '',
        empresa_id: '',
        telefono: '',
        cargo: '',
        activo: true
      });
    }
    setShowModal(true);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Nombre requerido';
    if (!formData.email.trim()) newErrors.email = 'Email requerido';
    if (!formData.rol_id) newErrors.rol_id = 'Rol requerido';
    if (!editingUser && !formData.password) newErrors.password = 'Contraseña requerida';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setFeedback({ type: 'error', message: 'Por favor completa todos los campos requeridos' });
      return;
    }

    setSubmitting(true);
    try {
      // Convert string IDs to numbers and filter empty values
      const payload: Partial<User> & { password?: string } = {
        name: formData.name,
        email: formData.email,
        rol_id: parseInt(formData.rol_id, 10),
        telefono: formData.telefono || undefined,
        cargo: formData.cargo || undefined,
        activo: formData.activo,
      };

      // Only add password for new users or when password is provided
      if (!editingUser || formData.password) {
        payload.password = formData.password;
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
      setShowModal(false);
      setErrors({});
      router.refresh();
    } catch (error: unknown) {
      const errResp = (error as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } })?.response?.data;
      if (errResp?.errors) {
        const flat: Record<string, string> = {};
        for (const [key, val] of Object.entries(errResp.errors)) {
          flat[key] = Array.isArray(val) ? val.join(', ') : String(val);
        }
        setErrors(flat);
      }
      const errorMsg = errResp?.errors
        ? Object.entries(errResp.errors).map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`).join('\n')
        : errResp?.message || 'Error al procesar la solicitud';
      setFeedback({ type: 'error', message: errorMsg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: number) => {
    setConfirmState({
      open: true,
      title: 'Eliminar usuario',
      description: 'El usuario dejará de aparecer y no podrá iniciar sesión. Si hace falta, un administrador puede restaurarlo después.',
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.5rem,2.4vw,1.875rem)] font-bold tracking-tight text-[var(--app-ink)]">Gestión de Usuarios</h1>
          <p className="text-[var(--app-ink-2)] mt-1">Administra accesos, roles y adscripciones institucionales.</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
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
          return 'sky'; // solicitante
        }}
        emptyState={
          <div className="text-center py-16 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50/40 dark:bg-neutral-900/40">
            <UserCircle className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">Sin usuarios registrados</p>
          </div>
        }
        renderCard={(user) => (
          <div className="pl-3 group">
            <div className="flex items-start gap-3 mb-3">
              <div className="h-11 w-11 bg-gradient-to-br from-primary to-[var(--brand-vino-700)] rounded-xl flex items-center justify-center text-white font-bold text-sm shadow shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
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

      {/* Modal de alta/edición — mismo sistema de campos que el login (auth-input) sobre app-card */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'color-mix(in oklch, var(--auth-ink) 40%, transparent)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); setErrors({}); } }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="usuario-modal-title"
            className="app-card w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200"
          >
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b" style={{ borderColor: 'var(--app-rule)' }}>
              <div className="flex items-center gap-3">
                <span className="app-tile-icon" style={{ color: 'var(--tile-vino-fg)' }}>
                  <UserCircle className="h-5 w-5" />
                </span>
                <div>
                  <h2 id="usuario-modal-title" className="text-base font-bold text-[var(--app-ink)]">
                    {editingUser ? 'Editar usuario' : 'Nuevo usuario'}
                  </h2>
                  <p className="text-xs text-[var(--app-ink-2)]">
                    {editingUser ? editingUser.email : 'La cuenta queda activa al guardar.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowModal(false); setErrors({}); }}
                aria-label="Cerrar"
                className="p-2 rounded-lg text-[var(--app-ink-2)] hover:bg-[var(--app-hover-bg)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <FField id="usr-name" icon={UserCircle} label="Nombre completo *" error={errors.name}>
                <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="auth-input auth-input-static pl-10" autoComplete="name" />
              </FField>

              <FField id="usr-email" icon={Mail} label="Correo electrónico *" error={errors.email}>
                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="auth-input auth-input-static pl-10" autoComplete="email" />
              </FField>

              <FField id="usr-password" icon={Lock} label={editingUser ? 'Contraseña (vacío = conservar)' : 'Contraseña *'} error={errors.password}>
                <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="auth-input auth-input-static pl-10" autoComplete="new-password" />
              </FField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FField id="usr-rol" icon={ShieldCheck} label="Rol del sistema *" error={errors.rol_id}>
                  <select value={formData.rol_id} onChange={e => setFormData({ ...formData, rol_id: e.target.value })} className="auth-input auth-input-static pl-10 appearance-none cursor-pointer">
                    <option value="">Selecciona…</option>
                    {catalogs.roles.map((r) => (
                      <option key={r.id} value={String(r.id)}>{r.nombre}</option>
                    ))}
                  </select>
                </FField>
                <FField id="usr-empresa" icon={Building2} label="Institución">
                  <select value={formData.empresa_id} onChange={e => setFormData({ ...formData, empresa_id: e.target.value })} className="auth-input auth-input-static pl-10 appearance-none cursor-pointer">
                    <option value="">Ninguna / Central</option>
                    {catalogs.instituciones.map((i) => (
                      <option key={i.id} value={String(i.id)}>{i.nombre}</option>
                    ))}
                  </select>
                </FField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FField id="usr-cargo" icon={Briefcase} label="Cargo">
                  <input value={formData.cargo} onChange={e => setFormData({ ...formData, cargo: e.target.value })} className="auth-input auth-input-static pl-10" />
                </FField>
                <FField id="usr-telefono" icon={Phone} label="Teléfono">
                  <input value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} className="auth-input auth-input-static pl-10" autoComplete="tel" />
                </FField>
              </div>

              {/* Activo: interruptor accesible (checkbox real debajo) */}
              <label className="flex items-center justify-between gap-4 rounded-[var(--auth-radius-field)] border px-4 py-3 cursor-pointer" style={{ borderColor: 'var(--app-rule)', background: formData.activo ? 'var(--tile-emerald-bg)' : 'var(--app-hover-bg)' }}>
                <span>
                  <span className="block text-sm font-semibold text-[var(--app-ink)]">Cuenta activa</span>
                  <span className="block text-xs text-[var(--app-ink-2)]">Si se desactiva, el usuario no podrá iniciar sesión.</span>
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

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setErrors({}); }}
                  className="flex-1 h-12 rounded-[var(--auth-radius-field)] border font-bold text-sm transition-colors hover:bg-[var(--app-hover-bg)]"
                  style={{ borderColor: 'var(--app-rule)', color: 'var(--app-ink)' }}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} data-state={submitting ? 'loading' : 'idle'} className="auth-submit flex-1">
                  <span key={submitting ? 'loading' : 'idle'} className="auth-swap flex items-center gap-2.5">
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
                      </>
                    ) : (
                      editingUser ? 'Guardar cambios' : 'Crear usuario'
                    )}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
