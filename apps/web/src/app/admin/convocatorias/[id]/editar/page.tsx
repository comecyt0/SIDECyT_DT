'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { AlertBox } from '@/components/ui/alert-box';

export default function EditarConvocatoriaPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'error'|'success'|'info'|'warning', message: string}|null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    ejercicio_fiscal: '',
    descripcion: '',
    fecha_apertura: '',
    fecha_cierre: '',
    monto_maximo_apoyo: '',
    porcentaje_aportacion_minima: '',
    estado: 'borrador'
  });

  useEffect(() => {
    fetchConvocatoria();
  }, [id]);

  const fetchConvocatoria = async () => {
    try {
      const { data } = await api.get(`/admin/convocatorias/${id}`);
      setFormData({
        nombre: data.nombre,
        ejercicio_fiscal: data.ejercicio_fiscal,
        descripcion: data.descripcion || '',
        fecha_apertura: data.fecha_apertura,
        fecha_cierre: data.fecha_cierre,
        monto_maximo_apoyo: data.monto_maximo_apoyo.toString(),
        porcentaje_aportacion_minima: data.porcentaje_aportacion_minima.toString(),
        estado: data.estado
      });
    } catch {
      setFeedback({ type: 'error', message: 'Error al cargar la convocatoria' });
      router.push('/admin/convocatorias');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/admin/convocatorias/${id}`, formData);
      setFeedback({ type: 'success', message: 'Convocatoria actualizada con éxito' });
      router.push('/admin/convocatorias');
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.response?.data?.error || 'Error al actualizar la convocatoria' });
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

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {feedback && <AlertBox type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}
      <div className="flex items-center gap-4">
        <Link href="/admin/convocatorias">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-neutral-dark">Editar Convocatoria</h1>
      </div>

      <Card className="border-0 shadow-lg ring-1 ring-neutral-100">
        <CardHeader className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-700">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary">Modificar Parámetros</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre de la Convocatoria</Label>
              <Input 
                id="nombre" 
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ejercicio_fiscal">Ejercicio Fiscal</Label>
                <Input 
                  id="ejercicio_fiscal" 
                  maxLength={4} 
                  value={formData.ejercicio_fiscal}
                  onChange={(e) => setFormData({...formData, ejercicio_fiscal: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado Actual</Label>
                <select 
                  id="estado"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={formData.estado}
                  onChange={(e) => setFormData({...formData, estado: e.target.value})}
                >
                  <option value="borrador">Borrador</option>
                  <option value="activa">Activa</option>
                  <option value="cerrada">Cerrada</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción Breve</Label>
              <Textarea 
                id="descripcion" 
                className="min-h-[100px]"
                value={formData.descripcion}
                onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha_apertura">Fecha de Apertura</Label>
                <Input 
                  id="fecha_apertura" 
                  type="date" 
                  value={formData.fecha_apertura}
                  onChange={(e) => setFormData({...formData, fecha_apertura: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha_cierre">Fecha de Cierre</Label>
                <Input 
                  id="fecha_cierre" 
                  type="date" 
                  value={formData.fecha_cierre}
                  onChange={(e) => setFormData({...formData, fecha_cierre: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monto_maximo">Monto Máximo de Apoyo ($)</Label>
                <Input 
                  id="monto_maximo" 
                  type="number" 
                  value={formData.monto_maximo_apoyo}
                  onChange={(e) => setFormData({...formData, monto_maximo_apoyo: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="porcentaje_minimo">Aportación Concurrente Solicitante (%)</Label>
                <Input 
                  id="porcentaje_minimo" 
                  type="number" 
                  value={formData.porcentaje_aportacion_minima}
                  onChange={(e) => setFormData({...formData, porcentaje_aportacion_minima: e.target.value})}
                />
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <Button 
                type="submit" 
                className="flex-1 bg-primary hover:bg-primary-light text-white font-bold h-11"
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Actualizar Datos
              </Button>
              <Link href="/admin/convocatorias" className="flex-1">
                <Button variant="outline" className="w-full h-11 font-bold" type="button">Regresar</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
