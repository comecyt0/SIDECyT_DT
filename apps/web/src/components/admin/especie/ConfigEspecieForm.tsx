'use client';

/**
 * E52 · F1 — Configuración de una convocatoria de Apoyo en especie: integrantes (el líder cuenta), clubes por escuela,
 * menores, kit, datos predefinidos (no pedir / opcional / obligatorio) y preguntas adicionales del club o de cada
 * integrante. Lo usan el asistente "Nueva convocatoria" y la ficha de una convocatoria existente.
 * Componente controlado: no llama a la API.
 */

import { useState } from 'react';
import { Plus, Edit2, Trash2, Lock, Users, Package, ListChecks, MessageSquarePlus, ClipboardCheck, ArrowUp, ArrowDown, Globe2, Bus, Sandwich, FileSignature } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Asterisco } from '@/components/ui/obligatorio';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertBox } from '@/components/ui/alert-box';
import StepFrame from '@/components/ui/step-frame';
import RevisoresEtapa from '@/components/admin/especie/RevisoresEtapa';
import FechaHoraAmPm from '@/components/ui/fecha-hora-ampm';
import {
  CAMPOS_CLUB, CAMPOS_INTEGRANTE, FORMATOS, LIMITES_ESPECIE, MAX_ETAPAS, MODALIDADES, REVISA_ETIQUETA, TIPO_CAMPO_ETIQUETA, slugCampo,
  type Ambito, type Modalidad, type CampoEspecie, type ConfigEspecie, type EtapaEspecie, type Predef, type Revisa, type TipoCampoEspecie,
} from '@/lib/especie';

const labelCls = 'text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest';
const inputCls = 'auth-input auth-input-static pl-4';
const errStyle = { color: 'var(--auth-danger)' };

type Nivel = 'no' | 'opcional' | 'obligatorio';
const nivelDe = (p: Predef): Nivel => (p.obligatorio ? 'obligatorio' : p.pedir ? 'opcional' : 'no');
const predefDe = (n: Nivel): Predef => ({ pedir: n !== 'no', obligatorio: n === 'obligatorio' });
const NIVELES: { v: Nivel; t: string }[] = [{ v: 'no', t: 'No pedir' }, { v: 'opcional', t: 'Opcional' }, { v: 'obligatorio', t: 'Obligatorio' }];

function Seccion({ icon, titulo, ayuda, children }: { icon: React.ReactNode; titulo: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="tone-chip shrink-0" data-tone="violet" aria-hidden="true">{icon}</span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-[var(--app-ink)]">{titulo}</h3>
          {ayuda && <p className="text-xs text-[var(--app-ink-2)]">{ayuda}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/** Fila "dato → No pedir / Opcional / Obligatorio" (radios nativos: teclado y lector de pantalla). */
function FilaPredef({ id, etiqueta, valor, onChange }: { id: string; etiqueta: string; valor: Predef; onChange: (p: Predef) => void }) {
  const actual = nivelDe(valor);
  return (
    <div className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <span id={`${id}-lbl`} className="text-sm font-medium text-[var(--app-ink)]">{etiqueta}</span>
      <div role="radiogroup" aria-labelledby={`${id}-lbl`} className="inline-flex w-full rounded-full border p-0.5 sm:w-auto" style={{ borderColor: 'var(--app-rule)', backgroundColor: 'var(--auth-field)' }}>
        {NIVELES.map((n) => (
          <label key={n.v} className="flex-1 cursor-pointer sm:flex-none">
            <input type="radio" name={id} value={n.v} checked={actual === n.v} onChange={() => onChange(predefDe(n.v))} className="peer sr-only" />
            <span className="block whitespace-nowrap rounded-full px-3 py-1.5 text-center text-xs font-semibold text-[var(--app-ink-2)] transition-colors peer-checked:bg-[var(--auth-vino)] peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--auth-vino)]">
              {n.t}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function FilaFija({ etiqueta }: { etiqueta: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-2.5">
      <span className="text-sm font-medium text-[var(--app-ink)]">{etiqueta}</span>
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--app-ink-2)]"><Lock className="h-3.5 w-3.5" aria-hidden="true" />Siempre obligatorio</span>
    </div>
  );
}

const campoVacio = (ambito: Ambito): CampoEspecie => ({ ambito, nombre_campo: '', etiqueta: '', tipo_campo: 'text', requerido: false, opciones: '' });

export default function ConfigEspecieForm({ value, onChange, errores = {}, idBase = 'esp', etapasFijas = false }: {
  value: ConfigEspecie;
  onChange: (c: ConfigEspecie) => void;
  errores?: Record<string, string>;
  idBase?: string;
  /** Con clubes ya enviados no se agregan, quitan ni reordenan etapas (solo se editan sus datos). */
  etapasFijas?: boolean;
}) {
  const c = value;
  const set = (p: Partial<ConfigEspecie>) => onChange({ ...c, ...p });
  const setEtapa = (i: number, p: Partial<EtapaEspecie>) => set({ etapas: c.etapas.map((e, j) => (j === i ? { ...e, ...p } : e)) });
  const moverEtapa = (i: number, d: -1 | 1) => {
    const etapas = [...c.etapas];
    [etapas[i], etapas[i + d]] = [etapas[i + d], etapas[i]];
    set({ etapas });
  };
  const [dialogo, setDialogo] = useState<{ idx: number | null; campo: CampoEspecie } | null>(null);
  const [errDialogo, setErrDialogo] = useState<string | null>(null);
  const [borrar, setBorrar] = useState<number | null>(null);
  const numero = (s: string) => (s === '' ? NaN : Math.trunc(Number(s)));

  const guardarCampo = () => {
    if (!dialogo) return;
    const x = { ...dialogo.campo, etiqueta: dialogo.campo.etiqueta.trim() };
    if (!x.etiqueta) { setErrDialogo('Escribe el texto de la pregunta.'); return; }
    if (x.tipo_campo === 'select' && !x.opciones.split('\n').some((o) => o.trim())) { setErrDialogo('Escribe al menos una opción.'); return; }
    if (!x.nombre_campo) x.nombre_campo = slugCampo(x.etiqueta) || `pregunta_${c.campos.length + 1}`;
    const repetida = c.campos.some((o, i) => i !== dialogo.idx && o.ambito === x.ambito && o.nombre_campo === x.nombre_campo);
    if (repetida) { setErrDialogo('Ya hay una pregunta igual para el mismo ámbito; cambia el texto.'); return; }
    const campos = [...c.campos];
    if (dialogo.idx === null) campos.push(x); else campos[dialogo.idx] = x;
    set({ campos });
    setDialogo(null);
  };

  return (
    <div className="space-y-8">
      <Seccion icon={<Globe2 />} titulo="Modalidad" ayuda="Para qué etapa registran sus datos los clubes. Los líderes la ven en cada apartado de su club.">
        <div role="radiogroup" aria-label="Modalidad de la convocatoria" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(Object.keys(MODALIDADES) as Modalidad[]).map((m) => (
            <label key={m} className="cursor-pointer">
              <input type="radio" name={`${idBase}-modalidad`} value={m} checked={c.modalidad === m} onChange={() => set({ modalidad: m })} className="peer sr-only" />
              <span className="flex items-center justify-center rounded-[14px] border px-4 py-3 text-sm font-semibold text-[var(--app-ink-2)] transition-colors peer-checked:border-[var(--auth-vino)] peer-checked:bg-[var(--auth-vino)] peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--auth-vino)]"
                style={{ borderColor: 'var(--app-rule)' }}>
                {MODALIDADES[m]}
              </span>
            </label>
          ))}
        </div>
      </Seccion>

      <Seccion icon={<Users />} titulo="Integrantes de cada club" ayuda="El líder del club cuenta como integrante: entra en el mínimo y en el máximo.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${idBase}-min`} className={labelCls}>Mínimo <Asterisco /></Label>
            <input id={`${idBase}-min`} type="number" inputMode="numeric" min={1} max={LIMITES_ESPECIE.integrantes} value={Number.isNaN(c.min_integrantes) ? '' : c.min_integrantes}
              onChange={(e) => set({ min_integrantes: numero(e.target.value) })} className={inputCls} aria-invalid={errores.min_integrantes ? 'true' : undefined} />
            {errores.min_integrantes && <p className="text-xs font-medium" style={errStyle}>{errores.min_integrantes}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idBase}-max`} className={labelCls}>Máximo <Asterisco /></Label>
            <input id={`${idBase}-max`} type="number" inputMode="numeric" min={1} max={LIMITES_ESPECIE.integrantes} value={Number.isNaN(c.max_integrantes) ? '' : c.max_integrantes}
              onChange={(e) => set({ max_integrantes: numero(e.target.value) })} className={inputCls} aria-invalid={errores.max_integrantes ? 'true' : undefined} />
            {errores.max_integrantes && <p className="text-xs font-medium" style={errStyle}>{errores.max_integrantes}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idBase}-cpe`} className={labelCls}>Clubes por escuela</Label>
            <input id={`${idBase}-cpe`} type="number" inputMode="numeric" min={1} max={LIMITES_ESPECIE.clubesPorEscuela} placeholder="Sin límite"
              value={c.clubes_por_escuela} onChange={(e) => set({ clubes_por_escuela: e.target.value === '' ? '' : numero(e.target.value) })}
              className={inputCls} aria-invalid={errores.clubes_por_escuela ? 'true' : undefined} aria-describedby={`${idBase}-cpe-ayuda`} />
            {errores.clubes_por_escuela
              ? <p className="text-xs font-medium" style={errStyle}>{errores.clubes_por_escuela}</p>
              : <p id={`${idBase}-cpe-ayuda`} className="text-xs text-[var(--app-ink-2)]">Vacío = cualquier número de clubes por escuela.</p>}
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-3 rounded-[14px] border px-4 py-3" style={{ borderColor: 'var(--app-rule)', backgroundColor: c.participan_menores ? 'var(--tile-sky-bg)' : 'var(--auth-field)' }}>
          <Checkbox id={`${idBase}-menores`} checked={c.participan_menores} onCheckedChange={(v) => set({ participan_menores: v === true })} />
          <span className="flex-1">
            <span className="block text-sm font-semibold text-[var(--app-ink)]">Participan menores de edad</span>
            <span className="block text-xs text-[var(--app-ink-2)]">Si lo desactivas, el sistema rechaza integrantes menores de 18 años (por su fecha de nacimiento).</span>
          </span>
        </label>
      </Seccion>

      <Seccion icon={<Package />} titulo="Kit que se entrega" ayuda="Lo ven los líderes al registrar su club. La fecha y el lugar de entrega se asignan después, por club.">
        <div className="space-y-1.5">
          <Label htmlFor={`${idBase}-kit`} className={labelCls}>Nombre del kit <Asterisco /></Label>
          <input id={`${idBase}-kit`} maxLength={LIMITES_ESPECIE.kitNombre} value={c.kit_nombre} onChange={(e) => set({ kit_nombre: e.target.value })}
            placeholder="Ej. Kit de robótica educativa" className={inputCls} aria-invalid={errores.kit_nombre ? 'true' : undefined} />
          {errores.kit_nombre && <p className="text-xs font-medium" style={errStyle}>{errores.kit_nombre}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idBase}-kitd`} className={labelCls}>Qué incluye (opcional)</Label>
          <textarea id={`${idBase}-kitd`} maxLength={LIMITES_ESPECIE.kitDescripcion} value={c.kit_descripcion} onChange={(e) => set({ kit_descripcion: e.target.value })}
            placeholder="Contenido del kit, para qué sirve, cuidados…" className={`${inputCls} !h-auto min-h-[96px] resize-y py-3`} />
          {errores.kit_descripcion && <p className="text-xs font-medium" style={errStyle}>{errores.kit_descripcion}</p>}
        </div>
      </Seccion>

      {/* E71 (pedido del usuario): qué apoyos de logística da la convocatoria. Lo que no da desaparece para el líder. */}
      <Seccion icon={<Bus />} titulo="Transporte y box lunch"
        ayuda="Elige qué apoyos da esta convocatoria a los clubes aceptados (escuelas estatales). Si quitas uno que ya pidieron, se quita de sus solicitudes y avisamos por correo a los líderes.">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {([['incluye_transporte', 'Transporte', 'Lugares en autobús para ir al evento y regresar.', <Bus key="b" />], ['incluye_lunch', 'Box lunch', 'Comida para los integrantes durante el evento.', <Sandwich key="s" />]] as const).map(([k, t, d, ic]) => (
            <label key={k} className="flex cursor-pointer items-start gap-3 rounded-[14px] border px-4 py-3" style={{ borderColor: c[k] ? 'var(--auth-vino)' : 'var(--app-rule)', backgroundColor: c[k] ? 'var(--auth-vino-soft)' : 'var(--auth-field)' }}>
              <Checkbox id={`${idBase}-${k}`} checked={c[k]} onCheckedChange={(v) => set({ [k]: v === true } as Partial<ConfigEspecie>)} />
              <span className="flex-1">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--app-ink)]"><span className="h-4 w-4 [&>svg]:h-4 [&>svg]:w-4" aria-hidden="true">{ic}</span>{t}</span>
                <span className="block text-xs text-[var(--app-ink-2)]">{d}</span>
              </span>
            </label>
          ))}
        </div>
        {!c.incluye_transporte && !c.incluye_lunch && <p className="text-xs font-semibold text-[var(--app-ink-2)]">Sin transporte ni box lunch: los clubes aceptados solo reciben el kit.</p>}
        {c.incluye_transporte && (
          <div className="space-y-3 rounded-[16px] border p-4" style={{ borderColor: 'var(--app-rule)' }}>
            <p className="text-sm font-semibold text-[var(--app-ink)]">Salida y regreso del transporte <span className="font-normal text-[var(--app-ink-2)]">(los ven los líderes)</span></p>
            <div className="space-y-1.5">
              <Label htmlFor={`${idBase}-sal-l`} className={labelCls}>Punto de salida</Label>
              <input id={`${idBase}-sal-l`} maxLength={300} value={c.transporte_salida_lugar} onChange={(e) => set({ transporte_salida_lugar: e.target.value })} className={inputCls} placeholder="Ej. Explanada del COMECYT, Toluca" />
            </div>
            <FechaHoraAmPm value={c.transporte_salida_hora} onChange={(v) => set({ transporte_salida_hora: v })} etiquetaFecha="Fecha de salida" etiquetaHora="Hora de salida" />
            <div className="space-y-1.5">
              <Label htmlFor={`${idBase}-reg-l`} className={labelCls}>Punto de regreso</Label>
              <input id={`${idBase}-reg-l`} maxLength={300} value={c.transporte_regreso_lugar} onChange={(e) => set({ transporte_regreso_lugar: e.target.value })} className={inputCls} placeholder="Si es el mismo, déjalo vacío" />
            </div>
            <FechaHoraAmPm value={c.transporte_regreso_hora} onChange={(v) => set({ transporte_regreso_hora: v })} etiquetaFecha="Fecha de regreso" etiquetaHora="Hora de regreso" />
            {errores.transporte_regreso_hora && <p className="text-xs font-medium" style={errStyle}>{errores.transporte_regreso_hora}</p>}
          </div>
        )}
        {(c.incluye_transporte || c.incluye_lunch) && (
          <div className="space-y-1.5 sm:max-w-xs">
            <Label htmlFor={`${idBase}-flog`} className={labelCls}>Fecha límite para pedir</Label>
            <input id={`${idBase}-flog`} type="date" value={c.fecha_limite_logistica} onChange={(e) => set({ fecha_limite_logistica: e.target.value })} className={inputCls} />
            <p className="text-xs text-[var(--app-ink-2)]">Vacío = sin fecha límite. Es la misma del panel de logística.</p>
          </div>
        )}
      </Seccion>

      <Seccion icon={<ClipboardCheck />} titulo="Etapas de revisión"
        ayuda="Cada club pasa por estas etapas en orden. Si una etapa pide correcciones, el líder tiene el plazo indicado (horas naturales, hora del centro) para corregir.">
        {errores.etapas && <AlertBox type="error" message={errores.etapas} />}
        {etapasFijas && (
          <p className="flex items-start gap-2 rounded-[14px] border px-4 py-3 text-xs text-[var(--app-ink-2)]" style={{ borderColor: 'var(--app-rule)' }}>
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Ya hay clubes en revisión: puedes cambiar el nombre, quién revisa, el plazo y las correcciones de cada etapa, pero no agregar, quitar ni reordenar etapas.
          </p>
        )}
        <ol className="space-y-3">
          {c.etapas.map((e, i) => (
            <li key={e.id ?? `n-${i}`} className="rounded-[16px] border p-4" style={{ borderColor: 'var(--app-rule)' }}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]">Etapa {i + 1}</span>
                {!etapasFijas && (
                  <span className="inline-flex gap-1">
                    <Button variant="soft" size="icon-sm" aria-label={`Subir la etapa ${i + 1}`} disabled={i === 0} onClick={() => moverEtapa(i, -1)}><ArrowUp /></Button>
                    <Button variant="soft" size="icon-sm" aria-label={`Bajar la etapa ${i + 1}`} disabled={i === c.etapas.length - 1} onClick={() => moverEtapa(i, 1)}><ArrowDown /></Button>
                    <Button variant="destructive" size="icon-sm" aria-label={`Quitar la etapa ${i + 1}`} disabled={c.etapas.length <= 1}
                      onClick={() => set({ etapas: c.etapas.filter((_, j) => j !== i) })}><Trash2 /></Button>
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                  <Label htmlFor={`${idBase}-et-${i}-n`} className={labelCls}>Nombre</Label>
                  <input id={`${idBase}-et-${i}-n`} maxLength={120} value={e.nombre} className={inputCls} onChange={(ev) => setEtapa(i, { nombre: ev.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${idBase}-et-${i}-r`} className={labelCls}>Quién revisa</Label>
                  <select id={`${idBase}-et-${i}-r`} value={e.revisa} className={inputCls} onChange={(ev) => setEtapa(i, { revisa: ev.target.value as Revisa })}>
                    {Object.entries(REVISA_ETIQUETA).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${idBase}-et-${i}-p`} className={labelCls}>Plazo (horas)</Label>
                  <input id={`${idBase}-et-${i}-p`} type="number" inputMode="numeric" min={1} max={720} value={Number.isNaN(e.plazo_horas) ? '' : e.plazo_horas} className={inputCls}
                    onChange={(ev) => setEtapa(i, { plazo_horas: numero(ev.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${idBase}-et-${i}-s`} className={labelCls}>Correcciones</Label>
                  <input id={`${idBase}-et-${i}-s`} type="number" inputMode="numeric" min={0} max={5} value={Number.isNaN(e.max_subsanaciones) ? '' : e.max_subsanaciones} className={inputCls}
                    onChange={(ev) => setEtapa(i, { max_subsanaciones: numero(ev.target.value) })} />
                </div>
              </div>
              <RevisoresEtapa idBase={`${idBase}-et-${i}`} revisa={e.revisa} revisores={e.revisores ?? []} aprobaciones={e.aprobaciones_requeridas ?? 1}
                onChange={(p) => setEtapa(i, p)} />
            </li>
          ))}
        </ol>
        {!etapasFijas && c.etapas.length < MAX_ETAPAS && (
          <Button variant="outline" onClick={() => set({ etapas: [...c.etapas, { nombre: `Revisión ${c.etapas.length + 1}`, revisa: 'ambos', plazo_horas: 24, max_subsanaciones: 1 }] })}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Agregar etapa
          </Button>
        )}
        <p className="text-xs text-[var(--app-ink-2)]">
          Después de las revisiones, el admin de convocatoria da su visto bueno y el comité (con su acta) decide; con las dos marcas el club queda aceptado.
          El acta la suben el admin, el admin de convocatoria o una persona asignada a alguna etapa.
        </p>
      </Seccion>

      <Seccion icon={<ListChecks />} titulo="Datos que se piden" ayuda="Elige qué datos pides y cuáles son obligatorios para poder enviar el club a revisión.">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-[16px] border px-4 py-2" style={{ borderColor: 'var(--app-rule)' }}>
            <p className={`${labelCls} pt-2`}>Del club</p>
            <div className="divide-y" style={{ borderColor: 'var(--app-rule)' }}>
              <FilaFija etiqueta="Nombre del club" />
              <FilaFija etiqueta="Escuela" />
              {Object.entries(CAMPOS_CLUB).map(([k, t]) => (
                <FilaPredef key={k} id={`${idBase}-club-${k}`} etiqueta={t} valor={c.campos_club[k] ?? { pedir: false, obligatorio: false }}
                  onChange={(p) => set({ campos_club: { ...c.campos_club, [k]: p } })} />
              ))}
            </div>
          </div>
          <div className="rounded-[16px] border px-4 py-2" style={{ borderColor: 'var(--app-rule)' }}>
            <p className={`${labelCls} pt-2`}>De cada integrante</p>
            <div className="divide-y" style={{ borderColor: 'var(--app-rule)' }}>
              <FilaFija etiqueta="Nombre completo" />
              {Object.entries(CAMPOS_INTEGRANTE).map(([k, t]) => (
                <FilaPredef key={k} id={`${idBase}-int-${k}`} etiqueta={t} valor={c.campos_integrante[k] ?? { pedir: false, obligatorio: false }}
                  onChange={(p) => set({ campos_integrante: { ...c.campos_integrante, [k]: p } })} />
              ))}
            </div>
          </div>
        </div>
      </Seccion>

      {/* E79 (20/10/2026, pedido del usuario): formatos institucionales con la franja de convivencia, llenos con los datos
          del club y en PDF sin edición. El líder los descarga, firma y sube; cada uno se revisa (aprobar o rechazar). */}
      <Seccion icon={<FileSignature />} titulo="Formatos institucionales"
        ayuda="Se generan llenos con los datos del club (lo que falte queda en línea para llenar a mano), en PDF sin edición. El líder los firma, sella y sube; el revisor aprueba o rechaza cada uno.">
        <div className="rounded-[16px] border px-4 py-2" style={{ borderColor: 'var(--app-rule)' }}>
          <div className="divide-y" style={{ borderColor: 'var(--app-rule)' }}>
            {Object.entries(FORMATOS).map(([k, t]) => (
              <FilaPredef key={k} id={`${idBase}-fmt-${k}`} etiqueta={t} valor={c.formatos?.[k] ?? { pedir: false, obligatorio: false }}
                onChange={(p) => set({ formatos: { ...c.formatos, [k]: p } })} />
            ))}
          </div>
        </div>
        <p className="text-xs text-[var(--app-ink-2)]">
          Los formatos A, B y C son los del STEAM EDOMEX. El permiso de uso de imagen es uno por integrante: infantil para estudiantes menores
          de edad y de adulto para docentes. Para llenarlos solos, pide también el director(a), el lugar, grado, grupo, domicilio y tutor.
        </p>
      </Seccion>

      <Seccion icon={<MessageSquarePlus />} titulo="Preguntas adicionales (opcional)" ayuda="Para lo que no está en la lista anterior: talla de playera, turno, taller de interés…">
        {errores.campos && <AlertBox type="error" message={errores.campos} />}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { setErrDialogo(null); setDialogo({ idx: null, campo: campoVacio('club') }); }}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Pregunta del club
          </Button>
          <Button variant="outline" onClick={() => { setErrDialogo(null); setDialogo({ idx: null, campo: campoVacio('integrante') }); }}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Pregunta a cada integrante
          </Button>
        </div>
        {c.campos.length > 0 && (
          <ul className="divide-y rounded-[16px] border" style={{ borderColor: 'var(--app-rule)' }}>
            {c.campos.map((x, i) => (
              <li key={`${x.ambito}-${x.nombre_campo}-${i}`} className="flex flex-wrap items-center gap-2 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-semibold text-[var(--app-ink)]">{x.etiqueta}</span>
                  <span className="block text-xs text-[var(--app-ink-2)]">
                    {x.ambito === 'club' ? 'Del club' : 'De cada integrante'} · {TIPO_CAMPO_ETIQUETA[x.tipo_campo]}{x.requerido ? ' · Obligatoria' : ''}
                  </span>
                </span>
                <span className="inline-flex gap-1.5">
                  <Button variant="soft" size="icon-sm" aria-label={`Editar «${x.etiqueta}»`} title="Editar" onClick={() => { setErrDialogo(null); setDialogo({ idx: i, campo: { ...x } }); }}><Edit2 /></Button>
                  <Button variant="destructive" size="icon-sm" aria-label={`Quitar «${x.etiqueta}»`} title="Quitar" onClick={() => setBorrar(i)}><Trash2 /></Button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {borrar !== null && (
          <div role="alertdialog" aria-label="Confirmar" className="flex flex-wrap items-center gap-3 rounded-[14px] border px-4 py-3 text-sm" style={{ borderColor: 'var(--auth-danger)' }}>
            <span className="flex-1">¿Quitar la pregunta «{c.campos[borrar]?.etiqueta}»?</span>
            <Button variant="outline" size="sm" onClick={() => setBorrar(null)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={() => { set({ campos: c.campos.filter((_, j) => j !== borrar) }); setBorrar(null); }}>Quitar</Button>
          </div>
        )}
      </Seccion>

      <StepFrame
        open={dialogo !== null}
        size="md"
        title={dialogo?.idx === null ? 'Nueva pregunta' : 'Editar pregunta'}
        icon={<MessageSquarePlus className="h-5 w-5" />}
        intro={dialogo?.campo.ambito === 'integrante' ? <>Se preguntará <strong>a cada integrante</strong> del club.</> : <>Se preguntará <strong>una vez por club</strong>.</>}
        onClose={() => setDialogo(null)}
        onSubmit={guardarCampo}
        error={errDialogo}
        submitLabel={dialogo?.idx === null ? 'Agregar pregunta' : 'Guardar cambios'}
        steps={dialogo ? [{
          key: 'pregunta',
          label: 'La pregunta',
          question: '¿Qué quieres preguntar?',
          validate: () => (!dialogo.campo.etiqueta.trim() ? 'Escribe el texto de la pregunta.' : null),
          content: (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor={`${idBase}-q-amb`} className={labelCls}>A quién se pregunta</Label>
                <select id={`${idBase}-q-amb`} value={dialogo.campo.ambito} className={inputCls}
                  onChange={(e) => setDialogo({ ...dialogo, campo: { ...dialogo.campo, ambito: e.target.value as Ambito } })}>
                  <option value="club">Al club (una vez)</option>
                  <option value="integrante">A cada integrante</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${idBase}-q-et`} className={labelCls}>Texto de la pregunta <Asterisco /></Label>
                <input id={`${idBase}-q-et`} maxLength={LIMITES_ESPECIE.etiqueta} value={dialogo.campo.etiqueta} className={inputCls} placeholder="Ej. Talla de playera"
                  onChange={(e) => setDialogo({ ...dialogo, campo: { ...dialogo.campo, etiqueta: e.target.value, nombre_campo: dialogo.idx === null ? slugCampo(e.target.value) : dialogo.campo.nombre_campo } })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${idBase}-q-tipo`} className={labelCls}>Tipo de respuesta</Label>
                <select id={`${idBase}-q-tipo`} value={dialogo.campo.tipo_campo} className={inputCls}
                  onChange={(e) => setDialogo({ ...dialogo, campo: { ...dialogo.campo, tipo_campo: e.target.value as TipoCampoEspecie } })}>
                  {Object.entries(TIPO_CAMPO_ETIQUETA).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                </select>
              </div>
              {dialogo.campo.tipo_campo === 'select' && (
                <div className="space-y-1.5">
                  <Label htmlFor={`${idBase}-q-op`} className={labelCls}>Opciones (una por línea) <Asterisco /></Label>
                  <textarea id={`${idBase}-q-op`} value={dialogo.campo.opciones} placeholder={'Chica\nMediana\nGrande'} className={`${inputCls} !h-auto min-h-[100px] resize-y py-3`}
                    onChange={(e) => setDialogo({ ...dialogo, campo: { ...dialogo.campo, opciones: e.target.value } })} />
                </div>
              )}
              <label className="flex cursor-pointer items-center gap-3 rounded-[14px] border px-4 py-3" style={{ borderColor: 'var(--app-rule)', backgroundColor: dialogo.campo.requerido ? 'var(--tile-sky-bg)' : 'var(--auth-field)' }}>
                <Checkbox id={`${idBase}-q-req`} checked={dialogo.campo.requerido} onCheckedChange={(v) => setDialogo({ ...dialogo, campo: { ...dialogo.campo, requerido: v === true } })} />
                <span className="text-sm font-semibold text-[var(--app-ink)]">Es obligatoria para enviar el club</span>
              </label>
            </div>
          ),
        }] : []}
      />
    </div>
  );
}
