'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Zap, Plus, Edit, Eye, Trash2 } from 'lucide-react';
import StepFrame from '@/components/ui/step-frame';
import PageHeader from '@/components/ui/page-header';
import api from '@/lib/api';
import Link from 'next/link';
import { AlertBox } from '@/components/ui/alert-box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
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
      setFeedback({ type: 'error', message: 'Escribe la clave y el nombre del programa.' });
      return;
    }

    if (form.tiene_etapas && form.num_etapas < 1) {
      setFeedback({ type: 'error', message: 'El número de etapas debe ser al menos 1.' });
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
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'No se pudo guardar el programa. Inténtalo de nuevo.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: number) => {
    setConfirmState({
      open: true,
      title: 'Eliminar programa',
      description: 'El programa dejará de estar disponible para nuevas convocatorias. Esta acción no se puede deshacer.',
      action: async () => {
        try {
          await api.delete(`/admin/programas/${id}`);
          router.refresh();
        } catch (err: unknown) {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'No se pudo eliminar el programa. Inténtalo de nuevo.';
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
      <PageHeader
        title="Gestión de programas"
        description="Los programas definen qué apoyo se da y cómo se evalúa. Crea uno o ajusta los que ya existen."
        icon={<Zap className="h-5 w-5" />}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nuevo programa
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>
            <Zap className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Programas registrados
          </CardTitle>
          <CardDescription>Entra a la ficha de cada programa para ajustar sus preguntas, documentos, conceptos de gasto, etapas y criterios.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {programas.length === 0 ? (
            <div className="empty-state">
              <span className="tone-chip" data-tone="violet"><Zap aria-hidden="true" /></span>
              <p className="font-bold text-[var(--app-ink)]">Sin programas todavía</p>
              <p className="text-sm text-[var(--app-ink-2)]">Crea el primero con el botón «Nuevo programa».</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clave</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Forma del apoyo</TableHead>
                  <TableHead>Monto máximo</TableHead>
                  <TableHead>Etapas</TableHead>
                  <TableHead>Equipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programas.map((prog) => (
                  <TableRow key={prog.id}>
                    <TableCell className="font-mono text-sm">{prog.clave}</TableCell>
                    <TableCell className="font-medium">{prog.nombre}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{tipoApoyoLabel(prog.tipo_apoyo)}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(prog.monto_maximo || 0)}</TableCell>
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
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Link href={`/admin/programas/${prog.id}`} aria-label="Ver ficha" title="Ver ficha">
                          <Button variant="soft" size="icon-sm" aria-label="Ver ficha" title="Ver ficha">
                            <Eye />
                          </Button>
                        </Link>
                        <Button variant="soft" size="icon-sm" onClick={() => openEdit(prog)} aria-label="Editar" title="Editar">
                          <Edit />
                        </Button>
                        <Button variant="destructive" size="icon-sm" onClick={() => handleDelete(prog.id)} aria-label="Eliminar" title="Eliminar">
                          <Trash2 />
                        </Button>
                      </div>
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

      {/* Alta / edición por pasos (StepFrame) */}
      <StepFrame
        open={showModal}
        title={editId ? 'Editar programa' : 'Nuevo programa'}
        icon={<Zap className="h-5 w-5" />}
        intro={<>Un programa es <strong>el tipo de apoyo que se ofrece</strong> (reembolso, concurrente u honorarios). Cada convocatoria se basa en uno. Los campos, documentos y criterios de evaluación se ajustan después, desde su ficha.</>}
        submitting={saving}
        submitLabel={editId ? 'Guardar cambios' : 'Crear programa'}
        onClose={() => setShowModal(false)}
        onSubmit={handleSave}
        steps={[
          {
            key: 'basico',
            label: 'Lo básico',
            question: '¿Cómo se llama el programa?',
            validate: () => {
              if (!form.clave.trim()) return 'Escribe una clave corta (hasta 20 letras).';
              if (!form.nombre.trim()) return 'Escribe el nombre del programa.';
              return null;
            },
            content: (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="clave" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Clave corta *</Label>
                    <input
                      id="clave"
                      value={form.clave}
                      onChange={(e) => setForm({ ...form, clave: e.target.value.toUpperCase() })}
                      placeholder="Ej. VINC"
                      maxLength={20}
                      disabled={!!editId}
                      className="auth-input auth-input-static pl-4 uppercase disabled:opacity-60"
                    />
                    <p className="text-xs text-[var(--app-ink-2)]">{editId ? 'La clave no se cambia una vez creado.' : 'Sirve para identificarlo en folios y reportes.'}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nombre" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Nombre *</Label>
                    <input id="nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Vinculación Académica" className="auth-input auth-input-static pl-4" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="descripcion" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Descripción (opcional)</Label>
                  <input id="descripcion" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="En una frase, para qué sirve este programa" className="auth-input auth-input-static pl-4" />
                </div>
              </>
            ),
          },
          {
            key: 'apoyo',
            label: 'El apoyo',
            question: '¿Cómo se entrega el apoyo y hasta cuánto?',
            validate: () => (!form.monto_maximo || form.monto_maximo <= 0 ? 'Indica el monto máximo por proyecto.' : null),
            content: (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tipo_apoyo" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Forma del apoyo *</Label>
                  <Select value={form.tipo_apoyo} onValueChange={(v: 'reembolso' | 'concurrente' | 'honorarios' | null) => v && setForm({ ...form, tipo_apoyo: v })}>
                    <SelectTrigger id="tipo_apoyo" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reembolso">Reembolso (se paga después de comprobar)</SelectItem>
                      <SelectItem value="concurrente">Concurrente (aportan ambas partes)</SelectItem>
                      <SelectItem value="honorarios">Honorarios (pago a personas)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="monto_maximo" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">Monto máximo por proyecto (MXN) *</Label>
                  <input
                    id="monto_maximo"
                    type="number"
                    min={0}
                    value={form.monto_maximo}
                    onChange={(e) => setForm({ ...form, monto_maximo: parseFloat(e.target.value) })}
                    className="auth-input auth-input-static pl-4"
                  />
                </div>
              </div>
            ),
          },
          {
            key: 'reglas',
            label: 'Reglas',
            question: '¿Se entrega por etapas? ¿Con equipo?',
            content: (
              <>
                <label className="flex items-center gap-3 rounded-[14px] border px-4 py-3 cursor-pointer" style={{ borderColor: 'var(--app-rule)', backgroundColor: form.tiene_etapas ? 'var(--tile-sky-bg)' : 'var(--auth-field)' }}>
                  <Checkbox id="tiene_etapas" checked={form.tiene_etapas} onCheckedChange={(v) => setForm({ ...form, tiene_etapas: v as boolean })} />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-[var(--app-ink)]">El apoyo se entrega por etapas</span>
                    <span className="block text-xs text-[var(--app-ink-2)]">Cada etapa lleva su propia ministración e informe.</span>
                  </span>
                  {form.tiene_etapas && (
                    <span className="flex items-center gap-2 text-xs text-[var(--app-ink-2)]">
                      Etapas
                      <input type="number" aria-label="Número de etapas" value={form.num_etapas} onChange={(e) => setForm({ ...form, num_etapas: parseInt(e.target.value) })} min={1} max={10} className="auth-input auth-input-static pl-3 !w-20 !min-h-10 !h-10" />
                    </span>
                  )}
                </label>

                <label className="flex items-center gap-3 rounded-[14px] border px-4 py-3 cursor-pointer" style={{ borderColor: 'var(--app-rule)', backgroundColor: form.tiene_equipo ? 'var(--tile-sky-bg)' : 'var(--auth-field)' }}>
                  <Checkbox id="tiene_equipo" checked={form.tiene_equipo} onCheckedChange={(v) => setForm({ ...form, tiene_equipo: v as boolean })} />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-[var(--app-ink)]">Requiere un equipo de trabajo</span>
                    <span className="block text-xs text-[var(--app-ink-2)]">El solicitante registra a los integrantes del proyecto.</span>
                  </span>
                  {form.tiene_equipo && (
                    <span className="flex items-center gap-2 text-xs text-[var(--app-ink-2)]">
                      De
                      <input type="number" aria-label="Mínimo de integrantes" value={form.min_miembros_equipo} onChange={(e) => setForm({ ...form, min_miembros_equipo: parseInt(e.target.value) })} min={1} className="auth-input auth-input-static pl-3 !w-16 !min-h-10 !h-10" />
                      a
                      <input type="number" aria-label="Máximo de integrantes" value={form.max_miembros_equipo} onChange={(e) => setForm({ ...form, max_miembros_equipo: parseInt(e.target.value) })} min={1} className="auth-input auth-input-static pl-3 !w-16 !min-h-10 !h-10" />
                    </span>
                  )}
                </label>

                <label className="flex items-center gap-3 rounded-[14px] border px-4 py-3 cursor-pointer" style={{ borderColor: 'var(--app-rule)', backgroundColor: form.activo ? 'var(--tile-emerald-bg)' : 'var(--auth-field)' }}>
                  <Checkbox id="activo" checked={form.activo} onCheckedChange={(v) => setForm({ ...form, activo: v as boolean })} />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-[var(--app-ink)]">Disponible para nuevas convocatorias</span>
                    <span className="block text-xs text-[var(--app-ink-2)]">Si lo apagas, las convocatorias existentes siguen; solo no se podrán crear nuevas con él.</span>
                  </span>
                </label>
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
