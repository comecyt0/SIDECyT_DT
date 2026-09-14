'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Loader2, CheckCircle2, AlertCircle, Clock, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import { AlertBox } from '@/components/ui/alert-box';
import { INSTITUTION } from '@/lib/institution';

interface Ministracion {
  id: number;
  solicitud_id: number;
  banco_id?: number;
  cuenta_clabe?: string;
  numero_cuenta?: string;
  titular_cuenta?: string;
  estado: 'pendiente' | 'revision' | 'autorizada' | 'pagada' | 'rechazada';
  observaciones?: string;
  carta_compromiso_aprobada: boolean;
  created_at: string;
  solicitud?: {
    id: number;
    folio: string;
    titulo_proyecto: string;
    monto_solicitado: number;
    convenio?: { numero_convenio: string; monto_aprobado: number; num_tranches: number };
    empresa?: { nombre: string };
  };
}

const estadoConfig: Record<string, { label: string; icon: typeof CheckCircle2; bg: string; text: string; border: string; desc: string; next: string }> = {
  pendiente:  {
    label: 'Pendiente',
    icon: Clock,
    bg: 'bg-neutral-50',
    text: 'text-neutral-600',
    border: 'border-neutral-300',
    desc: 'Solicitud registrada, en espera de revisión.',
    next: `El equipo de ${INSTITUTION.name} la revisará pronto.`,
  },
  revision: {
    label: 'En Revisión',
    icon: Clock,
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-400',
    desc: `En revisión por ${INSTITUTION.name}.`,
    next: 'Te notificaremos cuando haya cambios.',
  },
  autorizada: {
    label: 'Autorizada',
    icon: CheckCircle2,
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-400',
    desc: 'Pago autorizado.',
    next: 'Se procesará en los próximos días hábiles.',
  },
  pagada: {
    label: 'Pagada',
    icon: CheckCircle2,
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-400',
    desc: '¡Pago completado exitosamente!',
    next: 'Verifica tu cuenta bancaria para confirmar el depósito.',
  },
  rechazada: {
    label: 'Rechazada',
    icon: AlertCircle,
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-400',
    desc: 'Ministración rechazada.',
    next: `Contacta al área de ${INSTITUTION.name} para corregir los datos.`,
  },
};

export default function SolicitanteMinistracionesPage() {
  const [ministraciones, setMinistraciones] = useState<Ministracion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMinistraciones = async () => {
      try {
        const response = await api.get('/solicitudes');
        const solicitudes = Array.isArray(response.data) ? response.data : [];
        const all: Ministracion[] = [];
        for (const sol of solicitudes) {
          if (sol.ministracion) {
            all.push({ ...sol.ministracion, solicitud: sol });
          }
        }
        setMinistraciones(all);
      } catch {
        setMinistraciones([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMinistraciones();
  }, []);

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-neutral-900 dark:text-neutral-50 tracking-tight">Mis Ministraciones</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          Seguimiento de pagos y liberación de fondos de tus solicitudes aprobadas.
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary/20" />
        </div>
      ) : ministraciones.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-700 shadow-sm py-16 text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Sin ministraciones por ahora</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-300 mt-1">
            Los pagos aparecerán aquí cuando tus solicitudes sean aprobadas.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {ministraciones.map((mini, i) => {
            const cfg = estadoConfig[mini.estado] ?? estadoConfig.pendiente;
            const Icon = cfg.icon;
            return (
              <motion.div
                key={mini.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-700 shadow-sm overflow-hidden border-l-4 ${cfg.border}`}
              >
                {/* Card header */}
                <div className="px-6 pt-5 pb-4 border-b border-neutral-50 dark:border-neutral-800">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`w-4 h-4 ${cfg.text} shrink-0`} />
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${cfg.bg} ${cfg.text} uppercase tracking-tight`}>
                          {cfg.label}
                        </span>
                        <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md font-mono">
                          {mini.solicitud?.folio}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-neutral-900 dark:text-neutral-50 truncate">
                        {mini.solicitud?.titulo_proyecto}
                      </p>
                      {mini.solicitud?.empresa?.nombre && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-300 mt-0.5">{mini.solicitud.empresa.nombre}</p>
                      )}
                    </div>
                    {mini.solicitud?.convenio && (
                      <div className="text-right shrink-0">
                        <p className="text-xs text-neutral-500 dark:text-neutral-300 uppercase tracking-wide">Monto aprobado</p>
                        <p className="text-lg font-extrabold text-primary">
                          ${mini.solicitud.convenio.monto_aprobado.toLocaleString('es-MX')}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-300">{mini.solicitud.convenio.num_tranches} tranche(s)</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card body */}
                <div className="px-6 py-4 space-y-4">
                  {/* Status description */}
                  <div className={`${cfg.bg} rounded-xl px-4 py-3 flex items-center justify-between`}>
                    <p className={`text-sm font-semibold ${cfg.text}`}>{cfg.desc}</p>
                    <div className={`flex items-center gap-1 text-xs ${cfg.text}`}>
                      <ArrowRight className="w-3.5 h-3.5" />
                      {cfg.next}
                    </div>
                  </div>

                  {/* Bank details */}
                  {(mini.estado === 'autorizada' || mini.estado === 'pagada') &&
                    (mini.cuenta_clabe || mini.numero_cuenta) && (
                    <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Datos Bancarios</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {mini.cuenta_clabe && (
                          <div>
                            <p className="text-[10px] text-neutral-500 dark:text-neutral-300 uppercase mb-0.5">CLABE</p>
                            <p className="text-xs font-mono font-bold text-neutral-800 dark:text-neutral-100 bg-white dark:bg-neutral-900 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700">
                              {mini.cuenta_clabe}
                            </p>
                          </div>
                        )}
                        {mini.numero_cuenta && (
                          <div>
                            <p className="text-[10px] text-neutral-500 dark:text-neutral-300 uppercase mb-0.5">N° Cuenta</p>
                            <p className="text-xs font-mono font-bold text-neutral-800 dark:text-neutral-100 bg-white dark:bg-neutral-900 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700">
                              {mini.numero_cuenta}
                            </p>
                          </div>
                        )}
                        {mini.titular_cuenta && (
                          <div>
                            <p className="text-[10px] text-neutral-500 dark:text-neutral-300 uppercase mb-0.5">Titular</p>
                            <p className="text-xs font-bold text-neutral-800 dark:text-neutral-100 bg-white dark:bg-neutral-900 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 truncate">
                              {mini.titular_cuenta}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Observaciones */}
                  {mini.observaciones && mini.estado !== 'rechazada' && (
                    <div className="border-l-2 border-amber-400 pl-4 py-1">
                      <p className="text-xs font-bold text-amber-700 mb-0.5">Observaciones</p>
                      <p className="text-sm text-amber-800">{mini.observaciones}</p>
                    </div>
                  )}

                  {/* Rechazo */}
                  {mini.estado === 'rechazada' && (
                    <AlertBox
                      type="error"
                      title="Ministración Rechazada"
                      message={mini.observaciones || `La ministración fue rechazada. Contacta al área de ${INSTITUTION.name} para más detalles.`}
                    />
                  )}

                  <p className="text-xs text-neutral-500 dark:text-neutral-300">
                    Registrada el {new Date(mini.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Help card */}
      <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-700 px-6 py-5">
        <p className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-3">¿Preguntas sobre el estado de tu ministración?</p>
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
