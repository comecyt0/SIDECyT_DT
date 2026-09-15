'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText, Loader2, CheckCircle2, AlertCircle, Clock, ArrowRight, Upload, ClipboardList, Info } from 'lucide-react';
import api from '@/lib/api';
import { AlertBox } from '@/components/ui/alert-box';
import type { Solicitud } from '@/types/api';
import { INSTITUTION } from '@/lib/institution';
import PageHeader from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type InformeEstado = 'pendiente' | 'entregado' | 'observado' | 'aprobado';

interface InformeRow {
  solicitud: Solicitud;
  estado: InformeEstado;
}

const ESTADOS_CON_INFORME: ReadonlyArray<string> = ['ministracion', 'seguimiento', 'cerrada'];

const estadoConfig: Record<InformeEstado, { label: string; icon: typeof CheckCircle2; bg: string; fg: string; desc: string; next: string }> = {
  pendiente: {
    label: 'Pendiente',
    icon: Clock,
    bg: 'var(--tile-gold-bg)',
    fg: 'var(--tile-gold-fg)',
    desc: 'Todavía no has subido el informe final.',
    next: 'Sube el archivo desde el detalle de tu solicitud.',
  },
  entregado: {
    label: 'En revisión',
    icon: Clock,
    bg: 'var(--tile-sky-bg)',
    fg: 'var(--tile-sky-fg)',
    desc: `Recibimos tu informe y el equipo de ${INSTITUTION.name} lo está revisando.`,
    next: 'Te avisaremos cuando haya un resultado.',
  },
  observado: {
    label: 'Con correcciones',
    icon: AlertCircle,
    bg: 'color-mix(in oklch, var(--auth-danger) 10%, transparent)',
    fg: 'var(--auth-danger)',
    desc: 'El equipo de revisión encontró puntos que debes corregir.',
    next: 'Corrige el documento y vuelve a subirlo desde la solicitud.',
  },
  aprobado: {
    label: 'Aprobado',
    icon: CheckCircle2,
    bg: 'var(--tile-emerald-bg)',
    fg: 'var(--tile-emerald-fg)',
    desc: 'Tu informe fue aprobado.',
    next: 'No tienes que hacer nada más.',
  },
};

function isInformeEstado(value: unknown): value is InformeEstado {
  return value === 'pendiente' || value === 'entregado' || value === 'observado' || value === 'aprobado';
}

export default function SolicitanteInformesPage() {
  const [rows, setRows] = useState<InformeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInformes = async () => {
      try {
        const { data } = await api.get('/solicitudes');
        const list: Solicitud[] = Array.isArray(data) ? data : (data?.data ?? []);

        const filtered: InformeRow[] = list
          .filter((s) => ESTADOS_CON_INFORME.includes(s.estado))
          .map((s) => ({
            solicitud: s,
            estado: isInformeEstado(s.estado_informe) ? s.estado_informe : 'pendiente',
          }));

        setRows(filtered);
      } catch {
        setError('No pudimos cargar tus informes. Inténtalo de nuevo más tarde.');
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    fetchInformes();
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mis informes"
        description="Cada proyecto con apoyo entrega un informe final. Aquí ves cuáles te faltan, cuáles están en revisión y cuáles ya se aprobaron."
        icon={<ClipboardList className="h-5 w-5" />}
      />

      {error && <AlertBox type="error" title="No se pudo cargar" message={error} />}

      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--auth-vino)' }} />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent>
            <div className="text-center py-14">
              <FileText className="mx-auto h-10 w-10 mb-3 text-[var(--app-ink-2)]" aria-hidden="true" />
              <p className="font-semibold text-[var(--app-ink)]">Todavía no tienes informes por entregar</p>
              <p className="text-sm text-[var(--app-ink-2)]">Cuando un proyecto tuyo pase a seguimiento, su informe aparecerá aquí.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rows.map(({ solicitud, estado }, i) => {
            const cfg = estadoConfig[estado];
            const Icon = cfg.icon;
            const fechaLimite = solicitud.fecha_limite_informe
              ? new Date(solicitud.fecha_limite_informe).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
              : null;
            const fechaEntrega = solicitud.fecha_entrega_informe
              ? new Date(solicitud.fecha_entrega_informe).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
              : null;

            return (
              <motion.div
                key={solicitud.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="inline-flex h-5 items-center gap-1 rounded-md px-2 text-[11px] font-semibold" style={{ backgroundColor: cfg.bg, color: cfg.fg }}>
                            <Icon className="h-3 w-3" aria-hidden="true" />
                            {cfg.label}
                          </span>
                          <span className="font-mono text-[11px] font-bold text-[var(--app-ink-2)] bg-[var(--auth-field)] px-2 py-0.5 rounded-md">
                            {solicitud.folio}
                          </span>
                        </div>
                        <CardTitle className="truncate">{solicitud.titulo_proyecto}</CardTitle>
                        {solicitud.empresa?.nombre && (
                          <CardDescription>{solicitud.empresa.nombre}</CardDescription>
                        )}
                      </div>
                      {fechaLimite && (
                        <div className="sm:text-right shrink-0">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--app-ink-2)]">Fecha límite</p>
                          <p className="text-sm font-bold text-[var(--app-ink)]">{fechaLimite}</p>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="rounded-[16px] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2" style={{ backgroundColor: cfg.bg }}>
                      <p className="text-sm font-semibold text-[var(--app-ink)]">{cfg.desc}</p>
                      <p className="flex items-center gap-1 text-xs text-[var(--app-ink-2)]">
                        <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {cfg.next}
                      </p>
                    </div>

                    {solicitud.observaciones_informe && estado === 'observado' && (
                      <AlertBox
                        type="warning"
                        title="Lo que hay que corregir"
                        message={solicitud.observaciones_informe}
                      />
                    )}

                    {solicitud.resultados_obtenidos && (
                      <div className="rounded-[16px] bg-[var(--auth-field)] p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--app-ink-2)] mb-1.5">Resultados que reportaste</p>
                        <p className="text-sm text-[var(--app-ink)] leading-relaxed">{solicitud.resultados_obtenidos}</p>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <div className="text-xs text-[var(--app-ink-2)] space-y-0.5">
                        {fechaEntrega && <p>Entregado el {fechaEntrega}</p>}
                        {!fechaEntrega && fechaLimite && <p>Tienes hasta el {fechaLimite}</p>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {solicitud.informe_final_url && (
                          <a href={solicitud.informe_final_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="soft" size="sm">
                              <FileText className="h-3.5 w-3.5" />
                              Ver informe
                            </Button>
                          </a>
                        )}
                        <Link href={`/solicitante/solicitudes/${solicitud.id}`}>
                          {estado === 'pendiente' || estado === 'observado' ? (
                            <Button size="sm">
                              <Upload className="h-3.5 w-3.5" />
                              {estado === 'observado' ? 'Volver a subir el informe' : 'Subir informe'}
                            </Button>
                          ) : (
                            <Button variant="soft" size="sm">
                              Ver solicitud
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            <Info className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} />
            Qué significa cada estado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(estadoConfig).map(([key, cfg]) => (
              <div key={key} className="flex items-start gap-2">
                <span className="inline-flex h-5 shrink-0 items-center rounded-md px-2 text-[11px] font-semibold whitespace-nowrap" style={{ backgroundColor: cfg.bg, color: cfg.fg }}>
                  {cfg.label}
                </span>
                <p className="text-sm text-[var(--app-ink-2)]">{cfg.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
