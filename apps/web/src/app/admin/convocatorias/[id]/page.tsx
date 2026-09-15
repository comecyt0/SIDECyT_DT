'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/ui/page-header';
import { Loader2, Calendar, FileText, Coins, Edit } from 'lucide-react';
import api from '@/lib/api';
import type { Convocatoria } from '@/types/api';
import { formatCurrency } from '@/lib/format';

const ESTADO_CONVOCATORIA: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  borrador: { label: 'Borrador', variant: 'secondary' },
  activa: { label: 'Activa', variant: 'default' },
  cerrada: { label: 'Cerrada', variant: 'outline' },
};

const sectionTitleCls = 'text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)] flex items-center gap-2 border-b border-[var(--app-rule)] pb-2';

export default function VerConvocatoriaPage() {
  const { id } = useParams();
  const router = useRouter();
  const [convocatoria, setConvocatoria] = useState<Convocatoria | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConvocatoria();
  }, [id]);

  const fetchConvocatoria = async () => {
    try {
      const { data } = await api.get(`/admin/convocatorias/${id}`);
      setConvocatoria(data);
    } catch (error) {
      console.error("Error al obtener convocatoria:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--auth-vino)' }} />
      </div>
    );
  }

  if (!convocatoria) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-[var(--app-ink)]">No encontramos esta convocatoria</h2>
        <p className="text-sm text-[var(--app-ink-2)] mt-1">Puede que se haya eliminado o que el enlace esté incompleto.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>Regresar</Button>
      </div>
    );
  }

  const estadoCfg = ESTADO_CONVOCATORIA[convocatoria.estado] ?? { label: convocatoria.estado, variant: 'outline' as const };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <PageHeader
        backHref="/admin/convocatorias"
        backLabel="Volver a convocatorias"
        eyebrow="Convocatoria"
        title={convocatoria.nombre}
        description={`Ejercicio fiscal ${convocatoria.ejercicio_fiscal}. Aquí ves las fechas, los montos y la descripción que conocen los solicitantes.`}
        actions={
          <Button variant="outline" onClick={() => router.push(`/admin/convocatorias/${id}/editar`)}>
            <Edit className="h-4 w-4" /> Editar
          </Button>
        }
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>
              <FileText className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Datos generales
            </CardTitle>
            <CardDescription>Estado actual de la convocatoria y su información pública.</CardDescription>
          </div>
          <Badge variant={estadoCfg.variant}>{estadoCfg.label}</Badge>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className={sectionTitleCls}>
                <Calendar className="w-4 h-4" style={{ color: 'var(--auth-vino)' }} /> Fechas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[var(--app-ink-2)]">Fecha de apertura</p>
                  <p className="font-semibold text-[var(--app-ink)]">{convocatoria.fecha_apertura ? new Date(convocatoria.fecha_apertura).toLocaleDateString('es-MX', { dateStyle: 'long' }) : '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--app-ink-2)]">Fecha de cierre</p>
                  <p className="font-semibold text-[var(--app-ink)]">{convocatoria.fecha_cierre ? new Date(convocatoria.fecha_cierre).toLocaleDateString('es-MX', { dateStyle: 'long' }) : '—'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className={sectionTitleCls}>
                <Coins className="w-4 h-4" style={{ color: 'var(--auth-vino)' }} /> Montos
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[var(--app-ink-2)]">Presupuesto asignado</p>
                  <p className="font-semibold text-[var(--app-ink)]">
                    {convocatoria.presupuesto_total ? formatCurrency(convocatoria.presupuesto_total) : 'Sin definir'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[var(--app-ink-2)]">Apoyo máximo por proyecto</p>
                  <p className="font-semibold text-[var(--app-ink)]">
                    {convocatoria.monto_maximo_apoyo ? formatCurrency(convocatoria.monto_maximo_apoyo) : 'Sin definir'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className={sectionTitleCls}>
              <FileText className="w-4 h-4" style={{ color: 'var(--auth-vino)' }} /> Descripción
            </h3>
            <p className="text-[var(--app-ink)] leading-relaxed p-5 rounded-[14px] bg-[var(--auth-field)]">
              {convocatoria.descripcion || 'Esta convocatoria no tiene descripción.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
