'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/ui/page-header';
import StatTile from '@/components/ui/stat-tile';
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
  empresa_nombre: string;
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
  pendiente: { label: 'Pendiente', tone: 'amber', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  aprobada: { label: 'Aprobada', tone: 'emerald', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  rechazada: { label: 'Rechazada', tone: 'red', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
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
      setSuccess(`Listo: ${sol.nombre} ya tiene acceso. Le avisamos por correo.`);
      setConfirmApprove(null);
      setViewingSolicitud(null);
      router.refresh();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'No se pudo aprobar la solicitud. Inténtalo de nuevo.');
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
      setSuccess(`La solicitud de ${rejectDialog.nombre} quedó rechazada. Le avisamos por correo.`);
      setRejectDialog(null);
      setMotivoRechazo('');
      setViewingSolicitud(null);
      router.refresh();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'No se pudo rechazar la solicitud. Inténtalo de nuevo.');
    } finally {
      setProcessing(false);
    }
  };

  const filtered = solicitudes.filter((s) => {
    const matchesFilter = filter === 'all' || s.estado === filter;
    const q = search.toLowerCase();
    const matchesSearch = !q || s.nombre.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.empresa_nombre.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const counts = {
    pendiente: solicitudes.filter((s) => s.estado === 'pendiente').length,
    aprobada: solicitudes.filter((s) => s.estado === 'aprobada').length,
    rechazada: solicitudes.filter((s) => s.estado === 'rechazada').length,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="Solicitudes de acceso"
        description="Personas que pidieron una cuenta para entrar al sistema. Revisa cada solicitud y apruébala o recházala."
        icon={<UserCheck className="h-5 w-5" />}
      />

      {error && <AlertBox type="error" message={error} onClose={() => setError('')} />}
      {success && <AlertBox type="success" message={success} onClose={() => setSuccess('')} />}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {([
          { key: 'pendiente', label: 'Pendientes', hint: 'Esperan tu decisión', icon: Clock, tone: 'gold', solid: true },
          { key: 'aprobada', label: 'Aprobadas', hint: 'Ya tienen cuenta', icon: CheckCircle2, tone: 'emerald', solid: false },
          { key: 'rechazada', label: 'Rechazadas', hint: 'Se les avisó el motivo', icon: XCircle, tone: 'vino', solid: false },
        ] as const).map(({ key, label, hint, icon: Icon, tone, solid }) => {
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(active ? 'all' : key)}
              className={`text-left w-full rounded-[28px] outline-none transition-[transform] duration-200 hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-[var(--auth-vino-soft)] ${active ? 'ring-4 ring-[var(--auth-vino-soft)]' : ''}`}
            >
              <StatTile label={label} value={counts[key]} hint={hint} icon={<Icon className="h-5 w-5" />} tone={tone} solid={solid} />
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle>
                <UserCheck className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} />
                {filter === 'all' ? 'Todas las solicitudes' : ESTADO_CONFIG[filter].label + 's'}
                <span className="text-sm font-normal text-[var(--app-ink-2)]">({filtered.length})</span>
              </CardTitle>
              <CardDescription>Toca una solicitud para ver el detalle y decidir.</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--app-ink-2)] pointer-events-none" aria-hidden="true" />
              <input
                type="search"
                aria-label="Buscar solicitudes de acceso"
                placeholder="Buscar por nombre, correo o institución"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="auth-input auth-input-static pl-10 !h-11"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <span className="tone-chip" data-tone={solicitudes.length === 0 ? 'violet' : 'sky'}>
                {solicitudes.length === 0 ? <UserCheck aria-hidden="true" /> : <Search aria-hidden="true" />}
              </span>
              <p className="font-bold text-[var(--app-ink)]">
                {solicitudes.length === 0 ? 'Sin solicitudes todavía' : 'Ninguna solicitud coincide'}
              </p>
              <p className="text-sm text-[var(--app-ink-2)]">
                {solicitudes.length === 0
                  ? 'Aparecen cuando alguien pide una cuenta desde la pantalla de inicio de sesión.'
                  : 'Prueba con otro filtro u otra búsqueda.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--app-rule)]">
              {filtered.map((sol) => {
                const cfg = ESTADO_CONFIG[sol.estado];
                const Icon = cfg.icon;
                return (
                  <div
                    key={sol.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-5 sm:px-6 py-4 hover:bg-[var(--auth-field)] transition-colors cursor-pointer group"
                    onClick={() => setViewingSolicitud(sol)}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <span className="app-tile-icon shrink-0 font-bold text-sm" style={{ color: 'var(--tile-sky-fg)' }}>
                        {sol.nombre.charAt(0).toUpperCase()}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <p className="font-bold text-sm text-[var(--app-ink)] truncate">{sol.nombre}</p>
                          <span className="pill" data-tone={cfg.tone}>
                            <Icon aria-hidden="true" />
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--app-ink-2)] flex items-center gap-3 flex-wrap">
                          <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3 shrink-0" />{sol.email}</span>
                          <span className="flex items-center gap-1 truncate"><Building2 className="w-3 h-3 shrink-0" />{sol.empresa_nombre}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 sm:justify-end">
                      <p className="text-xs text-[var(--app-ink-2)] hidden md:block">
                        {new Date(sol.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      {sol.estado === 'pendiente' && (
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="soft" onClick={(e) => { e.stopPropagation(); setConfirmApprove(sol); }}>
                            Aprobar
                          </Button>
                          <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); setRejectDialog(sol); setMotivoRechazo(''); }}>
                            Rechazar
                          </Button>
                        </div>
                      )}
                      <Eye className="w-4 h-4 text-[var(--app-ink-2)] transition-colors group-hover:text-[var(--auth-vino)]" aria-hidden="true" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewingSolicitud} onOpenChange={(open) => !open && setViewingSolicitud(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" style={{ color: 'var(--auth-vino)' }} />
              Solicitud de acceso
            </DialogTitle>
          </DialogHeader>
          {viewingSolicitud && (
            <div className="space-y-4">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-[12px] border text-sm font-semibold ${ESTADO_CONFIG[viewingSolicitud.estado].color}`}>
                {(() => { const Icon = ESTADO_CONFIG[viewingSolicitud.estado].icon; return <Icon className="w-4 h-4" />; })()}
                Estado: {ESTADO_CONFIG[viewingSolicitud.estado].label}
                {viewingSolicitud.revisado_at && (
                  <span className="ml-auto text-xs font-normal opacity-70">
                    {new Date(viewingSolicitud.revisado_at).toLocaleDateString('es-MX')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <DetailItem icon={User} label="Nombre" value={viewingSolicitud.nombre} />
                <DetailItem icon={Mail} label="Correo" value={viewingSolicitud.email} />
                <DetailItem icon={Building2} label="Institución" value={viewingSolicitud.empresa_nombre} />
                {viewingSolicitud.cargo && <DetailItem icon={Briefcase} label="Cargo" value={viewingSolicitud.cargo} />}
                {viewingSolicitud.telefono && <DetailItem icon={Phone} label="Teléfono" value={viewingSolicitud.telefono} />}
                <DetailItem icon={Calendar} label="Fecha" value={new Date(viewingSolicitud.created_at).toLocaleDateString('es-MX')} />
              </div>

              {viewingSolicitud.motivo && (
                <div>
                  <p className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Motivo
                  </p>
                  <p className="text-sm text-[var(--app-ink)] p-3 rounded-[12px] leading-relaxed bg-[var(--auth-field)]">
                    {viewingSolicitud.motivo}
                  </p>
                </div>
              )}

              {viewingSolicitud.motivo_rechazo && (
                <div className="p-3 rounded-[12px] bg-red-50 border border-red-200">
                  <p className="text-xs font-bold mb-1" style={{ color: 'var(--auth-danger)' }}>Motivo del rechazo</p>
                  <p className="text-sm text-red-700">{viewingSolicitud.motivo_rechazo}</p>
                </div>
              )}

              {viewingSolicitud.estado === 'pendiente' && (
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    onClick={() => { setViewingSolicitud(null); setRejectDialog(viewingSolicitud); setMotivoRechazo(''); }}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4" /> Rechazar
                  </Button>
                  <Button
                    onClick={() => { setViewingSolicitud(null); setConfirmApprove(viewingSolicitud); }}
                    className="flex-1"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Aprobar acceso
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmApprove}
        title="Aprobar solicitud de acceso"
        description={`Se creará la cuenta de ${confirmApprove?.nombre} (${confirmApprove?.email}) y le avisaremos por correo. ¿Quieres continuar?`}
        confirmLabel="Sí, aprobar acceso"
        variant="default"
        onConfirm={() => confirmApprove && handleAprobar(confirmApprove)}
        onCancel={() => setConfirmApprove(null)}
      />

      <Dialog open={!!rejectDialog} onOpenChange={(open) => !open && setRejectDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: 'var(--auth-danger)' }}>
              <XCircle className="w-5 h-5" />
              Rechazar solicitud
            </DialogTitle>
          </DialogHeader>
          {rejectDialog && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--app-ink-2)]">
                Vas a rechazar la solicitud de <strong className="text-[var(--app-ink)]">{rejectDialog.nombre}</strong>. La persona recibirá un correo con el motivo.
              </p>
              <div className="space-y-1.5">
                <label htmlFor="acc-motivo-rechazo" className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest block">
                  Motivo del rechazo *
                </label>
                <textarea
                  id="acc-motivo-rechazo"
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  placeholder="Explica con tus palabras por qué no se aprueba el acceso."
                  className="auth-input auth-input-static pl-4 !h-auto min-h-[100px] py-3 resize-y"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={() => setRejectDialog(null)} className="flex-1" disabled={processing}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleRechazar}
                  disabled={!motivoRechazo.trim() || processing}
                  variant="destructive"
                  className="flex-1"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar rechazo'}
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
      <Icon className="w-4 h-4 text-[var(--app-ink-2)] mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-[var(--app-ink-2)] uppercase tracking-wider">{label}</p>
        <p className="text-sm text-[var(--app-ink)] font-medium break-words">{value}</p>
      </div>
    </div>
  );
}
