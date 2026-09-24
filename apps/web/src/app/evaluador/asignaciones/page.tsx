'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  FileSignature, Loader2, ArrowRight, Download, Search,
  Calendar, Building2, CheckCircle2, ClipboardList,
} from 'lucide-react';
import api from '@/lib/api';
import type { AsignacionEvaluador } from '@/types/api';
import { AlertBox } from '@/components/ui/alert-box';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/ui/page-header';
import SavedFiltersBar from '@/components/filters/SavedFiltersBar';
import { parseDate } from '@/lib/format';
import { UserChip } from '@/components/ui/user-avatar';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};

const estadoConfig: Record<string, { label: string; tone: string }> = {
  asignado:   { label: 'Por iniciar', tone: 'sky' },
  notificado: { label: 'Por iniciar', tone: 'sky' },
  evaluando:  { label: 'En evaluación', tone: 'amber' },
  concluido:  { label: 'Dictamen emitido', tone: 'emerald' },
};

export default function AsignacionesPage() {
  const router = useRouter();
  const [asignaciones, setAsignaciones] = useState<AsignacionEvaluador[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('');
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAsignaciones = async () => {
      try {
        const response = await api.get('/evaluador/asignaciones');
        const items = Array.isArray(response.data)
          ? response.data
          : (response.data?.data || []);
        setAsignaciones(items);
      } catch {
        setAsignaciones([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAsignaciones();
  }, []);

  const filteredAsignaciones = asignaciones.filter((asig) => {
    const matchesSearch = !searchTerm ||
      asig.solicitud?.folio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asig.solicitud?.titulo_proyecto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asig.solicitud?.empresa?.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = !filterEstado || asig.estado === filterEstado;
    return matchesSearch && matchesEstado;
  });

  const handleDownloadDictamen = async (id: number, folio: string) => {
    try {
      const response = await api.get(`/documentos/dictamen/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Dictamen_${folio}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setDownloadError('No se pudo descargar el dictamen. Intenta de nuevo.');
    }
  };

  return (
    <div className="space-y-8">
      {downloadError && (
        <AlertBox type="error" message={downloadError} onClose={() => setDownloadError(null)} />
      )}

      <PageHeader
        title="Mis asignaciones"
        description="Proyectos que te asignaron para evaluar. Abre uno para llenar la rúbrica o descarga el dictamen de los que ya concluiste."
        icon={<ClipboardList className="h-5 w-5" />}
      />

      {!loading && asignaciones.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--app-ink-2)] pointer-events-none" aria-hidden="true" />
              <input
                type="search"
                aria-label="Buscar por folio, proyecto o institución"
                placeholder="Buscar por folio, proyecto o institución"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="auth-input auth-input-static pl-10"
              />
            </div>
            <div className="sm:w-56">
              <select
                aria-label="Filtrar por estado"
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="auth-input auth-input-static pl-4"
              >
                <option value="">Todos los estados</option>
                <option value="asignado">Por iniciar</option>
                <option value="evaluando">En evaluación</option>
                <option value="concluido">Dictamen emitido</option>
              </select>
            </div>
          </div>
          <SavedFiltersBar
            scope="evaluador.asignaciones"
            currentFilters={{ search: searchTerm, estado: filterEstado }}
            onApply={(f) => {
              setSearchTerm(String(f.search ?? ''));
              setFilterEstado(String(f.estado ?? ''));
            }}
          />
        </div>
      )}

      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--auth-vino)]" />
        </div>
      ) : asignaciones.length === 0 ? (
        <Card>
          <CardContent>
            <div className="empty-state">
              <span className="tone-chip" data-tone="violet"><ClipboardList aria-hidden="true" /></span>
              <p className="font-bold text-[var(--app-ink)]">Nada pendiente por ahora</p>
              <p className="text-sm text-[var(--app-ink-2)]">Cuando el comité técnico te asigne un proyecto, aparecerá aquí.</p>
            </div>
          </CardContent>
        </Card>
      ) : filteredAsignaciones.length === 0 ? (
        <Card>
          <CardContent>
            <div className="empty-state">
              <span className="tone-chip" data-tone="sky"><Search aria-hidden="true" /></span>
              <p className="font-bold text-[var(--app-ink)]">No encontramos proyectos con esos filtros</p>
              <p className="text-sm text-[var(--app-ink-2)]">Prueba con otro texto o cambia el estado.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          {filteredAsignaciones.map((asig) => {
            const cfg = estadoConfig[asig.estado] ?? { label: asig.estado, tone: 'neutral' };
            const esConcluido = asig.estado === 'concluido';
            const esNuevo = asig.estado === 'asignado' || asig.estado === 'notificado';

            return (
              <motion.div key={asig.id} variants={item}>
                <Card className="h-full">
                  <CardContent className="flex flex-col gap-4 h-full">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="pill" data-tone={cfg.tone}>
                          {cfg.label}
                        </span>
                        <span className="font-mono text-xs font-semibold" style={{ color: 'var(--auth-vino)' }}>
                          {asig.solicitud?.folio || 'Sin folio'}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-[var(--app-ink)] line-clamp-2">
                        {asig.solicitud?.titulo_proyecto || 'Sin título'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      {asig.solicitud?.user && (
                        <UserChip user={asig.solicitud.user} href={`/evaluador/perfiles/${asig.solicitud.user.id}?folio=${asig.solicitud.id}`} size="xs" />
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-[var(--app-ink-2)]">
                        <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">
                          {asig.solicitud?.empresa?.nombre || 'Institución sin especificar'}
                        </span>
                      </div>
                      {asig.fecha_limite && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--auth-danger)' }}>
                          <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          Vence el {parseDate(asig.fecha_limite).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      )}
                      {asig.solicitud?.modalidad && (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--app-ink-2)]">
                          <FileSignature className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {asig.solicitud.modalidad}
                        </div>
                      )}
                    </div>

                    <div className="mt-auto pt-3 border-t border-[var(--app-rule)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      {esConcluido ? (
                        <>
                          <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--tile-emerald-fg)' }}>
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            Dictamen emitido
                          </div>
                          <Button
                            variant="soft"
                            size="sm"
                            onClick={() => handleDownloadDictamen(
                              asig.dictamen?.id ?? asig.id,
                              asig.solicitud?.folio ?? `SOL-${asig.id}`
                            )}
                          >
                            <Download className="h-3.5 w-3.5" />
                            Descargar dictamen
                          </Button>
                        </>
                      ) : (
                        <>
                          <span />
                          <Button
                            variant={esNuevo ? 'default' : 'soft'}
                            size="sm"
                            onClick={() => router.push(`/evaluador/asignaciones/${asig.id}/rubrica`)}
                          >
                            {esNuevo ? 'Iniciar evaluación' : 'Continuar'}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
