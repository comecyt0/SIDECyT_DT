'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Zap, Plus, Edit, Eye, Loader2, X, Save, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';
import { AlertBox } from '@/components/ui/alert-box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { INSTITUTION } from '@/lib/institution';
import { formatCurrency } from '@/lib/format';

export interface TipoPrograma {
  id: number;
  clave: string;
  nombre: string;
  descripcion?: string;
  tipo_apoyo: 'reembolso' | 'concurrente' | 'honorarios';
  tiene_etapas: boolean;
  tiene_equipo: boolean;
  monto_maximo: number;
  activo: boolean;
}

interface FormData {
  clave: string;
  nombre: string;
  descripcion: string;
  tipo_apoyo: 'reembolso' | 'concurrente' | 'honorarios';
  tiene_etapas: boolean;
  num_etapas: number;
  tiene_equipo: boolean;
  min_miembros_equipo: number;
  max_miembros_equipo: number;
  monto_maximo: number;
  activo: boolean;
}

const emptyForm: FormData = {
  clave: '',
  nombre: '',
  descripcion: '',
  tipo_apoyo: 'concurrente',
  tiene_etapas: false,
  num_etapas: 1,
  tiene_equipo: false,
  min_miembros_equipo: 1,
  max_miembros_equipo: 5,
  monto_maximo: 50000,
  activo: true,
};

interface Props {
  programas: TipoPrograma[];
}

export default function ProgramasClient({ programas }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [feedback, setFeedback] = useState<{type: 'error'|'success'|'info'|'warning', message: string}|null>(null);
  const [confirmState, setConfirmState] = useState<{open: boolean, action: () => void, title: string, description: string}>({open: false, action: () => {}, title: '', description: ''});

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (prog: TipoPrograma) => {
    setEditId(prog.id);
    setForm({
      clave: prog.clave,
      nombre: prog.nombre,
      descripcion: prog.descripcion || '',
      tipo_apoyo: prog.tipo_apoyo,
      tiene_etapas: prog.tiene_etapas,
      num_etapas: prog.tiene_etapas ? 2 : 1,
      tiene_equipo: prog.tiene_equipo,
      min_miembros_equipo: 1,
      max_miembros_equipo: 5,
      monto_maximo: prog.monto_maximo,
      activo: prog.activo,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.clave.trim() || !form.nombre.trim()) {
      setFeedback({ type: 'error', message: 'Clave y nombre son requeridos' });
      return;
    }

    if (form.tiene_etapas && form.num_etapas < 1) {
      setFeedback({ type: 'error', message: 'Número de etapas debe ser mayor a 0' });
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        await api.put(`/admin/programas/${editId}`, form);
      } else {
        await api.post('/admin/programas', form);
      }
      setShowModal(false);
      router.refresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al guardar';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: number) => {
    setConfirmState({
      open: true,
      title: 'Eliminar programa',
      description: '¿Seguro que deseas eliminar este programa?',
      action: async () => {
        try {
          await api.delete(`/admin/programas/${id}`);
          router.refresh();
        } catch (err: unknown) {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al eliminar';
          setFeedback({ type: 'error', message: msg });
        }
      },
    });
  };

  const tipoApoyoLabel = (tipo: string) => {
    const map: Record<string, string> = {
      reembolso: 'Reembolso',
      concurrente: 'Concurrente',
      honorarios: 'Honorarios',
    };
    return map[tipo] || tipo;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {feedback && <AlertBox type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-dark">Gestión de Programas</h1>
          <p className="text-neutral-500 dark:text-neutral-400">{`Administra los tipos de programa ${INSTITUTION.name} (100% dinámico, sin código).`}</p>
        </div>
        <Button className="bg-primary hover:bg-primary-light text-white shadow-md" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Programa
        </Button>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader className="bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-700">
          <CardTitle className="text-lg text-primary flex items-center gap-2">
            <Zap className="w-5 h-5" /> Programas Registrados
          </CardTitle>
          <CardDescription>Lista de todos los programas del sistema. Haz clic en &quot;Ver detalles&quot; para gestionar campos, rubros, criterios y etapas.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {programas.length === 0 ? (
            <div className="p-12 text-center text-neutral-500 dark:text-neutral-400">
              <p>No hay programas registrados aún. ¡Crea uno nuevo!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-primary font-semibold">Clave</TableHead>
                  <TableHead className="text-primary font-semibold">Nombre</TableHead>
                  <TableHead className="text-primary font-semibold">Tipo Apoyo</TableHead>
                  <TableHead className="text-primary font-semibold">Monto Máx</TableHead>
                  <TableHead className="text-primary font-semibold">Etapas</TableHead>
                  <TableHead className="text-primary font-semibold">Equipo</TableHead>
                  <TableHead className="text-primary font-semibold">Estado</TableHead>
                  <TableHead className="text-right text-primary font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programas.map((prog) => (
                  <TableRow key={prog.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                    <TableCell className="font-mono text-sm text-neutral-600 dark:text-neutral-300">{prog.clave}</TableCell>
                    <TableCell className="font-medium text-neutral-900 dark:text-neutral-50">{prog.nombre}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{tipoApoyoLabel(prog.tipo_apoyo)}</Badge>
                    </TableCell>
                    <TableCell className="text-neutral-600 dark:text-neutral-300">{formatCurrency(prog.monto_maximo || 0)}</TableCell>
                    <TableCell>
                      <Badge variant={prog.tiene_etapas ? 'default' : 'secondary'}>
                        {prog.tiene_etapas ? 'Sí' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={prog.tiene_equipo ? 'default' : 'secondary'}>
                        {prog.tiene_equipo ? 'Sí' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={prog.activo ? 'default' : 'destructive'}>
                        {prog.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Link href={`/admin/programas/${prog.id}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-neutral-600 dark:text-neutral-300 hover:text-primary"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(prog)}
                        className="text-neutral-600 dark:text-neutral-300 hover:text-primary"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(prog.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        onConfirm={() => { confirmState.action(); setConfirmState(s => ({...s, open: false})); }}
        onCancel={() => setConfirmState(s => ({...s, open: false}))}
        variant="destructive"
      />

      {/* MODAL CREAR/EDITAR */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-screen overflow-y-auto">
            <CardHeader className="flex flex-row justify-between items-start bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-700">
              <div>
                <CardTitle>{editId ? 'Editar Programa' : 'Nuevo Programa'}</CardTitle>
                <CardDescription>Completa los datos del programa. Puedes gestionar campos, rubros y criterios después de crear.</CardDescription>
              </div>
              <button onClick={() => setShowModal(false)} className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-600">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clave" className="text-neutral-700 dark:text-neutral-200">
                    Clave (máx 20 caracteres) *
                  </Label>
                  <Input
                    id="clave"
                    value={form.clave}
                    onChange={(e) => setForm({ ...form, clave: e.target.value.toUpperCase() })}
                    placeholder="ej. PFPI, PROT, VINC"
                    className="mt-1"
                    disabled={!!editId}
                  />
                </div>
                <div>
                  <Label htmlFor="nombre" className="text-neutral-700 dark:text-neutral-200">
                    Nombre *
                  </Label>
                  <Input
                    id="nombre"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="ej. Vinculación Académica"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="descripcion" className="text-neutral-700 dark:text-neutral-200">
                  Descripción
                </Label>
                <Input
                  id="descripcion"
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Descripción del programa"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipo_apoyo" className="text-neutral-700 dark:text-neutral-200">
                    Tipo de Apoyo *
                  </Label>
                  <Select value={form.tipo_apoyo} onValueChange={(v: 'reembolso' | 'concurrente' | 'honorarios' | null) => v && setForm({ ...form, tipo_apoyo: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reembolso">Reembolso</SelectItem>
                      <SelectItem value="concurrente">Concurrente</SelectItem>
                      <SelectItem value="honorarios">Honorarios</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="monto_maximo" className="text-neutral-700 dark:text-neutral-200">
                    Monto Máximo *
                  </Label>
                  <Input
                    id="monto_maximo"
                    type="number"
                    value={form.monto_maximo}
                    onChange={(e) => setForm({ ...form, monto_maximo: parseFloat(e.target.value) })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="space-y-3 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-md">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-50">Configuración Avanzada</h3>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="tiene_etapas"
                    checked={form.tiene_etapas}
                    onCheckedChange={(v) => setForm({ ...form, tiene_etapas: v as boolean })}
                  />
                  <Label htmlFor="tiene_etapas" className="text-neutral-700 dark:text-neutral-200 cursor-pointer">
                    Este programa tiene etapas
                  </Label>
                  {form.tiene_etapas && (
                    <Input
                      type="number"
                      value={form.num_etapas}
                      onChange={(e) => setForm({ ...form, num_etapas: parseInt(e.target.value) })}
                      className="w-20 ml-auto"
                      min="1"
                      max="10"
                    />
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="tiene_equipo"
                    checked={form.tiene_equipo}
                    onCheckedChange={(v) => setForm({ ...form, tiene_equipo: v as boolean })}
                  />
                  <Label htmlFor="tiene_equipo" className="text-neutral-700 dark:text-neutral-200 cursor-pointer">
                    Requiere equipo de trabajo
                  </Label>
                  {form.tiene_equipo && (
                    <div className="ml-auto flex gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-neutral-600 dark:text-neutral-300">Min:</span>
                        <Input
                          type="number"
                          value={form.min_miembros_equipo}
                          onChange={(e) => setForm({ ...form, min_miembros_equipo: parseInt(e.target.value) })}
                          className="w-16"
                          min="1"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-neutral-600 dark:text-neutral-300">Máx:</span>
                        <Input
                          type="number"
                          value={form.max_miembros_equipo}
                          onChange={(e) => setForm({ ...form, max_miembros_equipo: parseInt(e.target.value) })}
                          className="w-16"
                          min="1"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="activo"
                    checked={form.activo}
                    onCheckedChange={(v) => setForm({ ...form, activo: v as boolean })}
                  />
                  <Label htmlFor="activo" className="text-neutral-700 dark:text-neutral-200 cursor-pointer">
                    Programa activo
                  </Label>
                </div>
              </div>
            </CardContent>
            <div className="border-t border-neutral-100 dark:border-neutral-700 p-6 flex justify-end gap-3 bg-white dark:bg-neutral-900">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                className="bg-primary hover:bg-primary-light text-white"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> {editId ? 'Actualizar' : 'Crear'}
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
