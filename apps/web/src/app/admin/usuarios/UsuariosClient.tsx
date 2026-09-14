'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Edit, Trash2, Loader2, UserPlus,
  Mail, UserCircle
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
      description: '¿Estás seguro de eliminar este usuario? (Soft delete)',
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
          <h1 className="text-3xl font-bold text-neutral-dark">Gestión de Usuarios</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Administra accesos, roles y adscripciones institucionales.</p>
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
            <div className="flex items-center justify-end gap-1 pt-2 border-t border-neutral-50 dark:border-neutral-800 opacity-50 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" onClick={() => handleOpenModal(user)} aria-label="Editar usuario">
                <Edit className="h-4 w-4 text-neutral-500" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)} aria-label="Eliminar usuario">
                <Trash2 className="h-4 w-4 text-red-500" />
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

      {/* Admin User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-0 animate-in zoom-in-95 duration-200">
            <CardHeader className="bg-primary text-white py-4 rounded-t-xl">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCircle className="h-5 w-5" /> {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className={(errors as Record<string, string>).name ? 'text-red-500' : ''}>Nombre Completo *</Label>
                  <Input
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className={(errors as Record<string, string>).name ? 'border-red-500' : ''}
                  />
                  {(errors as Record<string, string>).name && <p className="text-xs text-red-500">{(errors as Record<string, string>).name}</p>}
                </div>

                <div className="space-y-2">
                  <Label className={(errors as Record<string, string>).email ? 'text-red-500' : ''}>Correo Electrónico *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className={(errors as Record<string, string>).email ? 'border-red-500' : ''}
                  />
                  {(errors as Record<string, string>).email && <p className="text-xs text-red-500">{(errors as Record<string, string>).email}</p>}
                </div>

                <div className="space-y-2">
                  <Label className={(errors as Record<string, string>).password ? 'text-red-500' : ''}>Contraseña {editingUser && '(dejar vacío para mantener)'} *</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className={(errors as Record<string, string>).password ? 'border-red-500' : ''}
                  />
                  {(errors as Record<string, string>).password && <p className="text-xs text-red-500">{(errors as Record<string, string>).password}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className={(errors as Record<string, string>).rol_id ? 'text-red-500' : ''}>Rol del Sistema *</Label>
                    <select
                      className={`w-full h-10 px-3 rounded-md border text-sm ${(errors as Record<string, string>).rol_id ? 'border-red-500' : ''}`}
                      value={formData.rol_id}
                      onChange={e => setFormData({...formData, rol_id: e.target.value})}
                    >
                      <option value="">Selecciona...</option>
                      {catalogs.roles.map((r) => (
                        <option key={r.id} value={String(r.id)}>{r.nombre}</option>
                      ))}
                    </select>
                    {(errors as Record<string, string>).rol_id && <p className="text-xs text-red-500">{(errors as Record<string, string>).rol_id}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Institución</Label>
                    <select
                      className="w-full h-10 px-3 rounded-md border text-sm"
                      value={formData.empresa_id}
                      onChange={e => setFormData({...formData, empresa_id: e.target.value})}
                    >
                      <option value="">Ninguna / Central</option>
                      {catalogs.instituciones.map((i) => (
                        <option key={i.id} value={String(i.id)}>{i.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowModal(false);
                      setErrors({});
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary-light text-white font-bold"
                    disabled={submitting}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar Cambios'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
