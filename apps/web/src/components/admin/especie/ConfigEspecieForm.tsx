'use client';

/**
 * E52 · F1 — Configuración de una convocatoria de Apoyo en especie: integrantes (el líder cuenta), clubes por escuela,
 * menores, kit, datos predefinidos (no pedir / opcional / obligatorio) y preguntas adicionales del club o de cada
 * integrante. Lo usan el asistente "Nueva convocatoria" y la ficha de una convocatoria existente.
 * Componente controlado: no llama a la API.
 */

import { useState } from 'react';
import { Plus, Edit2, Trash2, Lock, Users, Package, ListChecks, MessageSquarePlus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertBox } from '@/components/ui/alert-box';
import StepFrame from '@/components/ui/step-frame';
import {
  CAMPOS_CLUB, CAMPOS_INTEGRANTE, LIMITES_ESPECIE, TIPO_CAMPO_ETIQUETA, slugCampo,
  type Ambito, type CampoEspecie, type ConfigEspecie, type Predef, type TipoCampoEspecie,
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

export default function ConfigEspecieForm({ value, onChange, errores = {}, idBase = 'esp' }: {
  value: ConfigEspecie;
  onChange: (c: ConfigEspecie) => void;
  errores?: Record<string, string>;
  idBase?: string;
}) {
  const c = value;
  const set = (p: Partial<ConfigEspecie>) => onChange({ ...c, ...p });
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
      <Seccion icon={<Users />} titulo="Integrantes de cada club" ayuda="El líder del club cuenta como integrante: entra en el mínimo y en el máximo.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${idBase}-min`} className={labelCls}>Mínimo *</Label>
            <input id={`${idBase}-min`} type="number" inputMode="numeric" min={1} max={LIMITES_ESPECIE.integrantes} value={Number.isNaN(c.min_integrantes) ? '' : c.min_integrantes}
              onChange={(e) => set({ min_integrantes: numero(e.target.value) })} className={inputCls} aria-invalid={errores.min_integrantes ? 'true' : undefined} />
            {errores.min_integrantes && <p className="text-xs font-medium" style={errStyle}>{errores.min_integrantes}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idBase}-max`} className={labelCls}>Máximo *</Label>
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
          <Label htmlFor={`${idBase}-kit`} className={labelCls}>Nombre del kit *</Label>
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

      <Seccion icon={<ListChecks />} titulo="Datos que se piden" ayuda="Elige qué datos pides y cuáles son obligatorios para poder enviar el club a revisión.">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-[16px] border px-4 py-2" style={{ borderColor: 'var(--app-rule)' }}>
            <p className={`${labelCls} pt-2`}>Del club</p>
            <div className="divide-y" style={{ borderColor: 'var(--app-rule)' }}>
              <FilaFija etiqueta="Nombre del club" />
              <FilaFija etiqueta="Escuela" />
              <FilaFija etiqueta="Carta de consentimiento de la escuela" />
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
                <Label htmlFor={`${idBase}-q-et`} className={labelCls}>Texto de la pregunta *</Label>
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
                  <Label htmlFor={`${idBase}-q-op`} className={labelCls}>Opciones (una por línea) *</Label>
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
