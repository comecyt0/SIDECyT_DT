'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  KeyRound, CheckCircle2, XCircle, Clock,
  Mail, User, RefreshCw, ShieldAlert
} from 'lucide-react';
import api from '@/lib/api';
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
  pending:  { label: 'Pendiente',  bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-300',   icon: Clock },
  approved: { label: 'Aprobada',   bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', icon: CheckCircle2 },
  rejected: { label: 'Rechazada',  bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-300',     icon: XCircle },
};

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
          setFeedback({ type: 'error', message: e.response?.data?.error || 'Error al aprobar la solicitud.' });
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
          setFeedback({ type: 'error', message: e.response?.data?.error || 'Error al rechazar la solicitud.' });
        }
      },
    });
  };

  const filtered = requests.filter(r => filter === 'all' || r.status === filter);
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900 dark:text-neutral-50 tracking-tight flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-primary" />
            Recuperación de Contraseñas
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Solicitudes de recuperación enviadas por usuarios. Apruébalas para enviar el enlace de restablecimiento.
          </p>
        </div>
        <button
          onClick={() => router.refresh()}
          className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 transition-colors"
          title="Actualizar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <AlertBox
          type={feedback.type}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}

      {/* Alert banner for pending requests */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 px-5 py-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-800">
              {pendingCount} solicitud{pendingCount > 1 ? 'es' : ''} pendiente{pendingCount > 1 ? 's' : ''} de revisión
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Aprueba las solicitudes para que los usuarios puedan recuperar su acceso.
            </p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'approved', 'rejected'] as const).map(f => {
          const count = f === 'all' ? requests.length : requests.filter(r => r.status === f).length;
          const active = filter === f;
          const colors = f === 'pending' ? 'bg-amber-100 text-amber-700' :
                         f === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                         f === 'rejected' ? 'bg-red-100 text-red-700' :
                         'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200';
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5 ${
                active ? colors + ' ring-2 ring-current/30 shadow-sm' : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`}
            >
              {{ all: 'Todas', pending: 'Pendientes', approved: 'Aprobadas', rejected: 'Rechazadas' }[f]}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-white/50' : 'bg-neutral-100 dark:bg-neutral-800'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-700 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
            </div>
            <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">Sin solicitudes</p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">No hay solicitudes de recuperación en este momento.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-50 dark:divide-neutral-800">
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
                    className="px-6 py-4 flex items-center gap-4 hover:bg-neutral-50/60 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-bold text-neutral-900 dark:text-neutral-50 truncate">
                          {req.nombre || req.email}
                        </p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${cfg.bg} ${cfg.text} uppercase tracking-tight shrink-0 flex items-center gap-1`}>
                          <Icon className="w-2.5 h-2.5" /> {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{req.email}</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                        Solicitado el {new Date(req.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {req.approved_at && ` · Procesado: ${new Date(req.approved_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}`}
                      </p>
                    </div>

                    {/* Actions */}
                    {req.status === 'pending' && (
                      <div className="flex gap-2 shrink-0">
                        <motion.button
                          whileHover={{ y: -1 }}
                          onClick={() => handleApprove(req)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-lg transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Aprobar
                        </motion.button>
                        <motion.button
                          whileHover={{ y: -1 }}
                          onClick={() => handleReject(req)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-600 hover:text-white rounded-lg transition-all"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Rechazar
                        </motion.button>
                      </div>
                    )}
                    {req.status !== 'pending' && (
                      <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${cfg.bg} ${cfg.text} shrink-0`}>
                        {req.status === 'approved' ? 'Enlace enviado' : 'Rechazada'}
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

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
