'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Pencil, Loader2, Shapes, Save } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertBox } from '@/components/ui/alert-box';
import ConfigEspecieForm from '@/components/admin/especie/ConfigEspecieForm';
import {
  CAMPOS_CLUB, CAMPOS_INTEGRANTE, REVISA_ETIQUETA, TIPO_CAMPO_ETIQUETA, leerConfig, payloadCampos, payloadConfig, validarConfig,
  type ConfigEspecie,
} from '@/lib/especie';

function err(e: unknown, def: string) {
  const d = (e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
  return (d?.errors && Object.values(d.errors).flat()[0]) || d?.message || def;
}

const lista = (m: Record<string, string>, c: ConfigEspecie['campos_club']) =>
  Object.entries(m).filter(([k]) => c[k]?.pedir).map(([k, t]) => `${t}${c[k].obligatorio ? '' : ' (opcional)'}`).join(', ') || 'ninguno';

/**
 * E52 · F1 — Clubes y kit de una convocatoria de Apoyo en especie, en su ficha. El admin la edita (regla E45: solo el
 * admin define la convocatoria); los demás la ven. Los cambios de preguntas no borran lo que los clubes ya capturaron.
 */
export default function EspecieConvocatoriaPanel({ convocatoriaId, puedeEditar }: { convocatoriaId: number; puedeEditar: boolean }) {
  const router = useRouter();
  const [cfg, setCfg] = useState<ConfigEspecie | null>(null);
  const [edicion, setEdicion] = useState<ConfigEspecie | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  const [etapasFijas, setEtapasFijas] = useState(false);

  useEffect(() => {
    api.get(`/admin/convocatorias/${convocatoriaId}/especie`)
      .then(({ data }) => { setCfg(leerConfig(data)); setEtapasFijas(data?.etapas_fijas === true); })
      .catch(() => setAviso({ tipo: 'error', texto: 'No se pudo cargar la configuración de clubes y kit.' }));
  }, [convocatoriaId]);

  const guardar = async () => {
    if (!edicion) return;
    const e = validarConfig(edicion);
    setErrores(e);
    if (Object.keys(e).length) { setAviso({ tipo: 'error', texto: 'Revisa los datos marcados.' }); return; }
    setGuardando(true);
    try {
      const { data } = await api.put(`/admin/convocatorias/${convocatoriaId}/especie`, { ...payloadConfig(edicion), campos: payloadCampos(edicion) });
      setCfg(leerConfig(data));
      setEtapasFijas(data?.etapas_fijas === true);
      setEdicion(null);
      setAviso({ tipo: 'success', texto: 'Configuración guardada. Los líderes ya ven los cambios.' });
    } catch (er) {
      setAviso({ tipo: 'error', texto: err(er, 'No se pudo guardar la configuración.') });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle><Package className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Clubes y kit</CardTitle>
          <CardDescription>Apoyo en especie: cómo se forman los clubes, qué kit reciben y qué datos se piden.</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => router.push(`/admin/clubes?convocatoria=${convocatoriaId}`)}>
            <Shapes className="h-4 w-4" aria-hidden="true" /> Ver clubes
          </Button>
          {puedeEditar && cfg && !edicion && (
            <Button variant="soft" onClick={() => { setErrores({}); setEdicion(structuredClone(cfg)); }}>
              <Pencil className="h-4 w-4" aria-hidden="true" /> Editar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {aviso && <AlertBox type={aviso.tipo} message={aviso.texto} onClose={() => setAviso(null)} />}
        {!cfg ? (
          <div className="grid place-items-center py-8"><Loader2 className="h-6 w-6 animate-spin" aria-label="Cargando" /></div>
        ) : edicion ? (
          <div className="space-y-6">
            <ConfigEspecieForm idBase="conv-esp" value={edicion} onChange={setEdicion} errores={errores} etapasFijas={etapasFijas} />
            <div className="flex flex-wrap justify-end gap-2 border-t pt-4" style={{ borderColor: 'var(--app-rule)' }}>
              <Button variant="outline" onClick={() => setEdicion(null)} disabled={guardando}>Cancelar</Button>
              <Button onClick={guardar} disabled={guardando}>
                {guardando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />} Guardar cambios
              </Button>
            </div>
          </div>
        ) : (
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-[var(--app-ink-2)]">Kit</dt><dd className="break-words font-semibold text-[var(--app-ink)]">{cfg.kit_nombre || 'Sin definir'}</dd>
              {cfg.kit_descripcion && <dd className="mt-1 whitespace-pre-wrap break-words text-[var(--app-ink)]">{cfg.kit_descripcion}</dd>}</div>
            <div><dt className="text-[var(--app-ink-2)]">Integrantes por club</dt><dd className="font-semibold text-[var(--app-ink)]">De {cfg.min_integrantes} a {cfg.max_integrantes} (incluye al líder)</dd></div>
            <div><dt className="text-[var(--app-ink-2)]">Clubes por escuela</dt><dd className="font-semibold text-[var(--app-ink)]">{cfg.clubes_por_escuela === '' ? 'Sin límite' : cfg.clubes_por_escuela}</dd></div>
            <div><dt className="text-[var(--app-ink-2)]">Menores de edad</dt><dd className="font-semibold text-[var(--app-ink)]">{cfg.participan_menores ? 'Sí participan' : 'No participan'}</dd></div>
            <div className="sm:col-span-2"><dt className="text-[var(--app-ink-2)]">Etapas de revisión</dt>
              <dd><ol className="mt-1 space-y-0.5">{cfg.etapas.map((e, i) => (
                <li key={e.id ?? i} className="break-words text-[var(--app-ink)]">{i + 1}. {e.nombre} <span className="text-xs text-[var(--app-ink-2)]">({REVISA_ETIQUETA[e.revisa]} · plazo {e.plazo_horas} h · {e.max_subsanaciones} corrección{e.max_subsanaciones === 1 ? '' : 'es'})</span></li>
              ))}</ol></dd></div>
            <div><dt className="text-[var(--app-ink-2)]">Del club se pide</dt><dd className="text-[var(--app-ink)]">Nombre, escuela, carta de la escuela; {lista(CAMPOS_CLUB, cfg.campos_club).toLowerCase()}</dd></div>
            <div><dt className="text-[var(--app-ink-2)]">De cada integrante se pide</dt><dd className="text-[var(--app-ink)]">Nombre; {lista(CAMPOS_INTEGRANTE, cfg.campos_integrante).toLowerCase()}</dd></div>
            {cfg.campos.length > 0 && (
              <div className="sm:col-span-2"><dt className="text-[var(--app-ink-2)]">Preguntas adicionales</dt>
                <dd><ul className="mt-1 space-y-0.5">{cfg.campos.map((c, i) => (
                  <li key={i} className="break-words text-[var(--app-ink)]">{c.etiqueta} <span className="text-xs text-[var(--app-ink-2)]">({c.ambito === 'club' ? 'del club' : 'de cada integrante'} · {TIPO_CAMPO_ETIQUETA[c.tipo_campo]}{c.requerido ? ' · obligatoria' : ''})</span></li>
                ))}</ul></dd></div>
            )}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
