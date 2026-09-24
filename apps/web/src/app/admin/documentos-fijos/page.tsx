'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileCog, Loader2, Save } from 'lucide-react';
import api from '@/lib/api';
import PageHeader from '@/components/ui/page-header';
import { AlertBox } from '@/components/ui/alert-box';
import { Button } from '@/components/ui/button';
import SelectorFormatos, { normalizarFormatos } from '@/components/admin/SelectorFormatos';

interface DocFijo { id: number; clave: string; etiqueta: string; formatos: string; tamano_maximo_mb: number }

/**
 * E45 (punto 6) — Tipos y tamaño de los documentos fijos (carta compromiso, carátula bancaria, constancia fiscal,
 * factura, informe final). Los documentos de cada programa se configuran en el propio programa.
 */
export default function DocumentosFijosPage() {
  const [docs, setDocs] = useState<(DocFijo & { lista: string[] })[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<number | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/documentos-fijos');
      const lista: DocFijo[] = Array.isArray(data?.documentos) ? data.documentos : [];
      setDocs(lista.map((d) => ({ ...d, lista: normalizarFormatos(d.formatos) })));
    } catch {
      setAviso({ tipo: 'error', texto: 'No se pudieron cargar los límites.' });
    } finally {
      setCargando(false);
    }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  const guardar = async (d: DocFijo & { lista: string[] }) => {
    setGuardando(d.id);
    try {
      await api.put(`/admin/documentos-fijos/${d.id}`, { formatos: d.lista, tamano_maximo_mb: d.tamano_maximo_mb });
      setAviso({ tipo: 'success', texto: `Límites de «${d.etiqueta}» guardados.` });
    } catch {
      setAviso({ tipo: 'error', texto: 'No se pudieron guardar los límites.' });
    } finally {
      setGuardando(null);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Límites de archivos" description="Qué tipo de archivo y de qué tamaño se acepta en cada documento fijo. Los documentos de cada programa se configuran dentro del programa." icon={<FileCog className="h-5 w-5" />} />
      {aviso && <AlertBox type={aviso.tipo} message={aviso.texto} onClose={() => setAviso(null)} />}
      {cargando ? (
        <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin" aria-label="Cargando" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {docs.map((d) => (
            <section key={d.id} className="perfil-tarjeta space-y-4" aria-label={d.etiqueta}>
              <h2 className="perfil-tarjeta-titulo">{d.etiqueta}</h2>
              <SelectorFormatos idBase={`fijo-${d.id}`} formatos={d.lista} tamano={d.tamano_maximo_mb}
                onChange={(lista, mb) => setDocs((ds) => ds.map((x) => (x.id === d.id ? { ...x, lista, tamano_maximo_mb: mb } : x)))} />
              <Button size="sm" onClick={() => guardar(d)} disabled={guardando === d.id}>
                {guardando === d.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}Guardar
              </Button>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
