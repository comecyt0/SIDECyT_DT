'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  FileSignature, Loader2, ArrowRight, Download, Search,
  Calendar, Award, CheckCircle2, ClipboardList,
} from 'lucide-react';
import api from '@/lib/api';
import type { AsignacionEvaluador } from '@/types/api';
import { AlertBox } from '@/components/ui/alert-box';
import SavedFiltersBar from '@/components/filters/SavedFiltersBar';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};

const estadoConfig: Record<string, { label: string; bg: string; text: string }> = {
  asignado:  { label: 'Por Iniciar', bg: 'bg-primary/10', text: 'text-primary' },
  notificado: { label: 'Por Iniciar', bg: 'bg-primary/10', text: 'text-primary' },
  evaluando: { label: 'En Progreso', bg: 'bg-amber-50',     text: 'text-amber-700' },
  concluido: { label: 'Concluida',   bg: 'bg-emerald-50',   text: 'text-emerald-700' },
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
      setDownloadError('Error al descargar el dictamen. Intenta nuevamente.');
    }
  };

  return (
    <div className="space-y-8">
      {downloadError && (
        <AlertBox type="error" message={downloadError} onClose={() => setDownloadError(null)} />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">Evaluaciones Técnicas</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Proyectos asignados para revisión académica especializada.
          </p>
        </div>

        {/* Search + filter */}
        {!loading && asignaciones.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="search"
                placeholder="Buscar proyecto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2.5 text-sm bg-neutral-100 border-0 rounded-xl ring-1 ring-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary/30 w-56 placeholder:text-neutral-400"
              />
            </div>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="px-3 py-2.5 text-sm bg-neutral-100 border-0 rounded-xl ring-1 ring-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary/30 text-neutral-700 font-medium"
            >
              <option value="">Todos</option>
              <option value="asignado">Por Iniciar</option>
              <option value="evaluando">En Progreso</option>
              <option value="concluido">Concluidas</option>
            </select>
          </div>
        )}
      </div>

      {!loading && asignaciones.length > 0 && (
        <SavedFiltersBar
          scope="evaluador.asignaciones"
          currentFilters={{ search: searchTerm, estado: filterEstado }}
          onApply={(f) => {
            setSearchTerm(String(f.search ?? ''));
            setFilterEstado(String(f.estado ?? ''));
          }}
        />
      )}

      {/* Content */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary/20" />
        </div>
      ) : asignaciones.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm py-16 text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm font-semibold text-neutral-700">No hay proyectos asignados</p>
          <p className="text-xs text-neutral-400 mt-1">
            Cuando el comité técnico te asigne una evaluación, aparecerá aquí.
          </p>
        </div>
      ) : filteredAsignaciones.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm py-16 text-center">
          <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-neutral-100">
            <Search className="w-5 h-5 text-neutral-300" />
          </div>
          <p className="text-sm font-semibold text-neutral-600">Sin resultados</p>
          <p className="text-xs text-neutral-400 mt-1">Intenta con otros términos de búsqueda o estado.</p>
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          {filteredAsignaciones.map((asig) => {
            const cfg = estadoConfig[asig.estado] ?? { label: asig.estado, bg: 'bg-neutral-100', text: 'text-neutral-600' };
            const esConcluido = asig.estado === 'concluido';
            const esNuevo = asig.estado === 'asignado' || asig.estado === 'notificado';

            return (
              <motion.div
                key={asig.id}
                variants={item}
                className="bg-white rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/20 overflow-hidden group"
              >
                {/* Card header */}
                <div className="px-6 pt-5 pb-4 border-b border-neutral-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${cfg.bg} ${cfg.text} uppercase tracking-tight`}>
                          {cfg.label}
                        </span>
                        <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-md font-mono">
                          {asig.solicitud?.folio || 'S/F'}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-neutral-900 line-clamp-2 group-hover:text-primary transition-colors">
                        {asig.solicitud?.titulo_proyecto || 'Sin título'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card body */}
                <div className="px-6 py-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                    <Award className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="truncate">
                      {asig.solicitud?.empresa?.nombre || 'Institución no especificada'}
                    </span>
                  </div>
                  {asig.fecha_limite && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-red-500">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      Límite: {new Date(asig.fecha_limite).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                  {asig.solicitud?.modalidad && (
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                      <FileSignature className="w-3.5 h-3.5 shrink-0" />
                      {asig.solicitud.modalidad}
                    </div>
                  )}
                </div>

                {/* Card footer */}
                <div className="px-6 pb-5 flex items-center justify-between">
                  {esConcluido ? (
                    <>
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        Dictamen emitido
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleDownloadDictamen(
                          asig.dictamen?.id ?? asig.id,
                          asig.solicitud?.folio ?? `SOL-${asig.id}`
                        )}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary bg-primary/[8%] hover:bg-primary hover:text-white rounded-lg transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Descargar Dictamen
                      </motion.button>
                    </>
                  ) : (
                    <>
                      <span />
                      <motion.button
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => router.push(`/evaluador/asignaciones/${asig.id}/rubrica`)}
                        className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          esNuevo
                            ? 'bg-primary text-white hover:bg-[var(--brand-vino-700)] shadow-sm'
                            : 'text-primary bg-primary/[8%] hover:bg-primary hover:text-white'
                        }`}
                      >
                        {esNuevo ? 'Iniciar Evaluación' : 'Continuar'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </motion.button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
