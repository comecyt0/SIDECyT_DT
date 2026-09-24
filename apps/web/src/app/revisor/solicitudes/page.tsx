'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, CheckCircle, XCircle, Loader2, Search, FileText, CheckCircle2, Inbox } from 'lucide-react';
import api from '@/lib/api';
import { AlertBox } from '@/components/ui/alert-box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/ui/page-header';
import { estadoBadgeClass, estadoLabel } from '@/lib/solicitud-estados';
import type { Solicitud } from '@/types/api';
import SavedFiltersBar from '@/components/filters/SavedFiltersBar';
import UserAvatar from '@/components/ui/user-avatar';

export default function RevisorSolicitudesPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState<{type: 'error'|'success'|'info'|'warning', message: string}|null>(null);
  const [confirmState, setConfirmState] = useState<{open: boolean; title: string; description: string; onConfirm: () => void}>({
    open: false, title: '', description: '', onConfirm: () => {},
  });

  useEffect(() => {
    const loadSolicitudes = async () => {
      setLoading(true);
      try {
        const response = await api.get('/revisor/solicitudes/pendientes');
        const items = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.data)
          ? response.data.data
          : [];
        setSolicitudes(items);
      } catch {
        setSolicitudes([]);
      } finally {
        setLoading(false);
      }
    };
    loadSolicitudes();
  }, []);

  const handleApprove = (id: number) => {
    setConfirmState({
      open: true,
      title: 'Turnar a evaluación técnica',
      description: '¿Seguro que deseas turnar esta solicitud a evaluación técnica?',
      onConfirm: async () => {
        try {
          await api.post(`/revisor/solicitudes/${id}/aprobar`);
          setFeedback({ type: 'success', message: 'La solicitud se aprobó y ya está en evaluación técnica.' });
          window.location.reload();
        } catch (err: any) {
          setFeedback({ type: 'error', message: err.response?.data?.error || 'No se pudo aprobar la solicitud. Intenta de nuevo.' });
        }
      },
    });
  };

  const filteredSolicitudes = Array.isArray(solicitudes)
    ? solicitudes.filter(s =>
        s.folio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.titulo_proyecto?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const total = filteredSolicitudes.length;

  return (
    <div className="space-y-8">
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        onConfirm={() => { confirmState.onConfirm(); setConfirmState(s => ({...s, open: false})); }}
        onCancel={() => setConfirmState(s => ({...s, open: false}))}
        variant="default"
      />

      {feedback && (
        <AlertBox type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />
      )}

      <PageHeader
        title="Bandeja de revisión"
        description="Revisa los documentos de cada solicitud, apruébala para evaluación técnica o regrésala con observaciones."
        icon={<Inbox className="h-5 w-5" />}
      />

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--app-ink-2)] pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              aria-label="Buscar por folio o título"
              placeholder="Buscar por folio o título"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="auth-input auth-input-static pl-10"
            />
          </div>
        </div>
        <SavedFiltersBar
          scope="revisor.bandeja"
          currentFilters={{ search: searchTerm }}
          onApply={(f) => setSearchTerm(String(f.search ?? ''))}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <FileText className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} />
            Solicitudes por revisar
          </CardTitle>
          <CardDescription>
            {loading ? 'Cargando…' : total === 1 ? '1 solicitud en la bandeja' : `${total} solicitudes en la bandeja`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--auth-vino)]" />
            </div>
          ) : filteredSolicitudes.length === 0 ? (
            <div className="empty-state">
              <span className="tone-chip" data-tone={searchTerm ? 'sky' : 'emerald'}>
                {searchTerm ? <Search aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
              </span>
              <p className="font-bold text-[var(--app-ink)]">
                {searchTerm ? 'No encontramos solicitudes con ese texto' : 'Nada pendiente por ahora'}
              </p>
              <p className="text-sm text-[var(--app-ink-2)]">
                {searchTerm ? 'Prueba con otro folio u otra palabra del título.' : 'No hay solicitudes esperando revisión.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--app-rule)]">
              {filteredSolicitudes.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="px-5 sm:px-6 py-4 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4 hover:bg-[var(--auth-field)] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-semibold" style={{ color: 'var(--auth-vino)' }}>
                        {s.folio}
                      </span>
                      <span className={estadoBadgeClass(s.estado)}>
                        {estadoLabel(s.estado)}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[var(--app-ink)] truncate">
                      {s.titulo_proyecto}
                    </p>
                    <p className="text-xs text-[var(--app-ink-2)] mt-0.5 truncate flex items-center gap-1.5">
                      <UserAvatar user={s.user} size="xs" />
                      {s.user?.name || s.empresa?.nombre || 'Solicitante'}
                      {s.updated_at && (
                        <span className="ml-2">
                          · {new Date(s.updated_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Link href={`/revisor/solicitudes/${s.id}`}>
                      <Button variant="soft" size="sm" title="Ver la solicitud completa">
                        <Eye className="h-3.5 w-3.5" />
                        Ver
                      </Button>
                    </Link>
                    <Button size="sm" onClick={() => handleApprove(s.id)} title="Turnar a evaluación técnica">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Aprobar
                    </Button>
                    <Link href={`/revisor/solicitudes/${s.id}`}>
                      <Button variant="outline" size="sm" title="Regresar con observaciones">
                        <XCircle className="h-3.5 w-3.5" />
                        Observar
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
