'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/ui/page-header';
import { Loader2, Calendar, FileText, Coins, Edit, CalendarPlus } from 'lucide-react';
import api from '@/lib/api';
import type { Convocatoria } from '@/types/api';
import { formatCurrency, parseDate } from '@/lib/format';
import { ESTADO_PUBLICO, estadoPublico, puedeProrrogar } from '@/lib/convocatoria-estado';
import ProrrogaDialog from '@/components/admin/ProrrogaDialog';
import BannerManager from '@/components/admin/BannerManager';
import { useRol } from '@/hooks/useRol';
import EspecieConvocatoriaPanel from '@/components/admin/especie/EspecieConvocatoriaPanel';
import ProgramaConvocatoria, { leerProgramaConvocatoria } from '@/components/admin/ProgramaConvocatoria';

const sectionTitleCls = 'text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)] flex items-center gap-2 border-b border-[var(--app-rule)] pb-2';
const fechaLarga = (v?: string | null) => (v ? parseDate(v).toLocaleDateString('es-MX', { dateStyle: 'long' }) : '—');

type ConvocatoriaConPrograma = Convocatoria & {
  tipo_programa?: { id: number; nombre: string; banner_url?: string | null; tipo_apoyo?: string };
  // E54: programa del catálogo público al que pertenece.
  programa_publico?: unknown;
};

export default function VerConvocatoriaPage() {
  // E45: acciones visibles según el rol (el backend las permite o rechaza de todos modos).
  const { esAdmin } = useRol();
  const { id } = useParams();
  const router = useRouter();
  const [convocatoria, setConvocatoria] = useState<ConvocatoriaConPrograma | null>(null);
  const [loading, setLoading] = useState(true);
  const [prorrogaOpen, setProrrogaOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await api.get(`/admin/convocatorias/${id}`);
        setConvocatoria(data);
      } catch (error) {
        console.error('Error al obtener convocatoria:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id]);

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

  const estado = estadoPublico(convocatoria);
  const estadoCfg = ESTADO_PUBLICO[estado];
  const programa = convocatoria.tipo_programa ?? null;
  // E52: en Apoyo en especie no hay montos; en su lugar se muestran los clubes y el kit.
  const esEspecie = programa?.tipo_apoyo === 'especie';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <PageHeader
        backHref="/admin/convocatorias"
        backLabel="Volver a convocatorias"
        eyebrow={convocatoria.nombre_corto ? `Convocatoria · folios ${convocatoria.nombre_corto}` : 'Convocatoria · sin nombre corto (ponlo en Editar)'}
        title={convocatoria.nombre}
        description={esEspecie
          ? `Ejercicio fiscal ${convocatoria.ejercicio_fiscal}. Apoyo en especie: fechas, clubes y kit, banner y la descripción que conocen los líderes de club.`
          : `Ejercicio fiscal ${convocatoria.ejercicio_fiscal}. Aquí ves las fechas, los montos, el banner y la descripción que conocen los solicitantes.`}
        actions={
          <>
            {esAdmin && puedeProrrogar(convocatoria) && (
              <Button variant="secondary" onClick={() => setProrrogaOpen(true)}>
                <CalendarPlus className="h-4 w-4" /> Dar prórroga
              </Button>
            )}
            {esAdmin && (
            <Button variant="outline" onClick={() => router.push(`/admin/convocatorias/${id}/editar`)}>
              <Edit className="h-4 w-4" /> Editar
            </Button>
            )}
          </>
        }
      />

      <ProgramaConvocatoria
        convocatoriaId={convocatoria.id}
        programa={leerProgramaConvocatoria(convocatoria.programa_publico)}
        puedeCambiar={esAdmin}
        onCambio={(p) => setConvocatoria({ ...convocatoria, programa_publico: p })}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>
              <FileText className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Datos generales
            </CardTitle>
            <CardDescription>{estadoCfg.ayuda}</CardDescription>
          </div>
          <span className="pill" data-tone={estadoCfg.tone} data-dot="on">{estadoCfg.label}</span>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className={sectionTitleCls}>
                <Calendar className="w-4 h-4" style={{ color: 'var(--auth-vino)' }} /> Fechas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[var(--app-ink-2)]">Apertura</p>
                  <p className="font-semibold text-[var(--app-ink)]">{fechaLarga(convocatoria.fecha_apertura)}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--app-ink-2)]">{convocatoria.fecha_prorroga ? 'Cierre original' : 'Cierre'}</p>
                  <p className={`font-semibold ${convocatoria.fecha_prorroga ? 'text-[var(--app-ink-2)] line-through' : 'text-[var(--app-ink)]'}`}>
                    {fechaLarga(convocatoria.fecha_cierre)}
                  </p>
                </div>
                {convocatoria.fecha_prorroga && (
                  <div className="sm:col-span-2 rounded-[16px] bg-[var(--auth-field)] p-4">
                    <p className="text-sm text-[var(--app-ink-2)]">Prórroga: recibe solicitudes hasta</p>
                    <p className="font-semibold text-[var(--auth-vino)]">{fechaLarga(convocatoria.fecha_prorroga)}</p>
                    {convocatoria.motivo_prorroga && (
                      <p className="mt-1 text-sm text-[var(--app-ink)]">Motivo: {convocatoria.motivo_prorroga}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {!esEspecie && <div className="space-y-4">
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
            </div>}
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

      {esEspecie && <EspecieConvocatoriaPanel convocatoriaId={convocatoria.id} puedeEditar={esAdmin} />}

      {esAdmin && <BannerManager
        endpoint={`/admin/convocatorias/${convocatoria.id}/banner`}
        value={convocatoria.banner_url}
        onChange={(url) => setConvocatoria({ ...convocatoria, banner_url: url })}
        fallbackUrl={programa?.banner_url}
        fallbackLabel={programa ? `el banner del programa «${programa.nombre}»` : 'el del programa'}
        title="Banner de la convocatoria"
        description="Se muestra en la tarjeta de la convocatoria en la página pública. Si no cargas uno, se usa el del programa."
      />}

      <ProrrogaDialog
        convocatoria={convocatoria}
        open={prorrogaOpen}
        onClose={() => setProrrogaOpen(false)}
        onDone={(c) => { setConvocatoria({ ...convocatoria, ...c }); setProrrogaOpen(false); }}
      />
    </div>
  );
}
