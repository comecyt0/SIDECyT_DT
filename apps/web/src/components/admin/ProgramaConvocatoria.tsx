'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Layers, EyeOff, Repeat } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import StepFrame from '@/components/ui/step-frame';
import SelectorPrograma, { type ValorPrograma } from '@/components/admin/SelectorPrograma';
import { mensajeError } from '@/lib/errores-formulario';
import { LIMITES, leerCatalogo, type ProgramaCatalogo, type SistemaPrograma } from '@/lib/asistente-convocatoria';

export interface ProgramaDeConvocatoria { id: number; nombre: string; sistema: SistemaPrograma; activo: boolean }

/** Respuesta de la API → programa de la convocatoria (o null). */
export function leerProgramaConvocatoria(v: unknown): ProgramaDeConvocatoria | null {
  const p = v as Record<string, unknown> | null;
  if (!p || typeof p.id !== 'number' || typeof p.nombre !== 'string') return null;
  return { id: p.id, nombre: p.nombre.slice(0, 255), sistema: p.sistema === 'sicei' ? 'sicei' : 'sigae', activo: p.activo === true };
}

/**
 * E54 — Programa al que pertenece la convocatoria (p. ej. «Programa LEGO» → esta convocatoria 2026). El admin general lo
 * cambia eligiendo otro del catálogo de Contenido público; no altera la configuración ni las solicitudes.
 */
export default function ProgramaConvocatoria({ convocatoriaId, programa, puedeCambiar, onCambio }: {
  convocatoriaId: number; programa: ProgramaDeConvocatoria | null; puedeCambiar: boolean; onCambio: (p: ProgramaDeConvocatoria | null) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [catalogo, setCatalogo] = useState<ProgramaCatalogo[] | null>(null);
  const [errorCarga, setErrorCarga] = useState(false);
  const [valor, setValor] = useState<ValorPrograma>({ id: null, nuevo: false, nombre: '', sistema: 'sigae' });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = () => {
    setErrorCarga(false);
    api.get('/admin/programas-publicos').then(({ data }) => setCatalogo(leerCatalogo(data))).catch(() => { setCatalogo([]); setErrorCarga(true); });
  };
  const abrir = () => {
    setError(null);
    setValor({ id: programa?.id ?? null, nuevo: false, nombre: programa?.nombre ?? '', sistema: programa?.sistema ?? 'sigae' });
    setAbierto(true);
    if (catalogo === null) cargar();
  };
  const guardar = async () => {
    setGuardando(true); setError(null);
    try {
      const { data } = await api.put(`/admin/convocatorias/${convocatoriaId}/programa`, { programa_publico_id: valor.id });
      onCambio(leerProgramaConvocatoria(data?.programa_publico));
      setAbierto(false);
    } catch (e) {
      setError(mensajeError(e, 'No se pudo cambiar el programa.'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle><Layers className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Programa</CardTitle>
          <CardDescription>El programa agrupa sus convocatorias (2026, 2027…) y se presenta en la página pública.</CardDescription>
        </div>
        {puedeCambiar && <Button size="sm" variant="outline" onClick={abrir}><Repeat className="h-4 w-4" aria-hidden="true" />{programa ? 'Cambiar programa' : 'Asignar programa'}</Button>}
      </CardHeader>
      <CardContent>
        {programa ? (
          <p className="flex flex-wrap items-center gap-2 text-sm text-[var(--app-ink)]">
            <strong className="break-words">{programa.nombre}</strong>
            <span className="pill" data-tone="sky">{programa.sistema.toUpperCase()}</span>
            {!programa.activo && <span className="pill" data-tone="neutral"><EyeOff className="h-3 w-3" aria-hidden="true" />Oculto en la página pública</span>}
            {!programa.activo && puedeCambiar && <Link href="/admin/sitio" className="text-sm font-semibold underline-offset-2 hover:underline">Completarlo en Contenido público</Link>}
          </p>
        ) : (
          <p className="text-sm text-[var(--app-ink-2)]">Esta convocatoria todavía no está asociada a un programa.</p>
        )}
      </CardContent>

      <StepFrame
        open={abierto}
        size="md"
        title="Programa de la convocatoria"
        icon={<Layers className="h-5 w-5" />}
        onClose={() => setAbierto(false)}
        onSubmit={guardar}
        submitting={guardando}
        submitLabel="Guardar programa"
        error={error}
        steps={abierto ? [{
          key: 'programa', label: 'Programa', question: '¿A qué programa pertenece esta convocatoria?',
          validate: () => (!valor.id ? 'Elige un programa de la lista.' : null),
          content: (
            <SelectorPrograma soloExistentes catalogo={catalogo} errorCarga={errorCarga} onReintentar={cargar} valor={valor}
              onChange={setValor} maxNombre={LIMITES.nombrePrograma} />
          ),
        }] : []}
      />
    </Card>
  );
}
