'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, CheckCircle, XCircle, Loader2, Search, FileText, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { badgeColorMap } from '@/lib/color-mapper';
import { AlertBox } from '@/components/ui/alert-box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { Solicitud } from '@/types/api';
import SavedFiltersBar from '@/components/filters/SavedFiltersBar';

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
      title: 'Turnar a Evaluación Técnica',
      description: '¿Seguro que deseas turnar esta solicitud a evaluación técnica?',
      onConfirm: async () => {
        try {
          await api.post(`/revisor/solicitudes/${id}/aprobar`);
          setFeedback({ type: 'success', message: 'Aprobada y turnada a Evaluación Técnica exitosamente.' });
          window.location.reload();
        } catch (err: any) {
          setFeedback({ type: 'error', message: err.response?.data?.error || 'Error al procesar la aprobación' });
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">Bandeja de Entrada</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Solicitudes pendientes de revisión y validación documental.
          </p>
        </div>
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="search"
              placeholder="Buscar por folio o título..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2.5 text-sm bg-neutral-100 border-0 rounded-xl ring-1 ring-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary/30 w-72 placeholder:text-neutral-400"
            />
          </div>
          <SavedFiltersBar
            scope="revisor.bandeja"
            currentFilters={{ search: searchTerm }}
            onApply={(f) => setSearchTerm(String(f.search ?? ''))}
          />
        </div>
      </div>

      {/* Main list */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-neutral-900 text-sm">Solicitudes Asignadas</h2>
              <p className="text-xs text-neutral-400">
                {loading ? 'Cargando…' : `${filteredSolicitudes.length} solicitud(es) en bandeja`}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary/20" />
          </div>
        ) : filteredSolicitudes.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-100">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-sm font-semibold text-neutral-600">
              {searchTerm ? 'Sin resultados para tu búsqueda' : '¡Bandeja vacía!'}
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              {searchTerm ? 'Intenta con otros términos.' : 'No hay solicitudes pendientes de revisión.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-50">
            {filteredSolicitudes.map((s, i) => {
              const variant = badgeColorMap[s.estado as keyof typeof badgeColorMap] || 'secondary';
              const displayEstado = s.estado === 'en_revision' ? 'En Revisión'
                : s.estado === 'enviada' ? 'Enviada'
                : s.estado.charAt(0).toUpperCase() + s.estado.slice(1).replace(/_/g, ' ');

              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="px-6 py-4 flex items-center gap-4 hover:bg-neutral-50/60 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md font-mono">
                        {s.folio}
                      </span>
                      <Badge variant={variant} className="text-[10px] font-bold uppercase tracking-tight">
                        {displayEstado}
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold text-neutral-800 truncate group-hover:text-primary transition-colors">
                      {s.titulo_proyecto}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5 truncate">
                      {s.user?.name || s.empresa?.nombre || 'Solicitante'}
                      {s.updated_at && (
                        <span className="ml-2">
                          · {new Date(s.updated_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link href={`/revisor/solicitudes/${s.id}`}>
                      <motion.button
                        whileHover={{ x: 1 }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary bg-primary/[8%] hover:bg-primary hover:text-white rounded-lg transition-all"
                        title="Ver detalles"
                      >
                        <Eye className="w-3 h-3" />
                        Ver
                      </motion.button>
                    </Link>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleApprove(s.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-lg transition-all"
                      title="Turnar a Evaluación Técnica"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Aprobar
                    </motion.button>
                    <Link href={`/revisor/solicitudes/${s.id}`}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-600 hover:text-white rounded-lg transition-all"
                        title="Generar Observación"
                      >
                        <XCircle className="w-3 h-3" />
                        Observar
                      </motion.button>
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
