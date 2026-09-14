'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Calendar, FileText, Settings } from 'lucide-react';
import api from '@/lib/api';
import type { Convocatoria } from '@/types/api';
import { formatCurrency } from '@/lib/format';

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
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!convocatoria) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">Convocatoria no encontrada</h2>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>Regresar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/convocatorias')} className="rounded-full hover:bg-neutral-200">
          <ArrowLeft className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-neutral-dark">Detalle de Convocatoria</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Información pública y paramétrica del evento.</p>
        </div>
      </div>

      <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm relative overflow-hidden ring-1 ring-black/5">
        <div className="bg-gradient-to-r from-primary/30 to-accent/30 h-1 w-full absolute top-0" />
        <CardHeader className="bg-white/50 border-b border-neutral-100 dark:border-neutral-700 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl text-primary font-bold">{convocatoria.nombre}</CardTitle>
            <CardDescription className="text-base mt-2">Ejercicio Fiscal {convocatoria.ejercicio_fiscal}</CardDescription>
          </div>
          <Badge className={`text-sm py-1 px-3 ${convocatoria.estado === 'activa' ? 'bg-green-100 text-green-800' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100'}`}>
            {convocatoria.estado.toUpperCase()}
          </Badge>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-bold text-neutral-700 dark:text-neutral-200 flex items-center gap-2 border-b pb-2">
                <Calendar className="w-4 h-4 text-accent" /> Ventanas de Tiempo
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Fecha de Apertura</p>
                  <p className="font-semibold text-neutral-800 dark:text-neutral-100">{convocatoria.fecha_apertura ? new Date(convocatoria.fecha_apertura).toLocaleDateString('es-MX', { dateStyle: 'long' }) : '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Fecha de Cierre</p>
                  <p className="font-semibold text-neutral-800 dark:text-neutral-100">{convocatoria.fecha_cierre ? new Date(convocatoria.fecha_cierre).toLocaleDateString('es-MX', { dateStyle: 'long' }) : '—'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-neutral-700 dark:text-neutral-200 flex items-center gap-2 border-b pb-2">
                <Settings className="w-4 h-4 text-accent" /> Parametrización
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Presupuesto Asignado</p>
                  <p className="font-semibold text-neutral-800 dark:text-neutral-100">
                    {convocatoria.presupuesto_total ? formatCurrency(convocatoria.presupuesto_total) : 'No definido'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-neutral-700 dark:text-neutral-200 flex items-center gap-2 border-b pb-2">
              <FileText className="w-4 h-4 text-accent" /> Descripción General
            </h3>
            <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed bg-neutral-50 dark:bg-neutral-900 p-6 rounded-xl border border-neutral-100 dark:border-neutral-700">
              {convocatoria.descripcion || 'Sin descripción detallada.'}
            </p>
          </div>

          <div className="flex justify-end gap-4 pt-6">
            <Button variant="outline" onClick={() => router.push(`/admin/convocatorias/${id}/editar`)}>
              Modificar Parámetros
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
