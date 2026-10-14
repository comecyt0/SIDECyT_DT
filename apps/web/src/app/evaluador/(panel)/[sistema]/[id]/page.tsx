'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ClipboardCheck, Download, Eye, FileText, Lock, Send } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import PastelFrame from '@/components/ui/pastel-frame';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Asterisco } from '@/components/ui/obligatorio';
import { useVistaPrevia } from '@/components/ui/VistaPreviaProvider';
import {
  type Expediente, type Sistema, NOMBRE_SISTEMA, descargarDictamenSigae, diasRestantes, documento, enviarDictamen, expediente, iniciar,
} from '@/lib/evaluacionCompartida';

const MIN_COMENTARIO = 20;

export default function EvaluarPage({ params }: { params: Promise<{ sistema: string; id: string }> }) {
  const { sistema: s, id: idTexto } = use(params);
  if ((s !== 'sigae' && s !== 'sicei') || !/^\d{1,10}$/.test(idTexto)) notFound();
  const sistema = s as Sistema;
  const id = Number(idTexto);
  const { ver } = useVistaPrevia();

  const [exp, setExp] = useState<Expediente | null>(null);
  const [falla, setFalla] = useState<{ motivo: string; mensaje?: string } | null>(null);
  const [puntajes, setPuntajes] = useState<Record<string, string>>({});
  const [comentario, setComentario] = useState('');
  const [carta, setCarta] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [hecho, setHecho] = useState(false);

  const cargar = async () => {
    const r = await expediente(sistema, id);
    if (!r.ok) { setFalla({ motivo: r.motivo, mensaje: r.mensaje }); return; }
    setExp(r.datos);
    if (r.datos.estado === 'asignado') iniciar(sistema, id).catch(() => {});
  };
  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sin rúbrica (solo SICEI): una calificación de 0 a 100
  const criterios = useMemo(() => (exp && exp.rubrica.criterios.length > 0
    ? exp.rubrica.criterios
    : [{ clave: 'puntaje', nombre: 'Calificación', max: 100 }]), [exp]);
  const sinRubrica = !!exp && exp.rubrica.criterios.length === 0;
  const total = criterios.reduce((acc, c) => acc + (Number(puntajes[c.clave]) || 0), 0);
  const maximo = exp?.rubrica.maximo ?? 100;
  const porcentaje = maximo > 0 ? Math.round((total * 1000) / maximo) / 10 : 0;

  const validar = (): string[] => {
    const e: string[] = [];
    for (const c of criterios) {
      const v = puntajes[c.clave];
      const n = Number(v);
      if (v === undefined || v === '' || Number.isNaN(n)) e.push(`Califica «${c.nombre}».`);
      else if (n < 0 || n > c.max) e.push(`«${c.nombre}» va de 0 a ${c.max}.`);
    }
    if (comentario.trim().length < MIN_COMENTARIO) e.push(`La justificación debe tener al menos ${MIN_COMENTARIO} caracteres.`);
    if (!carta) e.push('Acepta la carta de imparcialidad.');
    return e;
  };

  const pedirConfirmacion = () => {
    const e = validar();
    setErrores(e);
    if (e.length === 0) setConfirmar(true);
  };

  const enviar = async () => {
    setConfirmar(false);
    setEnviando(true);
    const numeros = Object.fromEntries(criterios.map((c) => [c.clave, Number(puntajes[c.clave])]));
    const r = await enviarDictamen(sistema, id, numeros, comentario.trim(), sinRubrica);
    setEnviando(false);
    if (r.ok) { setHecho(true); setErrores([]); cargar(); return; }
    setErrores(r.errores ? Object.values(r.errores).flat() : [r.mensaje ?? 'No se pudo enviar el dictamen.']);
  };

  if (falla) {
    return (
      <PastelFrame tone="blush" title={falla.motivo === 'no_encontrado' ? 'Esta evaluación no existe o no es tuya' : falla.motivo === 'sin_sesion' ? `Tu sesión de ${NOMBRE_SISTEMA[sistema]} terminó` : 'No se pudo abrir la evaluación'}
        description={falla.motivo === 'sin_sesion' ? 'Vuelve al panel para iniciar sesión.' : falla.mensaje}>
        <Link href={`/evaluador?sistema=${sistema}`} className="text-sm font-semibold text-primary underline">Volver a mis evaluaciones</Link>
      </PastelFrame>
    );
  }
  if (!exp) return <div className="h-64 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />;

  const d = diasRestantes(exp.fecha_limite);
  const soloLectura = !exp.puede_enviar;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${NOMBRE_SISTEMA[sistema]} · ${exp.folio}`}
        title={exp.titulo ?? exp.convocatoria}
        description={`${exp.convocatoria}${exp.solicitante ? ` · ${exp.solicitante}` : ''}`}
        icon={<ClipboardCheck className="h-5 w-5" />}
        backHref={`/evaluador?sistema=${sistema}`}
        backLabel="Mis evaluaciones"
      />

      {exp.estado === 'vencida' && (
        <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-200">
          La fecha límite venció. Ya no se puede enviar el dictamen; pide a la administración que la amplíe.
        </div>
      )}
      {hecho && <div role="status" className="rounded-2xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-sm text-emerald-800 dark:text-emerald-200">Tu dictamen se envió. Gracias por tu evaluación.</div>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Expediente: respuestas y documentos, sin datos personales del solicitante */}
        <div className="space-y-6 min-w-0">
          {exp.respuestas.map((sec, i) => (
            <PastelFrame key={i} tone="powder" title={sec.titulo || 'Respuestas'}>
              <dl className="grid gap-3">
                {sec.campos.map((c, j) => (
                  <div key={j} className="grid gap-1">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{c.etiqueta}</dt>
                    <dd className="whitespace-pre-wrap break-words text-sm text-neutral-900 dark:text-neutral-100">{c.valor ?? '—'}</dd>
                  </div>
                ))}
              </dl>
            </PastelFrame>
          ))}
          <PastelFrame tone="lavender" title="Documentos">
            {exp.documentos.length === 0 ? <p className="text-sm text-neutral-500">Esta solicitud no tiene documentos para evaluar.</p> : (
              <ul className="grid gap-2">
                {exp.documentos.map((doc) => (
                  <li key={doc.id} className="flex items-center gap-3 rounded-xl border border-neutral-200 dark:border-neutral-700 px-3 py-2">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{doc.requisito}</p>
                      <p className="truncate text-xs text-neutral-500">{doc.nombre}</p>
                    </div>
                    <Button variant="soft" size="sm" icon={<Eye className="h-4 w-4" />}
                      onClick={() => ver({ nombre: doc.nombre, cargar: async () => ({ data: await documento(sistema, id, doc), tipo: 'application/pdf' }) })}>
                      Ver
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </PastelFrame>
        </div>

        {/* Rúbrica y dictamen */}
        <div className="lg:sticky lg:top-24 h-fit">
          <PastelFrame tone="butter" title={soloLectura ? 'Mi dictamen' : 'Rúbrica'}
            description={exp.fecha_limite && exp.estado !== 'concluido'
              ? `Fecha límite: ${exp.fecha_limite}${d !== null && d >= 0 ? (d === 0 ? ' (hoy)' : ` (${d} día${d === 1 ? '' : 's'})`) : ''}`
              : undefined}>
            {exp.mi_dictamen ? (
              <div className="grid gap-3 text-sm">
                <p className="inline-flex items-center gap-2 font-semibold"><Lock className="h-4 w-4" />Enviado — no se puede modificar</p>
                {criterios.map((c) => (
                  <div key={c.clave} className="flex justify-between gap-3"><span>{c.nombre}</span>
                    <strong>{exp.mi_dictamen?.criterios?.[c.clave] ?? (sinRubrica ? exp.mi_dictamen?.puntaje : '—')} / {c.max}</strong></div>
                ))}
                <div className="flex justify-between border-t pt-2"><span>Total</span><strong>{exp.mi_dictamen.puntaje} / {maximo}</strong></div>
                {exp.mi_dictamen.comentario && <p className="whitespace-pre-wrap break-words text-neutral-700 dark:text-neutral-300">{exp.mi_dictamen.comentario}</p>}
                {sistema === 'sigae' && exp.mi_dictamen.id && (
                  <Button variant="soft" size="sm" icon={<Download className="h-4 w-4" />}
                    onClick={async () => { if (!(await descargarDictamenSigae(exp.mi_dictamen!.id!, `Dictamen_${exp.folio}.pdf`))) setErrores(['No se pudo descargar el PDF del dictamen.']); }}>
                    Descargar dictamen (PDF)
                  </Button>
                )}
                {errores.length > 0 && <p role="alert" className="text-sm text-red-700">{errores[0]}</p>}
              </div>
            ) : (
              <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); pedirConfirmacion(); }} noValidate>
                {criterios.map((c) => (
                  <label key={c.clave} className="grid gap-1 text-sm">
                    <span className="font-medium">{c.nombre} <span className="text-neutral-500">(0 a {c.max})</span><Asterisco /></span>
                    {c.descripcion && <span className="text-xs text-neutral-500">{c.descripcion}</span>}
                    <input type="number" inputMode="decimal" min={0} max={c.max} step={0.5} disabled={soloLectura}
                      value={puntajes[c.clave] ?? ''} onChange={(e) => setPuntajes((p) => ({ ...p, [c.clave]: e.target.value }))}
                      className="rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-3 py-2" />
                  </label>
                ))}
                <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/60 p-3 text-sm">
                  <div className="flex justify-between"><span>Total</span><strong>{Math.round(total * 100) / 100} / {maximo}</strong></div>
                  <div className="mt-1 flex justify-between text-neutral-600 dark:text-neutral-300"><span>Equivale a</span><span>{porcentaje} % (mínimo aprobatorio de la convocatoria: {exp.rubrica.minimo_aprobatorio} %)</span></div>
                  <p className="mt-2 text-xs text-neutral-500">Tu dictamen no decide el resultado: la administración decide con el promedio de todas las evaluaciones.</p>
                </div>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Justificación<Asterisco /></span>
                  <textarea rows={6} maxLength={2000} disabled={soloLectura} value={comentario} onChange={(e) => setComentario(e.target.value)}
                    className="rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-3 py-2" />
                  <span className="text-xs text-neutral-500">{comentario.trim().length}/2000 · mínimo {MIN_COMENTARIO}</span>
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-1" checked={carta} disabled={soloLectura} onChange={(e) => setCarta(e.target.checked)} />
                  <span>Declaro bajo protesta de decir verdad que no tengo conflicto de interés con esta solicitud ni con quien la presenta, y que mi evaluación es independiente y confidencial (carta de imparcialidad).<Asterisco /></span>
                </label>
                {errores.length > 0 && (
                  <ul role="alert" className="grid gap-1 rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-800 dark:text-red-200">
                    {errores.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
                <Button type="submit" disabled={soloLectura || enviando} icon={<Send className="h-4 w-4" />}>{enviando ? 'Enviando…' : 'Enviar dictamen'}</Button>
              </form>
            )}
          </PastelFrame>
        </div>
      </div>

      <ConfirmDialog
        open={confirmar}
        title="¿Enviar tu dictamen?"
        description={`Total ${Math.round(total * 100) / 100} de ${maximo}. Una vez enviado no se puede modificar (solo la administración puede reabrirlo).`}
        confirmLabel="Sí, enviar"
        onConfirm={enviar}
        onCancel={() => setConfirmar(false)}
      />
    </div>
  );
}
