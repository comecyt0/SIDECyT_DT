'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertBox } from '@/components/ui/alert-box';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  UserCheck, Clock, CheckCircle2, XCircle, Search, Loader2,
  Mail, Building2, Briefcase, Phone, FileText, User, Calendar,
  Eye
} from 'lucide-react';
import api from '@/lib/api';

export interface SolicitudAcceso {
  id: number;
  nombre: string;
  email: string;
  institucion_nombre: string;
  cargo?: string;
  telefono?: string;
  motivo?: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  motivo_rechazo?: string;
  revisado_at?: string;
  revisado_por?: { id: number; name: string };
  created_at: string;
}

const ESTADO_CONFIG = {
  pendiente: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  aprobada: { label: 'Aprobada', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  rechazada: { label: 'Rechazada', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
};

interface Props {
  solicitudes: SolicitudAcceso[];
}

export default function SolicitudesAccesoClient({ solicitudes }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'pendiente' | 'aprobada' | 'rechazada'>('pendiente');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Detail / approve / reject
  const [viewingSolicitud, setViewingSolicitud] = useState<SolicitudAcceso | null>(null);
  const [rejectDialog, setRejectDialog] = useState<SolicitudAcceso | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [processing, setProcessing] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState<SolicitudAcceso | null>(null);

  const handleAprobar = async (sol: SolicitudAcceso) => {
    setProcessing(true);
    setError('');
    try {
      await api.post(`/admin/solicitudes-acceso/${sol.id}/aprobar`);
      setSuccess(`Acceso aprobado para ${sol.nombre}. Se envió notificación por correo.`);
      setConfirmApprove(null);
      setViewingSolicitud(null);
      router.refresh();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Error al aprobar la solicitud.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRechazar = async () => {
    if (!rejectDialog || !motivoRechazo.trim()) return;
    setProcessing(true);
    setError('');
    try {
      await api.post(`/admin/solicitudes-acceso/${rejectDialog.id}/rechazar`, { motivo_rechazo: motivoRechazo });
      setSuccess(`Solicitud de ${rejectDialog.nombre} rechazada. Se notificó al solicitante.`);
      setRejectDialog(null);
      setMotivoRechazo('');
      setViewingSolicitud(null);
      router.refresh();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Error al rechazar la solicitud.');
    } finally {
      setProcessing(false);
    }
  };

  const filtered = solicitudes.filter((s) => {
    const matchesFilter = filter === 'all' || s.estado === filter;
    const q = search.toLowerCase();
    const matchesSearch = !q || s.nombre.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.institucion_nombre.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const counts = {
    pendiente: solicitudes.filter((s) => s.estado === 'pendiente').length,
    aprobada: solicitudes.filter((s) => s.estado === 'aprobada').length,
    rechazada: solicitudes.filter((s) => s.estado === 'rechazada').length,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50 flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
            <UserCheck className="w-5 h-5" />
          </span>
          Solicitudes de Acceso
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1 ml-13">
          Revisa y gestiona las solicitudes de registro de nuevos usuarios.
        </p>
      </div>

      {error && <AlertBox type="error" message={error} onClose={() => setError('')} />}
      {success && <AlertBox type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        {([
          { key: 'pendiente', label: 'Pendientes', icon: Clock, color: 'from-amber-50 to-orange-50 border-amber-200 text-amber-700' },
          { key: 'aprobada', label: 'Aprobadas', icon: CheckCircle2, color: 'from-emerald-50 to-green-50 border-emerald-200 text-emerald-700' },
          { key: 'rechazada', label: 'Rechazadas', icon: XCircle, color: 'from-red-50 to-rose-50 border-red-200 text-red-600' },
        ] as const).map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => setFilter(filter === key ? 'all' : key)}
            className={`p-4 rounded-xl border bg-gradient-to-br ${color} transition-all duration-200 text-left hover:shadow-md hover:-translate-y-0.5 ${filter === key ? 'ring-2 ring-offset-1 ring-current/30 shadow-md' : ''}`}
          >
            <div className="flex items-center justify-between mb-1">
              <Icon className="w-5 h-5" />
              <span className="text-2xl font-extrabold">{counts[key]}</span>
            </div>
            <p className="text-xs font-semibold">{label}</p>
          </button>
        ))}
      </div>

      {/* Table card */}
      <Card className="border-0 shadow-md">
        <CardHeader className="bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-700 pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg text-primary flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                {filter === 'all' ? 'Todas' : ESTADO_CONFIG[filter].label}
                <span className="text-sm font-normal text-neutral-400 dark:text-neutral-500">({filtered.length})</span>
              </CardTitle>
              <CardDescription>Haz clic en una solicitud para ver detalles y tomar acción.</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              <Input
                placeholder="Buscar por nombre, correo o institución..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64 bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-neutral-400 dark:text-neutral-500">
              <UserCheck className="w-12 h-12 mx-auto mb-3 text-neutral-200" />
              <p>No hay solicitudes {filter !== 'all' && ESTADO_CONFIG[filter].label.toLowerCase() + 's'}.</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-50 dark:divide-neutral-800">
              {filtered.map((sol) => {
                const cfg = ESTADO_CONFIG[sol.estado];
                const Icon = cfg.icon;
                return (
                  <div
                    key={sol.id}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer group"
                    onClick={() => setViewingSolicitud(sol)}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      {sol.nombre.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold text-sm text-neutral-900 dark:text-neutral-50 truncate">{sol.nombre}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold shrink-0 ${cfg.color}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate flex items-center gap-3">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{sol.email}</span>
                        <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{sol.institucion_nombre}</span>
                      </p>
                    </div>

                    {/* Date + Actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 hidden sm:block">
                        {new Date(sol.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      {sol.estado === 'pendiente' && (
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmApprove(sol); }}
                            className="px-3 py-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                          >
                            Aprobar
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setRejectDialog(sol); setMotivoRechazo(''); }}
                            className="px-3 py-1.5 text-xs font-bold bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                          >
                            Rechazar
                          </button>
                        </div>
                      )}
                      <Eye className="w-4 h-4 text-neutral-300 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!viewingSolicitud} onOpenChange={(open) => !open && setViewingSolicitud(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Solicitud de Acceso
            </DialogTitle>
          </DialogHeader>
          {viewingSolicitud && (
            <div className="space-y-4">
              {/* Status */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold ${ESTADO_CONFIG[viewingSolicitud.estado].color}`}>
                {(() => { const Icon = ESTADO_CONFIG[viewingSolicitud.estado].icon; return <Icon className="w-4 h-4" />; })()}
                Estado: {ESTADO_CONFIG[viewingSolicitud.estado].label}
                {viewingSolicitud.revisado_at && (
                  <span className="ml-auto text-xs font-normal opacity-70">
                    {new Date(viewingSolicitud.revisado_at).toLocaleDateString('es-MX')}
                  </span>
                )}
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <DetailItem icon={User} label="Nombre" value={viewingSolicitud.nombre} />
                <DetailItem icon={Mail} label="Correo" value={viewingSolicitud.email} />
                <DetailItem icon={Building2} label="Institución" value={viewingSolicitud.institucion_nombre} />
                {viewingSolicitud.cargo && <DetailItem icon={Briefcase} label="Cargo" value={viewingSolicitud.cargo} />}
                {viewingSolicitud.telefono && <DetailItem icon={Phone} label="Teléfono" value={viewingSolicitud.telefono} />}
                <DetailItem icon={Calendar} label="Fecha" value={new Date(viewingSolicitud.created_at).toLocaleDateString('es-MX')} />
              </div>

              {viewingSolicitud.motivo && (
                <div>
                  <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Motivo
                  </p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-200 bg-neutral-50 dark:bg-neutral-900 p-3 rounded-xl border border-neutral-100 dark:border-neutral-700 leading-relaxed">
                    {viewingSolicitud.motivo}
                  </p>
                </div>
              )}

              {viewingSolicitud.motivo_rechazo && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-xs font-bold text-red-600 mb-1">Motivo de rechazo:</p>
                  <p className="text-sm text-red-700">{viewingSolicitud.motivo_rechazo}</p>
                </div>
              )}

              {viewingSolicitud.estado === 'pendiente' && (
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => { setViewingSolicitud(null); setRejectDialog(viewingSolicitud); setMotivoRechazo(''); }}
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-1.5" /> Rechazar
                  </Button>
                  <Button
                    onClick={() => { setViewingSolicitud(null); setConfirmApprove(viewingSolicitud); }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Aprobar Acceso
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Confirm */}
      <ConfirmDialog
        open={!!confirmApprove}
        title="Aprobar solicitud de acceso"
        description={`¿Confirmas que deseas aprobar el acceso de ${confirmApprove?.nombre} (${confirmApprove?.email})? Se creará su cuenta y se le notificará por correo.`}
        confirmLabel="Sí, aprobar acceso"
        variant="default"
        onConfirm={() => confirmApprove && handleAprobar(confirmApprove)}
        onCancel={() => setConfirmApprove(null)}
      />

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={(open) => !open && setRejectDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Rechazar Solicitud
            </DialogTitle>
          </DialogHeader>
          {rejectDialog && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                Estás rechazando la solicitud de <strong>{rejectDialog.nombre}</strong>. El solicitante recibirá un correo con el motivo.
              </p>
              <div>
                <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider block mb-1.5">
                  Motivo del Rechazo *
                </label>
                <textarea
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  placeholder="Explica el motivo por el que se rechaza la solicitud de acceso..."
                  className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setRejectDialog(null)} className="flex-1" disabled={processing}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleRechazar}
                  disabled={!motivoRechazo.trim() || processing}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Rechazo'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-neutral-400 dark:text-neutral-500 mt-0.5 shrink-0" />
      <div>
        <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-neutral-800 dark:text-neutral-100 font-medium">{value}</p>
      </div>
    </div>
  );
}
