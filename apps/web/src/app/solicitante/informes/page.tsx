'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText, Loader2, CheckCircle2, AlertCircle, Clock, ArrowRight, Upload } from 'lucide-react';
import api from '@/lib/api';
import { AlertBox } from '@/components/ui/alert-box';
import type { Solicitud } from '@/types/api';
import { INSTITUTION } from '@/lib/institution';

type InformeEstado = 'pendiente' | 'entregado' | 'observado' | 'aprobado';

interface InformeRow {
  solicitud: Solicitud;
  estado: InformeEstado;
}

const ESTADOS_CON_INFORME: ReadonlyArray<string> = ['ministracion', 'seguimiento', 'cerrada'];

const estadoConfig: Record<InformeEstado, { label: string; icon: typeof CheckCircle2; bg: string; text: string; border: string; desc: string; next: string }> = {
  pendiente: {
    label: 'Por entregar',
    icon: Clock,
    bg: 'bg-neutral-50',
    text: 'text-neutral-600',
    border: 'border-neutral-300',
    desc: 'Aún no has subido el informe final.',
    next: 'Sube el archivo desde el detalle de tu solicitud.',
  },
  entregado: {
    label: 'En revisión',
    icon: Clock,
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-400',
    desc: `Informe recibido, en revisión por el equipo ${INSTITUTION.name}.`,
    next: 'Recibirás una notificación con el resultado.',
  },
  observado: {
    label: 'Observado',
    icon: AlertCircle,
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-400',
    desc: 'El revisor encontró observaciones que debes atender.',
    next: 'Corrige el documento y vuelve a subirlo desde la solicitud.',
  },
  aprobado: {
    label: 'Aprobado',
    icon: CheckCircle2,
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-400',
    desc: 'El informe fue aprobado.',
    next: 'No se requiere ninguna acción adicional.',
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
        setError('No fue posible cargar la lista de informes. Intenta nuevamente más tarde.');
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    fetchInformes();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-neutral-900 dark:text-neutral-50 tracking-tight">Mis Informes</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          Estado de los informes finales de tus proyectos en seguimiento.
        </p>
      </div>

      {error && <AlertBox type="error" title="Error" message={error} />}

      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary/20" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-700 shadow-sm py-16 text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Aún no tienes informes por entregar</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-300 mt-1">
            Cuando tu proyecto pase a la etapa de seguimiento, los informes aparecerán aquí.
          </p>
        </div>
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
                className={`bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-700 shadow-sm overflow-hidden border-l-4 ${cfg.border}`}
              >
                <div className="px-6 pt-5 pb-4 border-b border-neutral-50 dark:border-neutral-800">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Icon className={`w-4 h-4 ${cfg.text} shrink-0`} />
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${cfg.bg} ${cfg.text} uppercase tracking-tight`}>
                          {cfg.label}
                        </span>
                        <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md font-mono">
                          {solicitud.folio}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-neutral-900 dark:text-neutral-50 truncate">
                        {solicitud.titulo_proyecto}
                      </p>
                      {solicitud.empresa?.nombre && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-300 mt-0.5">{solicitud.empresa.nombre}</p>
                      )}
                    </div>
                    {fechaLimite && (
                      <div className="text-right shrink-0">
                        <p className="text-xs text-neutral-500 dark:text-neutral-300 uppercase tracking-wide">Fecha límite</p>
                        <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">{fechaLimite}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-6 py-4 space-y-4">
                  <div className={`${cfg.bg} rounded-xl px-4 py-3 flex items-center justify-between gap-3`}>
                    <p className={`text-sm font-semibold ${cfg.text}`}>{cfg.desc}</p>
                    <div className={`flex items-center gap-1 text-xs ${cfg.text} text-right`}>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                      {cfg.next}
                    </div>
                  </div>

                  {solicitud.observaciones_informe && estado === 'observado' && (
                    <AlertBox
                      type="warning"
                      title="Observaciones del revisor"
                      message={solicitud.observaciones_informe}
                    />
                  )}

                  {solicitud.resultados_obtenidos && (
                    <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4">
                      <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1.5">Resultados reportados</p>
                      <p className="text-sm text-neutral-700 dark:text-neutral-200 leading-relaxed">{solicitud.resultados_obtenidos}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="text-xs text-neutral-500 dark:text-neutral-300 space-y-0.5">
                      {fechaEntrega && <p>Entregado el {fechaEntrega}</p>}
                      {!fechaEntrega && fechaLimite && <p>Plazo vigente hasta el {fechaLimite}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {solicitud.informe_final_url && (
                        <a
                          href={solicitud.informe_final_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-[var(--brand-vino-700)] transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Ver informe
                        </a>
                      )}
                      <Link
                        href={`/solicitante/solicitudes/${solicitud.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-primary hover:bg-[var(--brand-vino-700)] px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {estado === 'pendiente' || estado === 'observado' ? (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            {estado === 'observado' ? 'Resubir informe' : 'Subir informe'}
                          </>
                        ) : (
                          <>
                            Ver solicitud
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-700 px-6 py-5">
        <p className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-3">Guía rápida de estados</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(estadoConfig).map(([key, cfg]) => (
            <div key={key} className="flex items-start gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${cfg.bg} ${cfg.text} uppercase whitespace-nowrap mt-0.5`}>
                {cfg.label}
              </span>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{cfg.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
