'use client';

import { useEffect, useState } from 'react';
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
  Eye, MapPin, ShieldCheck, IdCard, FlaskConical, GraduationCap, ArrowRightLeft,
} from 'lucide-react';
import api from '@/lib/api';
import { GRADO_ETIQUETA } from '@/lib/registro';

export interface SolicitudAcceso {
  id: number;
  nombre: string;
  email: string;
  empresa_nombre: string | null;
  cargo?: string;
  telefono?: string;
  motivo?: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  motivo_rechazo?: string;
  revisado_at?: string;
  revisado_por?: { id: number; name: string };
  created_at: string;
  // E52 · registro general
  rol_solicitado?: string;
  curp?: string | null;
  codigo_postal?: string | null;
  municipio?: string | null;
  colonia?: string | null;
  datos_rol?: { area_conocimiento_id?: number; institucion?: string; grado_academico?: string } | null;
  area_nombre?: string | null;
  tiene_cv?: boolean;
}

const ROL_SOLICITADO: Record<string, { label: string; tone: string }> = {
  solicitante: { label: 'Participante', tone: 'sky' },
  lider_club: { label: 'Líder de club', tone: 'mint' },
  evaluador: { label: 'Evaluador', tone: 'violet' },
};

/** Abre un PDF protegido (el CV) sin exponer la URL de la API: se descarga con la sesión y se muestra como blob. */
async function abrirPdf(url: string, onError: (m: string) => void) {
  try {
    const r = await api.get(url, { responseType: 'blob' });
    const objeto = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
    window.open(objeto, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(objeto), 60_000);
  } catch {
    onError('No se pudo abrir el CV.');
  }
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
  const [pestana, setPestana] = useState<'cuentas' | 'roles'>('cuentas');

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
    const matchesSearch = !q || s.nombre.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (s.empresa_nombre ?? '').toLowerCase().includes(q) || (s.municipio ?? '').toLowerCase().includes(q);
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
        description="Cuentas nuevas del registro general (con el rol que eligieron) y solicitudes de otro rol de personas que ya tienen cuenta."
        icon={<UserCheck className="h-5 w-5" />}
      />

      <div className="seg-tabs" role="tablist" aria-label="Tipo de solicitud">
        <button type="button" role="tab" aria-selected={pestana === 'cuentas'} onClick={() => setPestana('cuentas')} className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold">
          <UserCheck className="h-3.5 w-3.5" aria-hidden="true" /> Cuentas nuevas <span className="text-xs opacity-70">{counts.pendiente}</span>
        </button>
        <button type="button" role="tab" aria-selected={pestana === 'roles'} onClick={() => setPestana('roles')} className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold">
          <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden="true" /> Solicitudes de rol
        </button>
      </div>

      {pestana === 'roles' ? <SolicitudesRol /> : (<>
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
                          <span className="pill" data-tone={ROL_SOLICITADO[sol.rol_solicitado ?? 'solicitante']?.tone ?? 'mist'}>
                            {ROL_SOLICITADO[sol.rol_solicitado ?? 'solicitante']?.label ?? sol.rol_solicitado}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--app-ink-2)] flex items-center gap-3 flex-wrap">
                          <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3 shrink-0" />{sol.email}</span>
                          {sol.empresa_nombre && <span className="flex items-center gap-1 truncate"><Building2 className="w-3 h-3 shrink-0" />{sol.empresa_nombre}</span>}
                          {sol.municipio && <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{sol.municipio}</span>}
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
                <DetailItem icon={ShieldCheck} label="Rol solicitado" value={ROL_SOLICITADO[viewingSolicitud.rol_solicitado ?? 'solicitante']?.label ?? String(viewingSolicitud.rol_solicitado)} />
                <DetailItem icon={User} label="Nombre" value={viewingSolicitud.nombre} />
                <DetailItem icon={Mail} label="Correo" value={viewingSolicitud.email} />
                {viewingSolicitud.curp && <DetailItem icon={IdCard} label="CURP" value={viewingSolicitud.curp} />}
                {viewingSolicitud.empresa_nombre && <DetailItem icon={Building2} label="Empresa" value={viewingSolicitud.empresa_nombre} />}
                {viewingSolicitud.cargo && <DetailItem icon={Briefcase} label="Cargo" value={viewingSolicitud.cargo} />}
                {viewingSolicitud.telefono && <DetailItem icon={Phone} label="Teléfono" value={viewingSolicitud.telefono} />}
                {viewingSolicitud.municipio && (
                  <DetailItem icon={MapPin} label="Domicilio" value={`${viewingSolicitud.colonia ?? ''}, ${viewingSolicitud.municipio}, C.P. ${viewingSolicitud.codigo_postal ?? ''}`} />
                )}
                <DetailItem icon={Calendar} label="Fecha" value={new Date(viewingSolicitud.created_at).toLocaleDateString('es-MX')} />
                {viewingSolicitud.rol_solicitado === 'evaluador' && (
                  <>
                    <DetailItem icon={FlaskConical} label="Área de conocimiento" value={viewingSolicitud.area_nombre ?? '—'} />
                    <DetailItem icon={Building2} label="Institución" value={viewingSolicitud.datos_rol?.institucion ?? '—'} />
                    <DetailItem icon={GraduationCap} label="Grado académico" value={GRADO_ETIQUETA[viewingSolicitud.datos_rol?.grado_academico ?? ''] ?? '—'} />
                  </>
                )}
              </div>
              {viewingSolicitud.tiene_cv && (
                <Button variant="soft" onClick={() => abrirPdf(`/admin/solicitudes-acceso/${viewingSolicitud.id}/cv`, setError)}>
                  <FileText className="h-4 w-4" aria-hidden="true" /> Ver CV (PDF)
                </Button>
              )}

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
      </>)}
    </div>
  );
}

interface SolicitudRolItem {
  id: number;
  rol_solicitado: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  motivo_rechazo: string | null;
  datos_rol: { empresa_nombre?: string; institucion?: string; grado_academico?: string } | null;
  area_nombre: string | null;
  tiene_cv: boolean;
  created_at: string;
  revisado_por: string | null;
  user: { id: number; name: string; email: string; telefono?: string | null; cargo?: string | null; municipio?: string | null; empresa?: string | null } | null;
}

/** E52 — Personas con cuenta que piden otro rol desde "Mis roles". Se carga en el cliente al abrir la pestaña. */
function SolicitudesRol() {
  const [items, setItems] = useState<SolicitudRolItem[] | null>(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [procesando, setProcesando] = useState<number | null>(null);
  const [rechazo, setRechazo] = useState<SolicitudRolItem | null>(null);
  const [motivo, setMotivo] = useState('');

  const cargar = async () => {
    try {
      const { data } = await api.get('/admin/solicitudes-rol');
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setError('No se pudieron cargar las solicitudes de rol.');
      setItems([]);
    }
  };
  useEffect(() => { void cargar(); }, []);

  const aprobar = async (s: SolicitudRolItem) => {
    setProcesando(s.id); setError('');
    try {
      await api.post(`/admin/solicitudes-rol/${s.id}/aprobar`);
      setOk(`Listo: ${s.user?.name ?? 'la persona'} ya puede usar el rol «${ROL_SOLICITADO[s.rol_solicitado]?.label ?? s.rol_solicitado}».`);
      await cargar();
    } catch (e) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'No se pudo aprobar.');
    } finally { setProcesando(null); }
  };
  const rechazar = async () => {
    if (!rechazo || !motivo.trim()) return;
    setProcesando(rechazo.id); setError('');
    try {
      await api.post(`/admin/solicitudes-rol/${rechazo.id}/rechazar`, { motivo_rechazo: motivo.trim() });
      setOk('Solicitud rechazada. Le avisamos a la persona.');
      setRechazo(null); setMotivo('');
      await cargar();
    } catch (e) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'No se pudo rechazar.');
    } finally { setProcesando(null); }
  };

  return (
    <div className="space-y-4">
      {error && <AlertBox type="error" message={error} onClose={() => setError('')} />}
      {ok && <AlertBox type="success" message={ok} onClose={() => setOk('')} />}
      <Card>
        <CardHeader>
          <CardTitle><ArrowRightLeft className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Solicitudes de rol <span className="text-sm font-normal text-[var(--app-ink-2)]">({items?.length ?? 0})</span></CardTitle>
          <CardDescription>Personas que ya tienen cuenta y piden otro rol. Al aprobar, pueden cambiar a ese rol desde «Mi cuenta».</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {items === null ? (
            <p className="px-6 py-8 text-sm text-[var(--app-ink-2)]"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />Cargando…</p>
          ) : items.length === 0 ? (
            <div className="empty-state">
              <span className="tone-chip" data-tone="violet"><ArrowRightLeft aria-hidden="true" /></span>
              <p className="font-bold text-[var(--app-ink)]">Sin solicitudes de rol</p>
              <p className="text-sm text-[var(--app-ink-2)]">Aparecen cuando alguien con cuenta pide otro rol desde «Mi cuenta → Mis roles».</p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--app-rule)]">
              {items.map((s) => {
                const cfg = ESTADO_CONFIG[s.estado];
                return (
                  <li key={s.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold">{s.user?.name ?? '—'}</p>
                        <span className="pill" data-tone={cfg.tone}>{cfg.label}</span>
                        <span className="pill" data-tone={ROL_SOLICITADO[s.rol_solicitado]?.tone ?? 'mist'}>Pide: {ROL_SOLICITADO[s.rol_solicitado]?.label ?? s.rol_solicitado}</span>
                      </div>
                      <p className="flex flex-wrap items-center gap-3 text-xs text-[var(--app-ink-2)]">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{s.user?.email}</span>
                        {s.user?.municipio && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.user.municipio}</span>}
                        {s.datos_rol?.empresa_nombre && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{s.datos_rol.empresa_nombre}</span>}
                        {s.area_nombre && <span className="flex items-center gap-1"><FlaskConical className="h-3 w-3" />{s.area_nombre}</span>}
                        {s.datos_rol?.grado_academico && <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" />{GRADO_ETIQUETA[s.datos_rol.grado_academico] ?? s.datos_rol.grado_academico}</span>}
                      </p>
                      {s.estado === 'rechazada' && s.motivo_rechazo && <p className="mt-1 text-xs text-[var(--app-ink-2)]">Motivo: {s.motivo_rechazo}</p>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {s.tiene_cv && <Button size="sm" variant="outline" onClick={() => abrirPdf(`/admin/solicitudes-rol/${s.id}/cv`, setError)}><FileText className="h-3.5 w-3.5" /> CV</Button>}
                      {s.estado === 'pendiente' && (
                        <>
                          <Button size="sm" variant="soft" disabled={procesando === s.id} onClick={() => aprobar(s)}>{procesando === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Aprobar'}</Button>
                          <Button size="sm" variant="destructive" onClick={() => { setRechazo(s); setMotivo(''); }}>Rechazar</Button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!rechazo} onOpenChange={(o) => !o && setRechazo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Rechazar solicitud de rol</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <label htmlFor="rol-motivo" className="block text-xs font-bold text-[var(--app-ink-2)]">Motivo (se le envía a la persona) *</label>
            <textarea id="rol-motivo" value={motivo} maxLength={1000} onChange={(e) => setMotivo(e.target.value)} className="auth-input auth-input-static !h-auto min-h-[100px] resize-y py-3 pl-4" />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" className="flex-1" onClick={() => setRechazo(null)}>Cancelar</Button>
              <Button variant="destructive" className="flex-1" disabled={!motivo.trim() || procesando !== null} onClick={rechazar}>Confirmar rechazo</Button>
            </div>
          </div>
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
