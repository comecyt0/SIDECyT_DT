'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/ui/page-header';
import BannerManager from '@/components/admin/BannerManager';
import { Loader2, ListChecks, Info } from 'lucide-react';
import api from '@/lib/api';
import EstructuraPrograma from '@/components/admin/EstructuraPrograma';

interface TipoPrograma {
  id: number;
  clave: string;
  nombre: string;
  descripcion?: string;
  banner_url?: string | null;
  tiene_etapas?: boolean;
  tiene_equipo?: boolean;
  activo?: boolean;
}

/**
 * Ficha de la configuración técnica de una convocatoria (TipoPrograma): datos, banner y su estructura (preguntas,
 * documentos, conceptos de gasto, etapas, modalidades y criterios). E56: la estructura es el componente compartido con
 * «Editar convocatoria» (antes la pestaña «Preguntas» nunca cargaba sus registros y quitar borraba siempre).
 */
export default function ProgramaDetailPage() {
  const params = useParams();
  const programaId = params.id as string;
  const [programa, setPrograma] = useState<TipoPrograma | null>(null);
  const [error, setError] = useState(false);

  const fetchPrograma = useCallback(async () => {
    try {
      const { data } = await api.get(`/catalogs/programa/${programaId}`);
      setPrograma(data.data || data);
    } catch {
      setError(true);
    }
  }, [programaId]);
  useEffect(() => { void fetchPrograma(); }, [fetchPrograma]);

  if (error) return <p className="py-20 text-center text-[var(--app-ink-2)]">No se pudo abrir este programa.</p>;
  if (!programa) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--auth-vino)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        backHref="/admin/programas"
        backLabel="Volver a programas"
        eyebrow="Programa"
        title={programa.nombre}
        description="Ajusta las preguntas, los conceptos de gasto, las etapas, las modalidades y los criterios de evaluación de este programa."
      />

      <Card>
        <CardHeader><CardTitle><Info className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Datos generales</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]">Clave</h3>
              <p className="font-mono text-[var(--app-ink)] mt-1">{programa.clave}</p>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]">Nombre</h3>
              <p className="font-semibold text-[var(--app-ink)] mt-1">{programa.nombre}</p>
            </div>
            <div className="sm:col-span-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]">Descripción</h3>
              <p className="text-[var(--app-ink)] mt-1">{programa.descripcion || 'Sin descripción'}</p>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)] mb-1">Se entrega por etapas</h3>
              <Badge variant={programa.tiene_etapas ? 'default' : 'secondary'}>{programa.tiene_etapas ? 'Sí' : 'No'}</Badge>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)] mb-1">Requiere equipo</h3>
              <Badge variant={programa.tiene_equipo ? 'default' : 'secondary'}>{programa.tiene_equipo ? 'Sí' : 'No'}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* E40: banner del programa (solo admin). Las convocatorias del programa sin banner propio usan este. */}
      <BannerManager
        endpoint={`/admin/programas/${programa.id}/banner`}
        value={programa.banner_url}
        onChange={(url) => setPrograma({ ...programa, banner_url: url })}
        title="Banner del programa"
        description="Imagen representativa del programa. Se usa en la página pública para las convocatorias de este programa que no tengan banner propio."
      />

      <Card>
        <CardHeader><CardTitle><ListChecks className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Lo que se pide</CardTitle></CardHeader>
        <CardContent>
          <EstructuraPrograma programaId={programa.id} pestanas={['campos', 'documentos', 'rubros', 'etapas', 'modalidades', 'criterios']} />
        </CardContent>
      </Card>
    </div>
  );
}
