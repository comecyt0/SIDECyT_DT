'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Banknote, Loader2, CheckCircle2, AlertCircle, Clock, ArrowRight, Info } from 'lucide-react';
import api from '@/lib/api';
import { AlertBox } from '@/components/ui/alert-box';
import { INSTITUTION } from '@/lib/institution';
import PageHeader from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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

const estadoConfig: Record<string, { label: string; icon: typeof CheckCircle2; tone: string; bg: string; fg: string; desc: string; next: string }> = {
  pendiente:  {
    label: 'Pendiente',
    icon: Clock,
    tone: 'amber',
    bg: 'var(--tile-gold-bg)',
    fg: 'var(--tile-gold-fg)',
    desc: 'La entrega está registrada y en espera de revisión.',
    next: `El equipo de ${INSTITUTION.name} la revisará pronto.`,
  },
  revision: {
    label: 'En revisión',
    icon: Clock,
    tone: 'sky',
    bg: 'var(--tile-sky-bg)',
    fg: 'var(--tile-sky-fg)',
    desc: `El equipo de ${INSTITUTION.name} está revisando los datos y documentos.`,
    next: 'Te avisaremos cuando haya cambios.',
  },
  autorizada: {
    label: 'Autorizada',
    icon: CheckCircle2,
    tone: 'blue',
    bg: 'var(--tile-sky-bg)',
    fg: 'var(--tile-sky-fg)',
    desc: 'El pago ya está autorizado.',
    next: 'Se realizará en los próximos días hábiles.',
  },
  pagada: {
    label: 'Pagada',
    icon: CheckCircle2,
    tone: 'emerald',
    bg: 'var(--tile-emerald-bg)',
    fg: 'var(--tile-emerald-fg)',
    desc: 'El pago ya se realizó.',
    next: 'Revisa tu cuenta bancaria para confirmar el depósito.',
  },
  rechazada: {
    label: 'Con correcciones',
    icon: AlertCircle,
    tone: 'red',
    bg: 'color-mix(in oklch, var(--auth-danger) 10%, transparent)',
    fg: 'var(--auth-danger)',
    desc: 'Hay que corregir los datos bancarios o algún documento.',
    next: `Comunícate con ${INSTITUTION.name} para corregirlos.`,
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
      <PageHeader
        title="Pagos del apoyo"
        description="Cada ministración es una entrega del apoyo aprobado. Aquí ves en qué paso va cada una y a qué cuenta se deposita."
        icon={<Banknote className="h-5 w-5" />}
      />

      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--auth-vino)' }} />
        </div>
      ) : ministraciones.length === 0 ? (
        <Card>
          <CardContent>
            <div className="empty-state">
              <span className="tone-chip" data-tone="teal"><Banknote aria-hidden="true" /></span>
              <p className="font-bold text-[var(--app-ink)]">Todavía no hay pagos registrados</p>
              <p className="text-sm text-[var(--app-ink-2)]">Aparecerán aquí cuando una de tus solicitudes sea aprobada.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {ministraciones.map((mini, i) => {
            const cfg = estadoConfig[mini.estado] ?? estadoConfig.pendiente;
            const Icon = cfg.icon;
            const entregas = mini.solicitud?.convenio?.num_tranches;
            return (
              <motion.div
                key={mini.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="pill" data-tone={cfg.tone}>
                            <Icon aria-hidden="true" />
                            {cfg.label}
                          </span>
                          <span className="font-mono text-[11px] font-bold text-[var(--app-ink-2)] bg-[var(--auth-field)] px-2 py-0.5 rounded-md">
                            {mini.solicitud?.folio}
                          </span>
                        </div>
                        <CardTitle className="truncate">{mini.solicitud?.titulo_proyecto}</CardTitle>
                        {mini.solicitud?.empresa?.nombre && (
                          <CardDescription>{mini.solicitud.empresa.nombre}</CardDescription>
                        )}
                      </div>
                      {mini.solicitud?.convenio && (
                        <div className="sm:text-right shrink-0">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--app-ink-2)]">Monto aprobado</p>
                          <p className="text-lg font-extrabold" style={{ color: 'var(--auth-vino)' }}>
                            ${mini.solicitud.convenio.monto_aprobado.toLocaleString('es-MX')}
                          </p>
                          {typeof entregas === 'number' && (
                            <p className="text-xs text-[var(--app-ink-2)]">{entregas === 1 ? 'En 1 entrega' : `En ${entregas} entregas`}</p>
                          )}
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

                    {(mini.estado === 'autorizada' || mini.estado === 'pagada') &&
                      (mini.cuenta_clabe || mini.numero_cuenta) && (
                      <div className="rounded-[16px] bg-[var(--auth-field)] p-4 space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--app-ink-2)]">Cuenta para el depósito</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {mini.cuenta_clabe && (
                            <div>
                              <p className="text-[11px] text-[var(--app-ink-2)] uppercase mb-0.5">CLABE</p>
                              <p className="text-xs font-mono font-bold text-[var(--app-ink)] bg-[var(--app-card-bg)] px-3 py-2 rounded-[10px] border border-[var(--app-rule)]">
                                {mini.cuenta_clabe}
                              </p>
                            </div>
                          )}
                          {mini.numero_cuenta && (
                            <div>
                              <p className="text-[11px] text-[var(--app-ink-2)] uppercase mb-0.5">Número de cuenta</p>
                              <p className="text-xs font-mono font-bold text-[var(--app-ink)] bg-[var(--app-card-bg)] px-3 py-2 rounded-[10px] border border-[var(--app-rule)]">
                                {mini.numero_cuenta}
                              </p>
                            </div>
                          )}
                          {mini.titular_cuenta && (
                            <div>
                              <p className="text-[11px] text-[var(--app-ink-2)] uppercase mb-0.5">Titular</p>
                              <p className="text-xs font-bold text-[var(--app-ink)] bg-[var(--app-card-bg)] px-3 py-2 rounded-[10px] border border-[var(--app-rule)] truncate">
                                {mini.titular_cuenta}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {mini.observaciones && mini.estado !== 'rechazada' && (
                      <div className="rounded-[16px] px-4 py-3" style={{ backgroundColor: 'var(--tile-gold-bg)' }}>
                        <p className="text-xs font-bold text-[var(--app-ink)] mb-0.5">Observaciones</p>
                        <p className="text-sm text-[var(--app-ink)]">{mini.observaciones}</p>
                      </div>
                    )}

                    {mini.estado === 'rechazada' && (
                      <AlertBox
                        type="error"
                        title="Esta entrega necesita correcciones"
                        message={mini.observaciones || `Hay que corregir algo antes de continuar. Comunícate con ${INSTITUTION.name} para saber qué falta.`}
                      />
                    )}

                    <p className="text-xs text-[var(--app-ink-2)]">
                      Registrada el {new Date(mini.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
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
                <span className="pill shrink-0" data-tone={cfg.tone}>
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
