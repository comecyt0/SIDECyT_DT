'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  KeyRound, CheckCircle2, XCircle, Clock,
  Mail, User, RefreshCw, ShieldAlert
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/ui/page-header';
import { AlertBox } from '@/components/ui/alert-box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export interface ResetRequest {
  id: number;
  email: string;
  nombre: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_at: string | null;
  created_at: string;
}

const statusConfig = {
  pending:  { label: 'Pendiente',  tone: 'amber',   icon: Clock },
  approved: { label: 'Aprobada',   tone: 'emerald', icon: CheckCircle2 },
  rejected: { label: 'Rechazada',  tone: 'red',     icon: XCircle },
};

const FILTER_LABELS = { all: 'Todas', pending: 'Pendientes', approved: 'Aprobadas', rejected: 'Rechazadas' } as const;

interface Props {
  requests: ResetRequest[];
}

export default function ResetRequestsClient({ requests }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirm, setConfirm] = useState<{
    open: boolean; title: string; description: string; onConfirm: () => void;
  }>({ open: false, title: '', description: '', onConfirm: () => {} });

  // Auto-refresh every 30s to catch new requests without manual reload
  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 30000);
    return () => clearInterval(interval);
  }, [router]);

  const handleApprove = (req: ResetRequest) => {
    setConfirm({
      open: true,
      title: 'Aprobar solicitud',
      description: `¿Confirmas el envío del enlace de recuperación al correo ${req.email}? El usuario podrá restablecer su contraseña usando ese enlace.`,
      onConfirm: async () => {
        setConfirm(c => ({ ...c, open: false }));
        try {
          const { data } = await api.post(`/admin/reset-requests/${req.id}/aprobar`);
          setFeedback({ type: 'success', message: data.message });
          router.refresh();
        } catch (err: unknown) {
          const e = err as { response?: { data?: { error?: string } } };
          setFeedback({ type: 'error', message: e.response?.data?.error || 'No se pudo aprobar la solicitud. Inténtalo de nuevo.' });
        }
      },
    });
  };

  const handleReject = (req: ResetRequest) => {
    setConfirm({
      open: true,
      title: 'Rechazar solicitud',
      description: `¿Seguro que deseas rechazar la solicitud de ${req.email}? El usuario no recibirá el enlace de recuperación.`,
      onConfirm: async () => {
        setConfirm(c => ({ ...c, open: false }));
        try {
          const { data } = await api.post(`/admin/reset-requests/${req.id}/rechazar`);
          setFeedback({ type: 'success', message: data.message });
          router.refresh();
        } catch (err: unknown) {
          const e = err as { response?: { data?: { error?: string } } };
          setFeedback({ type: 'error', message: e.response?.data?.error || 'No se pudo rechazar la solicitud. Inténtalo de nuevo.' });
        }
      },
    });
  };

  const filtered = requests.filter(r => filter === 'all' || r.status === filter);
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Recuperación de contraseñas"
        description="Cuando alguien olvida su contraseña, su solicitud llega aquí. Al aprobarla se le envía el enlace para cambiarla."
        icon={<KeyRound className="h-5 w-5" />}
        actions={
          <Button variant="outline" onClick={() => router.refresh()}>
            <RefreshCw className="h-4 w-4" /> Actualizar
          </Button>
        }
      />

      {feedback && (
        <AlertBox
          type={feedback.type}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}

      {pendingCount > 0 && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-[18px]" style={{ backgroundColor: 'var(--tile-gold-bg)' }}>
          <ShieldAlert className="w-5 h-5 shrink-0" style={{ color: 'var(--tile-gold-fg)' }} aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-[var(--app-ink)]">
              {pendingCount} solicitud{pendingCount > 1 ? 'es' : ''} pendiente{pendingCount > 1 ? 's' : ''} de revisión
            </p>
            <p className="text-xs text-[var(--app-ink-2)] mt-0.5">
              Apruébalas para que esas personas puedan recuperar su acceso.
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-1.5 flex-wrap">
        {(['all', 'pending', 'approved', 'rejected'] as const).map(f => {
          const count = f === 'all' ? requests.length : requests.filter(r => r.status === f).length;
          const active = filter === f;
          return (
            <button
              key={f}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-colors duration-150 flex items-center gap-1.5 border ${
                active
                  ? 'bg-[var(--auth-vino)] text-white border-transparent'
                  : 'bg-[var(--app-card-bg)] text-[var(--app-ink-2)] border-[var(--app-rule)] hover:text-[var(--app-ink)]'
              }`}
            >
              {FILTER_LABELS[f]}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${active ? 'bg-white/20 text-white' : 'bg-[var(--auth-field)] text-[var(--app-ink-2)]'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <span className="tone-chip" data-tone="violet"><KeyRound aria-hidden="true" /></span>
            <p className="font-bold text-[var(--app-ink)]">Sin solicitudes todavía</p>
            <p className="text-sm text-[var(--app-ink-2)]">Aparecen cuando alguien pide recuperar su contraseña desde la pantalla de inicio de sesión.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--app-rule)]">
            <AnimatePresence>
              {filtered.map((req, i) => {
                const cfg = statusConfig[req.status];
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ delay: i * 0.04 }}
                    className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:bg-[var(--auth-field)] transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <span className="app-tile-icon shrink-0" style={{ color: 'var(--tile-sky-fg)' }}>
                        <User className="h-5 w-5" />
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <p className="text-sm font-bold text-[var(--app-ink)] truncate">
                            {req.nombre || req.email}
                          </p>
                          <span className="pill shrink-0" data-tone={cfg.tone}>
                            <Icon aria-hidden="true" /> {cfg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-[var(--app-ink-2)]">
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate">{req.email}</span>
                        </div>
                        <p className="text-[11px] text-[var(--app-ink-2)] mt-0.5">
                          Solicitado el {new Date(req.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {req.approved_at && ` · Atendida el ${new Date(req.approved_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}`}
                        </p>
                      </div>
                    </div>

                    {req.status === 'pending' && (
                      <div className="flex gap-2 shrink-0 sm:justify-end">
                        <Button size="sm" variant="soft" onClick={() => handleApprove(req)}>
                          <CheckCircle2 /> Aprobar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReject(req)}>
                          <XCircle /> Rechazar
                        </Button>
                      </div>
                    )}
                    {req.status !== 'pending' && (
                      <span className="pill shrink-0 self-start sm:self-auto" data-tone={cfg.tone}>
                        {req.status === 'approved' ? 'Enlace enviado' : 'Rechazada'}
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        description={confirm.description}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm(c => ({ ...c, open: false }))}
      />
    </div>
  );
}
