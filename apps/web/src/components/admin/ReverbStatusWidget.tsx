'use client';

import { useEffect, useState } from 'react';
import { Radio, Loader2, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
import api from '@/lib/api';

interface ReverbStatus {
  configured: boolean;
  host: string;
  port: number;
  scheme: string;
  reachable: boolean;
  latency_ms: number | null;
  error: string | null;
  broadcast_driver: string;
  hint: string;
}

/**
 * Estado de las notificaciones en tiempo real. 14/09/2026: sin jerga — antes decía
 * "WebSockets (Reverb) · Daemon · HOST · DRIVER". El detalle técnico queda plegado para soporte.
 */
export default function ReverbStatusWidget() {
  const [status, setStatus] = useState<ReverbStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data } = await api.get<ReverbStatus>('/admin/reverb/status');
        if (active) setStatus(data);
      } catch {
        if (active) setStatus(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    const id = window.setInterval(load, 60_000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  const reachable = status?.reachable ?? false;

  return (
    <section className="app-card p-5" aria-labelledby="rt-title">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="app-tile-icon !w-9 !h-9 !rounded-lg" style={{ color: reachable ? 'var(--tile-emerald-fg)' : 'var(--tile-vino-fg)' }}>
            <Radio className="w-4 h-4" />
          </span>
          <div>
            <p id="rt-title" className="text-sm font-bold text-[var(--app-ink)]">Notificaciones al instante</p>
            <p className="text-xs text-[var(--app-ink-2)]">Avisos que llegan sin recargar la página</p>
          </div>
        </div>
        <span
          role="status"
          aria-live="polite"
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ background: loading ? 'var(--auth-rule-strong)' : reachable ? 'var(--tile-emerald-fg)' : 'var(--auth-danger)' }}
        >
          <span className="sr-only">{reachable ? 'Funcionando' : 'Sin conexión'}</span>
        </span>
      </div>

      <div className="mt-4 text-sm">
        {loading ? (
          <div className="py-2 flex items-center gap-2 text-[var(--app-ink-2)]">
            <Loader2 className="w-4 h-4 animate-spin" /> Comprobando…
          </div>
        ) : !status ? (
          <p className="text-xs text-[var(--app-ink-2)]">No se pudo comprobar en este momento.</p>
        ) : reachable ? (
          <p className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--tile-emerald-fg)' }}>
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" /> Funcionando con normalidad
          </p>
        ) : (
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--auth-danger)' }}>
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" /> Sin conexión en este momento
            </p>
            <p className="text-xs text-[var(--app-ink-2)] leading-relaxed">
              Los avisos seguirán llegando al abrir cada sección; solo dejan de aparecer al instante. Si dura más de unos
              minutos, avisa a soporte técnico.
            </p>
          </div>
        )}

        {status && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowDetail((v) => !v)}
              aria-expanded={showDetail}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--app-ink-2)] hover:text-[var(--app-ink)]"
            >
              Información para soporte <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDetail ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {showDetail && (
              <dl className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-[var(--app-ink-2)]">
                <div><dt className="uppercase tracking-wider">Servicio</dt><dd className="text-[var(--app-ink)]">{status.host}:{status.port}</dd></div>
                <div><dt className="uppercase tracking-wider">Respuesta</dt><dd className="text-[var(--app-ink)]">{status.latency_ms != null ? `${status.latency_ms} ms` : '—'}</dd></div>
                {status.error && <div className="col-span-2"><dt className="uppercase tracking-wider">Mensaje</dt><dd className="text-[var(--app-ink)] break-words">{status.error}</dd></div>}
              </dl>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
