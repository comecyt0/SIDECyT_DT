'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Check, Inbox, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertBox } from '@/components/ui/alert-box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { NestedCRUDModal } from '@/components/admin/NestedCRUDModal';
import DocumentosPrograma from '@/components/admin/DocumentosPrograma';
import { mensajeError } from '@/lib/errores-formulario';

export type PestanaEstructura = 'campos' | 'documentos' | 'rubros' | 'etapas' | 'modalidades' | 'criterios';

const ETIQUETA: Record<PestanaEstructura, string> = {
  campos: 'Preguntas', documentos: 'Documentos', rubros: 'Conceptos de gasto', etapas: 'Etapas', modalidades: 'Modalidades', criterios: 'Criterios',
};
const TITULO: Record<PestanaEstructura, { create: string; edit: string; que: string }> = {
  campos: { create: 'Nueva pregunta', edit: 'Editar pregunta', que: 'la pregunta' },
  documentos: { create: 'Nuevo documento', edit: 'Editar documento', que: 'el documento' },
  rubros: { create: 'Nuevo concepto de gasto', edit: 'Editar concepto de gasto', que: 'el concepto de gasto' },
  etapas: { create: 'Nueva etapa', edit: 'Editar etapa', que: 'la etapa' },
  modalidades: { create: 'Nueva modalidad', edit: 'Editar modalidad', que: 'la modalidad' },
  criterios: { create: 'Nuevo criterio', edit: 'Editar criterio', que: 'el criterio' },
};
const TIPO_CAMPO: Record<string, string> = { text: 'Texto corto', number: 'Número', textarea: 'Texto largo', date: 'Fecha', select: 'Lista de opciones', checkbox: 'Casilla', email: 'Correo electrónico' };
/** Pestañas donde quitar respeta los datos capturados (E56). */
const CON_CUIDADO: PestanaEstructura[] = ['campos', 'rubros', 'criterios'];

// "Título del proyecto" → "titulo_del_proyecto": identificador interno a partir del texto visible
const slugify = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Item = Record<string, any> & { id: number; activo?: boolean; en_uso?: boolean };

const VACIO: Record<PestanaEstructura, Record<string, unknown>> = {
  documentos: {},
  campos: { nombre_campo: '', etiqueta: '', tipo_campo: 'text', orden: 1, requerido: false, activo: true, opciones: '' },
  rubros: { clave: '', nombre: '', descripcion: '', activo: true },
  etapas: { numero_etapa: 1, nombre: '', duracion_meses: 1, es_evaluacion_tecnica: false, activo: true },
  modalidades: { clave: '', nombre: '', descripcion: '', activo: true },
  criterios: { nombre: '', descripcion: '', puntaje_maximo: 25, ponderacion: 25, activo: true },
};

function campos(tab: PestanaEstructura) {
  const c: Record<PestanaEstructura, unknown[]> = {
    documentos: [],
    campos: [
      { name: 'etiqueta', label: 'Texto de la pregunta', type: 'text', required: true, placeholder: 'Ej. Título del proyecto', hint: 'Tal como lo leerá el solicitante. El identificador interno se genera solo.' },
      { name: 'tipo_campo', label: 'Tipo de respuesta', type: 'select', required: true, options: Object.entries(TIPO_CAMPO).map(([value, label]) => ({ value, label })) },
      { name: 'opciones', label: 'Opciones (solo para «Lista de opciones»)', type: 'textarea', placeholder: 'Una opción por línea' },
      { name: 'orden', label: 'Posición', type: 'number', required: true },
      { name: 'requerido', label: 'Es obligatoria', type: 'checkbox' },
      { name: 'activo', label: 'Visible para los solicitantes', type: 'checkbox' },
    ],
    rubros: [
      { name: 'nombre', label: 'Nombre del concepto de gasto', type: 'text', required: true, placeholder: 'Ej. Equipo de cómputo', hint: 'En qué se puede usar el dinero. La clave interna se genera sola.' },
      { name: 'descripcion', label: 'Qué incluye', type: 'textarea', placeholder: 'Ej. Computadoras, licencias y periféricos.' },
      { name: 'porcentaje_maximo', label: 'Porcentaje máximo del apoyo (opcional)', type: 'number' },
      { name: 'activo', label: 'Visible para los solicitantes', type: 'checkbox' },
    ],
    etapas: [
      { name: 'numero_etapa', label: 'Número de etapa', type: 'number', required: true },
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'duracion_meses', label: 'Duración (meses)', type: 'number' },
      { name: 'es_evaluacion_tecnica', label: 'Es de evaluación técnica', type: 'checkbox' },
      { name: 'activo', label: 'Activa', type: 'checkbox' },
    ],
    modalidades: [
      { name: 'nombre', label: 'Nombre de la modalidad', type: 'text', required: true, placeholder: 'Ej. Proyecto individual', hint: 'Una forma de participar dentro del programa. La clave interna se genera sola.' },
      { name: 'descripcion', label: 'En qué consiste', type: 'textarea' },
      { name: 'activo', label: 'Disponible para los solicitantes', type: 'checkbox' },
    ],
    criterios: [
      { name: 'nombre', label: 'Nombre del criterio', type: 'text', required: true },
      { name: 'descripcion', label: 'Descripción', type: 'textarea' },
      { name: 'puntaje_maximo', label: 'Calificación máxima', type: 'number', required: true },
      { name: 'ponderacion', label: 'Peso (%)', type: 'number', required: true },
      { name: 'activo', label: 'Lo califica el evaluador', type: 'checkbox' },
    ],
  };
  return c[tab];
}

/** Lista de opciones guardada ([{id,label}]) → texto, una por línea, para editarla. */
const opcionesATexto = (o: unknown) => (Array.isArray(o) ? o.map((x) => (x && typeof x === 'object' ? String((x as { label?: unknown }).label ?? '') : String(x))).filter(Boolean).join('\n') : '');

/**
 * E56 — Estructura de una configuración (TipoPrograma) en pestañas: agregar, editar y quitar preguntas, documentos,
 * conceptos de gasto, etapas, modalidades y criterios. Quitar respeta lo capturado: si ya tiene datos, el servidor lo
 * OCULTA (se conserva) en lugar de borrarlo, y aquí se puede «Volver a mostrar». La usan la ficha del programa y
 * «Editar convocatoria».
 */
export default function EstructuraPrograma({ programaId, pestanas }: { programaId: number | string; pestanas: PestanaEstructura[] }) {
  const [tab, setTab] = useState<PestanaEstructura>(pestanas[0]);
  const [items, setItems] = useState<Item[] | null>(null);
  const [suma, setSuma] = useState<number | null>(null);
  const [modal, setModal] = useState<{ tipo: 'create' | 'edit'; id: number | null } | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ type: 'error' | 'success' | 'info' | 'warning'; message: string } | null>(null);
  const [quitar, setQuitar] = useState<Item | null>(null);

  const cargar = useCallback(async (t: PestanaEstructura) => {
    if (t === 'documentos') return;
    setItems(null);
    try {
      const { data } = await api.get(`/admin/programas/${programaId}/${t}`);
      setItems(Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []);
      setSuma(typeof data?.suma_ponderacion === 'number' ? data.suma_ponderacion : null);
    } catch (e) {
      setItems([]);
      setAviso({ type: 'error', message: mensajeError(e, 'No se pudo cargar esta sección.') });
    }
  }, [programaId]);
  // Antes la pestaña «Preguntas» nunca se cargaba (se excluía del efecto): siempre aparecía vacía.
  useEffect(() => { void cargar(tab); }, [tab, cargar]);

  const guardar = async () => {
    if (!modal) return;
    setGuardando(true);
    try {
      const url = `/admin/programas/${programaId}/${tab}`;
      const payload = { ...form };
      if (tab === 'campos' && !payload.nombre_campo) payload.nombre_campo = slugify(String(payload.etiqueta ?? ''));
      if ((tab === 'rubros' || tab === 'modalidades') && !payload.clave) payload.clave = slugify(String(payload.nombre ?? '')).toUpperCase().slice(0, 20);
      if (tab === 'campos' && payload.tipo_campo !== 'select') delete payload.opciones;
      delete payload.en_uso; delete payload.opciones_json;
      if (modal.tipo === 'create') await api.post(url, payload);
      else await api.put(`${url}/${modal.id}`, payload);
      setModal(null);
      setAviso({ type: 'success', message: modal.tipo === 'create' ? `${TITULO[tab].que.replace(/^(la|el) /, '').replace(/^./, (c) => c.toUpperCase())} agregado.` : 'Cambios guardados.' });
      void cargar(tab);
    } catch (e) {
      setAviso({ type: 'error', message: mensajeError(e, 'No se pudo guardar. Inténtalo de nuevo.') });
    } finally {
      setGuardando(false);
    }
  };

  const ejecutarQuitar = async () => {
    const it = quitar;
    setQuitar(null);
    if (!it) return;
    try {
      const { data } = await api.delete(`/admin/programas/${programaId}/${tab}/${it.id}`);
      setAviso({ type: data?.resultado === 'oculto' ? 'info' : 'success', message: typeof data?.message === 'string' ? data.message : 'Listo.' });
      void cargar(tab);
    } catch (e) {
      setAviso({ type: 'error', message: mensajeError(e, 'No se pudo quitar. Inténtalo de nuevo.') });
    }
  };

  const mostrar = async (it: Item) => {
    try {
      await api.put(`/admin/programas/${programaId}/${tab}/${it.id}`, { activo: true });
      setAviso({ type: 'success', message: 'Se volvió a mostrar.' });
      void cargar(tab);
    } catch (e) {
      setAviso({ type: 'error', message: mensajeError(e, 'No se pudo volver a mostrar.') });
    }
  };

  const nombre = (it: Item) => String(it.etiqueta || it.nombre || it.nombre_campo || it.clave || '');

  return (
    <div className="space-y-4">
      {aviso && <AlertBox type={aviso.type} message={aviso.message} onClose={() => setAviso(null)} />}
      {pestanas.length > 1 && (
        <div className="seg-tabs flex gap-1 overflow-x-auto" role="tablist" aria-label="Estructura">
          {pestanas.map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setAviso(null); }}
              className="whitespace-nowrap px-3 py-2 text-sm font-semibold">{ETIQUETA[t]}</button>
          ))}
        </div>
      )}

      {tab === 'documentos' ? <DocumentosPrograma programaId={String(programaId)} /> : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button onClick={() => { setForm({ ...VACIO[tab], orden: (items?.length ?? 0) + 1 }); setModal({ tipo: 'create', id: null }); }}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Agregar
            </Button>
            {CON_CUIDADO.includes(tab) && <p className="text-xs text-[var(--app-ink-2)]">Lo que ya tiene datos capturados se oculta en lugar de borrarse.</p>}
          </div>
          {tab === 'criterios' && suma !== null && Math.abs(suma - 100) > 0.01 && (
            <p role="alert" className="flex items-center gap-2 rounded-[12px] px-3 py-2 text-sm" style={{ backgroundColor: 'var(--tile-gold-bg)', color: 'var(--app-ink)' }}>
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />Los pesos de los criterios visibles suman {suma}%: deben sumar 100% para evaluar.
            </p>
          )}
          {items === null ? (
            <div className="grid place-items-center py-10"><Loader2 className="h-6 w-6 animate-spin" aria-label="Cargando" /></div>
          ) : items.length === 0 ? (
            <div className="empty-state">
              <span className="tone-chip" data-tone="violet"><Inbox aria-hidden="true" /></span>
              <p className="font-bold text-[var(--app-ink)]">Sin registros todavía</p>
              <p className="text-sm text-[var(--app-ink-2)]">Usa «Agregar» para crear el primero.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tab === 'campos' ? 'Pregunta' : 'Nombre'}</TableHead>
                  {tab === 'campos' && <><TableHead>Tipo de respuesta</TableHead><TableHead>Obligatoria</TableHead></>}
                  {tab === 'criterios' && <><TableHead>Calificación máxima</TableHead><TableHead>Peso</TableHead></>}
                  {tab === 'etapas' && <TableHead>Duración</TableHead>}
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id} style={{ opacity: it.activo === false ? 0.65 : 1 }}>
                    <TableCell className="font-medium whitespace-normal">{nombre(it)}</TableCell>
                    {tab === 'campos' && <>
                      <TableCell><Badge variant="outline">{TIPO_CAMPO[it.tipo_campo] ?? it.tipo_campo}</Badge></TableCell>
                      <TableCell>{it.requerido ? <Check className="h-4 w-4" style={{ color: 'var(--tile-emerald-fg)' }} aria-label="Obligatoria" /> : '—'}</TableCell>
                    </>}
                    {tab === 'criterios' && <><TableCell>{it.puntaje_maximo}</TableCell><TableCell>{it.ponderacion}%</TableCell></>}
                    {tab === 'etapas' && <TableCell>{it.duracion_meses || '—'} meses</TableCell>}
                    <TableCell>
                      <span className="flex flex-wrap gap-1">
                        {it.activo === false ? <span className="pill" data-tone="neutral"><EyeOff className="h-3 w-3" aria-hidden="true" />Oculto</span> : <span className="pill" data-tone="emerald">Visible</span>}
                        {it.en_uso && <span className="pill" data-tone="sky" title="Ya tiene datos capturados">Tiene datos</span>}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {it.activo === false && (
                          <Button variant="outline" size="sm" onClick={() => void mostrar(it)}><Eye className="h-4 w-4" aria-hidden="true" />Volver a mostrar</Button>
                        )}
                        <Button variant="soft" size="icon-sm" aria-label={`Editar ${nombre(it)}`} title="Editar"
                          onClick={() => { setForm({ ...it, opciones: opcionesATexto(it.opciones_json) }); setModal({ tipo: 'edit', id: it.id }); }}><Edit /></Button>
                        {!(it.activo === false && it.en_uso) && (
                          <Button variant="destructive" size="icon-sm" aria-label={`Quitar ${nombre(it)}`} title="Quitar" onClick={() => setQuitar(it)}><Trash2 /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      <NestedCRUDModal
        isOpen={modal !== null}
        title={modal?.tipo === 'create' ? TITULO[tab].create : TITULO[tab].edit}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fields={campos(tab) as any}
        formData={form}
        onFormChange={setForm}
        onSave={guardar}
        onClose={() => setModal(null)}
        loading={guardando}
      />
      <ConfirmDialog
        open={quitar !== null}
        variant="destructive"
        title={`¿Quitar ${TITULO[tab].que}?`}
        description={quitar?.en_uso
          ? `«${quitar ? nombre(quitar) : ''}» ya tiene datos capturados: se ocultará para las solicitudes nuevas y se conservarán los datos. Podrás volver a mostrarlo.`
          : `«${quitar ? nombre(quitar) : ''}» todavía no tiene datos: se eliminará.`}
        confirmLabel={quitar?.en_uso ? 'Ocultar' : 'Eliminar'}
        onConfirm={() => void ejecutarQuitar()}
        onCancel={() => setQuitar(null)}
      />
    </div>
  );
}
