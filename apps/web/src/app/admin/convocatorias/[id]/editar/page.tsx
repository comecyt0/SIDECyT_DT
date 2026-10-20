'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Megaphone } from 'lucide-react';
import EstructuraPrograma, { type PestanaEstructura } from '@/components/admin/EstructuraPrograma';
import ConfigEspecieForm, { SECCIONES_ESPECIE, SECCION_DE_ERROR, type SeccionEspecie } from '@/components/admin/especie/ConfigEspecieForm';
import PageHeader from '@/components/ui/page-header';
import api from '@/lib/api';
import { AlertBox } from '@/components/ui/alert-box';
import StepFrame, { type StepDef } from '@/components/ui/step-frame';
import AvisoErrores from '@/components/ui/aviso-errores';
import { erroresFormulario, type ErroresFormulario } from '@/lib/errores-formulario';
import { Button } from '@/components/ui/button';
import { Asterisco } from '@/components/ui/obligatorio';
import { PATRON_CORTO, normalizarCorto, sugerirCorto } from '@/lib/asistente-convocatoria';
import { leerConfig, payloadCampos, payloadConfig, validarConfig, type ConfigEspecie } from '@/lib/especie';

const labelCls = 'text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest';
const inputCls = 'auth-input auth-input-static pl-4';

/** Pasos de «lo que se pide» (se guardan al momento, cada elemento por separado — E56). */
const PASOS_ESTRUCTURA: { key: PestanaEstructura; label: string; question: string }[] = [
  { key: 'campos', label: 'Preguntas', question: '¿Qué preguntas responde cada solicitud?' },
  { key: 'documentos', label: 'Documentos', question: '¿Qué documentos se piden?' },
  { key: 'rubros', label: 'Conceptos de gasto', question: '¿En qué se puede usar el apoyo?' },
  { key: 'criterios', label: 'Criterios', question: '¿Con qué criterios se evalúa?' },
];

/** Sección del formulario de clubes donde se corrige un error del servidor (`etapas.0.nombre` → etapas). */
function seccionDeCampo(campo: string): SeccionEspecie {
  const raiz = campo.split('.')[0];
  if (SECCION_DE_ERROR[raiz]) return SECCION_DE_ERROR[raiz];
  if (raiz.startsWith('transporte_') || raiz.startsWith('incluye_') || raiz === 'fecha_limite_logistica') return 'logistica';
  if (raiz.startsWith('kit')) return 'kit';
  if (raiz === 'formatos') return 'formatos';
  if (raiz.startsWith('campos')) return 'datos';
  return 'modalidad';
}

const AVISO_INMEDIATO = 'Lo de este paso se guarda al momento (agregar, editar o quitar); no espera a «Guardar cambios».';

export default function EditarConvocatoriaPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'error'|'success'|'info'|'warning', message: string}|null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    // E58: nombre corto (va dentro de los folios nuevos).
    nombre_corto: '',
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
  // E58: con clubes o solicitudes ya registrados, el nombre corto queda fijo (los folios lo llevan dentro).
  const [cortoFijo, setCortoFijo] = useState(false);
  // 20/10/2026 (pedido del usuario: editar por pasos): la configuración de clubes y kit va en sus propios pasos y se
  // guarda con «Guardar cambios», junto con los datos generales.
  const [cfgEsp, setCfgEsp] = useState<ConfigEspecie | null>(null);
  const [etapasFijas, setEtapasFijas] = useState(false);
  const [erroresEsp, setErroresEsp] = useState<Record<string, string>>({});
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
        nombre_corto: typeof data.nombre_corto === 'string' ? data.nombre_corto : '',
        ejercicio_fiscal: data.ejercicio_fiscal,
        descripcion: data.descripcion || '',
        fecha_apertura: String(data.fecha_apertura ?? '').slice(0, 10),
        fecha_cierre: String(data.fecha_cierre ?? '').slice(0, 10),
        monto_maximo_apoyo: data.monto_maximo_apoyo != null ? String(data.monto_maximo_apoyo) : '',
        porcentaje_aportacion_minima: data.porcentaje_aportacion_minima != null ? String(data.porcentaje_aportacion_minima) : '',
        estado: data.estado,
        periodo_id: data.periodo_id ? String(data.periodo_id) : '',
      });
      const especie = data?.tipo_programa?.tipo_apoyo === 'especie';
      setEsEspecie(especie);
      setCortoFijo(data?.tiene_registros === true);
      setTipoProgramaId(typeof data?.tipo_programa?.id === 'number' ? data.tipo_programa.id : null);
      if (especie) {
        const { data: esp } = await api.get(`/admin/convocatorias/${id}/especie`);
        setCfgEsp(leerConfig(esp));
        setEtapasFijas(esp?.etapas_fijas === true);
      }
    } catch {
      setFeedback({ type: 'error', message: 'No se pudo abrir la convocatoria.' });
      router.push('/admin/convocatorias');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setErrorGuardar(null);
    // Con pasos libres se puede llegar a «Guardar» sin pasar por todos: se revisa todo lo de clubes antes de enviar.
    if (cfgEsp) {
      const e = validarConfig(cfgEsp);
      setErroresEsp(e);
      const claves = Object.keys(e);
      if (claves.length) {
        setErrorGuardar({ titulo: 'Revisa lo marcado antes de guardar', lineas: Object.values(e), campos: e, paso: seccionDeCampo(claves[0]) });
        return;
      }
    }
    setSaving(true);
    let pasoEsp = false;
    try {
      const cuerpo: Record<string, unknown> = { ...formData, periodo_id: formData.periodo_id ? Number(formData.periodo_id) : null };
      if (esEspecie) { delete cuerpo.monto_maximo_apoyo; delete cuerpo.porcentaje_aportacion_minima; }
      if (cortoFijo) delete cuerpo.nombre_corto;
      await api.put(`/admin/convocatorias/${id}`, cuerpo);
      if (cfgEsp) {
        pasoEsp = true;
        await api.put(`/admin/convocatorias/${id}/especie`, { ...payloadConfig(cfgEsp), campos: payloadCampos(cfgEsp) });
      }
      setFeedback({ type: 'success', message: 'Convocatoria actualizada.' });
      router.push(`/admin/convocatorias/${id}`);
    } catch (error: unknown) {
      if (pasoEsp) {
        const r = erroresFormulario(error, {}, {});
        const primero = Object.keys((error as { response?: { data?: { errors?: Record<string, unknown> } } })?.response?.data?.errors ?? {})[0];
        setErrorGuardar({ ...r, titulo: 'Los datos generales se guardaron; falta corregir esto de clubes y kit', paso: primero ? seccionDeCampo(primero) : 'modalidad' });
        return;
      }
      setErrorGuardar(erroresFormulario(error,
        { nombre: 'Nombre', nombre_corto: 'Nombre corto', ejercicio_fiscal: 'Ejercicio fiscal', periodo_id: 'Periodo', descripcion: 'Descripción', fecha_apertura: 'Abre el',
          fecha_cierre: 'Cierra el', monto_maximo_apoyo: 'Monto máximo', porcentaje_aportacion_minima: 'Aportación mínima', estado: 'Estado' },
        { nombre: 'nombre', nombre_corto: 'nombre', ejercicio_fiscal: 'nombre', periodo_id: 'nombre', descripcion: 'nombre', fecha_apertura: 'fechas', fecha_cierre: 'fechas',
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

  // 20/10/2026 (pedido del usuario: «al editar la convocatoria todo debe ir por pasos»): lo que antes iba apilado abajo
  // (clubes y kit, documentos, preguntas, conceptos de gasto y criterios) ahora es un paso más del mismo marco.
  const avisoInmediato = <p className="rounded-[12px] px-3 py-2 text-xs text-[var(--app-ink)]" style={{ backgroundColor: 'var(--tile-sky-bg)' }}>{AVISO_INMEDIATO}</p>;
  const pasosExtra: StepDef[] = [
    ...(cfgEsp ? SECCIONES_ESPECIE.map((s): StepDef => ({
      key: s.key,
      label: s.label,
      question: s.question,
      validate: () => {
        const e = validarConfig(cfgEsp);
        const propio = Object.entries(e).find(([k]) => seccionDeCampo(k) === s.key);
        return propio ? propio[1] : null;
      },
      content: <ConfigEspecieForm idBase="conv-esp" value={cfgEsp} onChange={setCfgEsp} errores={erroresEsp} etapasFijas={etapasFijas} secciones={[s.key]} />,
    })) : []),
    ...(tipoProgramaId ? PASOS_ESTRUCTURA.filter((p) => !esEspecie || p.key === 'documentos').map((p): StepDef => ({
      key: `estructura-${p.key}`,
      label: p.label,
      question: p.question,
      content: <>{avisoInmediato}<EstructuraPrograma programaId={tipoProgramaId} pestanas={[p.key]} /></>,
    })) : []),
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
        libre
        size="xl"
        title="Ajustar la convocatoria"
        icon={<Megaphone className="h-5 w-5" />}
        intro={<>Ve paso por paso o <strong>pulsa cualquier paso</strong> para ir directo. «Guardar cambios» (en el último paso) guarda los datos generales{esEspecie ? ' y la configuración de clubes y kit' : ''}; lo que se pide (documentos{esEspecie ? '' : ', preguntas, conceptos de gasto y criterios'}) se guarda al momento.</>}
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
              if (!cortoFijo && !PATRON_CORTO.test(formData.nombre_corto)) return 'Escribe el nombre corto: de 3 a 12 letras o números, sin espacios (p. ej. LEGO26).';
              return null;
            },
            content: (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="nombre" className={labelCls}>Nombre <Asterisco /></Label>
                  <input id="nombre" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nombre_corto" className={labelCls}>Nombre corto {!cortoFijo && <Asterisco />}</Label>
                  <div className="flex gap-2">
                    <input id="nombre_corto" maxLength={12} autoCapitalize="characters" spellCheck={false} disabled={cortoFijo} placeholder="LEGO26"
                      value={formData.nombre_corto} aria-describedby="nombre_corto_ayuda"
                      onChange={(e) => setFormData({ ...formData, nombre_corto: normalizarCorto(e.target.value).replace(/[^A-Z0-9]/g, '').slice(0, 12) })}
                      className={`${inputCls} min-w-0 flex-1 font-mono uppercase`} />
                    {!cortoFijo && (
                      <Button type="button" variant="outline" size="sm" className="shrink-0 self-center" disabled={!sugerirCorto(formData.nombre, formData.ejercicio_fiscal)}
                        onClick={() => setFormData({ ...formData, nombre_corto: sugerirCorto(formData.nombre, formData.ejercicio_fiscal) })}>Sugerir</Button>
                    )}
                  </div>
                  <p id="nombre_corto_ayuda" className="text-xs text-[var(--app-ink-2)]">
                    {cortoFijo
                      ? 'Ya hay registros con folio en esta convocatoria: el nombre corto ya no se puede cambiar.'
                      : <>Va dentro del folio de cada registro nuevo: <span className="font-mono font-semibold">{esEspecie ? 'CLUB' : 'COMECYT'}-{formData.nombre_corto || 'LEGO26'}-F0BMIW</span>.</>}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="ejercicio_fiscal" className={labelCls}>Ejercicio fiscal <Asterisco /></Label>
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
                  <Label htmlFor="fecha_apertura" className={labelCls}>Abre el <Asterisco /></Label>
                  <input id="fecha_apertura" type="date" value={formData.fecha_apertura} onChange={(e) => setFormData({ ...formData, fecha_apertura: e.target.value })} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fecha_cierre" className={labelCls}>Cierra el <Asterisco /></Label>
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
          // E56: agregar, editar y quitar lo que se pide. Quitar algo que ya tiene datos lo oculta (lo capturado se conserva).
          ...pasosExtra,
        ]}
      />
    </div>
  );
}
