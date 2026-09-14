'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Radio, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
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

export default function ReverbStatusWidget() {
  const [status, setStatus] = useState<ReverbStatus | null>(null);
  const [loading, setLoading] = useState(true);

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
  const dotColor = loading
    ? 'bg-neutral-300'
    : reachable
      ? 'bg-emerald-500'
      : 'bg-red-500';

  return (
    <Card className="border-0 shadow-soft-xl rounded-3xl bg-white dark:bg-neutral-900 overflow-hidden">
      <CardHeader className="border-b border-neutral-50 dark:border-neutral-800 pb-4 p-6 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-primary" />
          <CardTitle className="text-sm font-bold text-neutral-900 dark:text-neutral-50">WebSockets (Reverb)</CardTitle>
        </div>
        <span role="status" aria-live="polite" className={`w-2.5 h-2.5 rounded-full ${dotColor}`}>
          <span className="sr-only">{reachable ? 'WebSockets activo' : 'WebSockets no responde'}</span>
        </span>
      </CardHeader>
      <CardContent className="p-6 text-sm">
        {loading ? (
          <div className="py-4 flex items-center justify-center text-neutral-500 dark:text-neutral-300">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : !status ? (
          <p className="text-xs text-neutral-500 dark:text-neutral-300">Sin datos.</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {reachable ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              )}
              <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                {reachable ? 'Daemon escuchando' : 'Daemon no responde'}
                {reachable && status.latency_ms != null && (
                  <span className="text-neutral-500 dark:text-neutral-300 font-normal"> · {status.latency_ms} ms</span>
                )}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
              <div>
                <p className="uppercase tracking-wider text-neutral-500 dark:text-neutral-300">Host</p>
                <p className="text-neutral-700 dark:text-neutral-200">{status.host}:{status.port}</p>
              </div>
              <div>
                <p className="uppercase tracking-wider text-neutral-500 dark:text-neutral-300">Driver</p>
                <p className="text-neutral-700 dark:text-neutral-200">{status.broadcast_driver}</p>
              </div>
            </div>
            {!reachable && (
              <p className="text-[10px] text-red-500 mt-2 leading-relaxed">{status.error || status.hint}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
