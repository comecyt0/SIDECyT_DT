'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Megaphone, ListChecks } from 'lucide-react';
import EstructuraPrograma from '@/components/admin/EstructuraPrograma';
import EspecieConvocatoriaPanel from '@/components/admin/especie/EspecieConvocatoriaPanel';
import PageHeader from '@/components/ui/page-header';
import api from '@/lib/api';
import { AlertBox } from '@/components/ui/alert-box';
import StepFrame from '@/components/ui/step-frame';
import AvisoErrores from '@/components/ui/aviso-errores';
import { erroresFormulario, type ErroresFormulario } from '@/lib/errores-formulario';

const labelCls = 'text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest';
const inputCls = 'auth-input auth-input-static pl-4';

export default function EditarConvocatoriaPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'error'|'success'|'info'|'warning', message: string}|null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    ejercicio_fiscal: '',
    descripcion: '',
    fecha_apertura: '',
    fecha_cierre: '',
    monto_maximo_apoyo: '',
    porcentaje_aportacion_minima: '',
    estado: 'borrador',
    // E45: periodo de la convocatoria.
    periodo_id: '',
  });
  const [periodos, setPeriodos] = useState<{ id: number; nombre: string; activo: boolean }[]>([]);
  // Error al guardar, dentro del formulario y en el paso del campo. Antes se leía `data.error` (Laravel manda
  // `message`/`errors`), así que siempre salía un texto genérico sin decir qué corregir.
  const [errorGuardar, setErrorGuardar] = useState<ErroresFormulario | null>(null);
  // E52: en Apoyo en especie no hay montos (los clubes y el kit se editan en la ficha).
  const [esEspecie, setEsEspecie] = useState(false);
  // E56: configuración técnica de esta convocatoria (preguntas, documentos, conceptos de gasto y criterios).
  const [tipoProgramaId, setTipoProgramaId] = useState<number | null>(null);
  useEffect(() => {
    api.get('/admin/periodos').then(({ data }) => setPeriodos(Array.isArray(data) ? data : [])).catch(() => setPeriodos([]));
  }, []);

  useEffect(() => {
    fetchConvocatoria();
  }, [id]);

  const fetchConvocatoria = async () => {
    try {
      const { data } = await api.get(`/admin/convocatorias/${id}`);
      setFormData({
        nombre: data.nombre,
        ejercicio_fiscal: data.ejercicio_fiscal,
        descripcion: data.descripcion || '',
        fecha_apertura: String(data.fecha_apertura ?? '').slice(0, 10),
        fecha_cierre: String(data.fecha_cierre ?? '').slice(0, 10),
        monto_maximo_apoyo: data.monto_maximo_apoyo != null ? String(data.monto_maximo_apoyo) : '',
        porcentaje_aportacion_minima: data.porcentaje_aportacion_minima != null ? String(data.porcentaje_aportacion_minima) : '',
        estado: data.estado,
        periodo_id: data.periodo_id ? String(data.periodo_id) : '',
      });
      setEsEspecie(data?.tipo_programa?.tipo_apoyo === 'especie');
      setTipoProgramaId(typeof data?.tipo_programa?.id === 'number' ? data.tipo_programa.id : null);
    } catch {
      setFeedback({ type: 'error', message: 'No se pudo abrir la convocatoria.' });
      router.push('/admin/convocatorias');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    setErrorGuardar(null);
    try {
      const cuerpo: Record<string, unknown> = { ...formData, periodo_id: formData.periodo_id ? Number(formData.periodo_id) : null };
      if (esEspecie) { delete cuerpo.monto_maximo_apoyo; delete cuerpo.porcentaje_aportacion_minima; }
      await api.put(`/admin/convocatorias/${id}`, cuerpo);
      setFeedback({ type: 'success', message: 'Convocatoria actualizada.' });
      router.push(`/admin/convocatorias/${id}`);
    } catch (error: unknown) {
      setErrorGuardar(erroresFormulario(error,
        { nombre: 'Nombre', ejercicio_fiscal: 'Ejercicio fiscal', periodo_id: 'Periodo', descripcion: 'Descripción', fecha_apertura: 'Abre el',
          fecha_cierre: 'Cierra el', monto_maximo_apoyo: 'Monto máximo', porcentaje_aportacion_minima: 'Aportación mínima', estado: 'Estado' },
        { nombre: 'nombre', ejercicio_fiscal: 'nombre', periodo_id: 'nombre', descripcion: 'nombre', fecha_apertura: 'fechas', fecha_cierre: 'fechas',
          monto_maximo_apoyo: 'montos', porcentaje_aportacion_minima: 'montos', estado: 'montos' }));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-primary">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {feedback && <AlertBox type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}
      <PageHeader
        backHref={`/admin/convocatorias/${id}`}
        backLabel="Volver a la ficha"
        eyebrow="Convocatoria"
        title="Editar convocatoria"
        description={formData.nombre}
      />

      <StepFrame
        inline
        title="Ajustar la convocatoria"
        icon={<Megaphone className="h-5 w-5" />}
        intro={<>Aquí cambias <strong>nombre, fechas, montos y estado</strong>. Las preguntas, documentos{esEspecie ? ' y datos de los clubes' : ', conceptos de gasto y criterios'} se agregan y quitan más abajo.</>}
        onClose={() => router.push('/admin/convocatorias')}
        onSubmit={handleSubmit}
        error={errorGuardar ? <AvisoErrores errores={errorGuardar} /> : null}
        errorStep={errorGuardar?.paso ?? null}
        submitting={saving}
        submitLabel="Guardar cambios"
        steps={[
          {
            key: 'nombre',
            label: 'Nombre',
            question: '¿Cómo se llama y de qué año es?',
            validate: () => {
              if (!formData.nombre.trim()) return 'Escribe el nombre de la convocatoria.';
              if (!/^\d{4}$/.test(formData.ejercicio_fiscal)) return 'El ejercicio fiscal son 4 dígitos, por ejemplo 2026.';
              return null;
            },
            content: (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="nombre" className={labelCls}>Nombre *</Label>
                  <input id="nombre" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className={inputCls} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="ejercicio_fiscal" className={labelCls}>Ejercicio fiscal *</Label>
                    <input id="ejercicio_fiscal" inputMode="numeric" maxLength={4} value={formData.ejercicio_fiscal} onChange={(e) => setFormData({ ...formData, ejercicio_fiscal: e.target.value })} className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="periodo_id" className={labelCls}>Periodo</Label>
                    <select id="periodo_id" value={formData.periodo_id} onChange={(e) => setFormData({ ...formData, periodo_id: e.target.value })} className="h-11 w-full">
                      <option value="">Sin periodo</option>
                      {periodos.filter((p) => p.activo || String(p.id) === formData.periodo_id).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="descripcion" className={labelCls}>Descripción breve (opcional)</Label>
                  <Textarea id="descripcion" className="min-h-[100px] rounded-[var(--auth-radius-field)]" style={{ background: 'var(--auth-field)' }} value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} />
                </div>
              </>
            ),
          },
          {
            key: 'fechas',
            label: 'Fechas',
            question: '¿Cuándo abre y cuándo cierra?',
            validate: () => {
              if (!formData.fecha_apertura || !formData.fecha_cierre) return 'Indica las dos fechas.';
              if (formData.fecha_cierre < formData.fecha_apertura) return 'El cierre no puede ser antes de la apertura.';
              return null;
            },
            content: (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fecha_apertura" className={labelCls}>Abre el *</Label>
                  <input id="fecha_apertura" type="date" value={formData.fecha_apertura} onChange={(e) => setFormData({ ...formData, fecha_apertura: e.target.value })} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fecha_cierre" className={labelCls}>Cierra el *</Label>
                  <input id="fecha_cierre" type="date" value={formData.fecha_cierre} onChange={(e) => setFormData({ ...formData, fecha_cierre: e.target.value })} className={inputCls} />
                  <p className="text-xs text-[var(--app-ink-2)]">Al llegar esta fecha se cierra sola y ya no recibe solicitudes.</p>
                </div>
              </div>
            ),
          },
          {
            key: 'montos',
            label: esEspecie ? 'Estado' : 'Montos y estado',
            question: esEspecie ? '¿Está abierta?' : '¿Cuánto se apoya y está abierta?',
            content: (
              <>
                {!esEspecie && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="monto_maximo" className={labelCls}>Monto máximo por proyecto (MXN)</Label>
                    <input id="monto_maximo" type="number" min={0} value={formData.monto_maximo_apoyo} onChange={(e) => setFormData({ ...formData, monto_maximo_apoyo: e.target.value })} className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="porcentaje_minimo" className={labelCls}>Aportación mínima del solicitante (%)</Label>
                    <input id="porcentaje_minimo" type="number" min={0} max={100} value={formData.porcentaje_aportacion_minima} onChange={(e) => setFormData({ ...formData, porcentaje_aportacion_minima: e.target.value })} className={inputCls} />
                  </div>
                </div>}
                <div className="space-y-1.5">
                  <Label htmlFor="estado" className={labelCls}>Estado</Label>
                  <select id="estado" value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} className={inputCls}>
                    <option value="borrador">Borrador (nadie la ve todavía)</option>
                    <option value="activa">Publicada (se abre y se cierra sola según sus fechas)</option>
                    <option value="cerrada">Cerrada (ya no recibe, aunque falten días)</option>
                  </select>
                  <p className="text-xs text-[var(--app-ink-2)]">
                    Publicada se muestra en la página pública como <strong>Próxima a abrir</strong>, <strong>Abierta</strong>{' '}
                    o <strong>Cerrada</strong> según las fechas. Para ampliar el plazo usa «Dar prórroga» en la ficha;
                    el banner también se carga desde la ficha.
                  </p>
                </div>
              </>
            ),
          },
        ]}
      />

      {/* E56: agregar, editar y quitar lo que se pide en esta convocatoria. Quitar algo que ya tiene datos lo oculta. */}
      {tipoProgramaId && (
        <section className="app-card space-y-4 p-5" aria-labelledby="estructura-titulo">
          <div>
            <h2 id="estructura-titulo" className="flex items-center gap-2 text-base font-bold text-[var(--app-ink)]"><ListChecks className="h-5 w-5" style={{ color: 'var(--auth-vino)' }} aria-hidden="true" />Lo que se pide en esta convocatoria</h2>
            <p className="text-sm text-[var(--app-ink-2)]">
              Agrega o quita en cualquier momento. Si algo ya tiene respuestas, archivos o calificaciones, al quitarlo se oculta para
              las solicitudes nuevas y lo capturado se conserva.
            </p>
          </div>
          {esEspecie ? (
            <>
              <EspecieConvocatoriaPanel convocatoriaId={Number(id)} puedeEditar />
              <EstructuraPrograma programaId={tipoProgramaId} pestanas={['documentos']} />
            </>
          ) : (
            <EstructuraPrograma programaId={tipoProgramaId} pestanas={['campos', 'documentos', 'rubros', 'criterios']} />
          )}
        </section>
      )}
    </div>
  );
}
