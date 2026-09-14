'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FileSignature, Search, Loader2, Download,
  Building2, Calendar, DollarSign, Layers,
} from 'lucide-react';
import api from '@/lib/api';
import { AlertBox } from '@/components/ui/alert-box';
import PaginationControls from '@/components/ui/pagination-controls';
import { INSTITUTION } from '@/lib/institution';
import { formatCurrency } from '@/lib/format';
import { DataCardGrid } from '@/components/ui/DataCardGrid';

export interface Convenio {
  id: number;
  numero_convenio: string;
  estado: 'borrador' | 'firmado' | 'vigente' | 'cerrado';
  monto_aprobado: number;
  num_tranches: number;
  fecha_generacion: string | null;
  fecha_firma: string | null;
  observaciones: string | null;
  pdf_url: string | null;
  solicitud_id: number;
  solicitud: {
    id: number;
    folio: string;
    titulo_proyecto: string;
    empresa?: { nombre: string };
  } | null;
  created_at: string;
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface Props {
  convenios: Convenio[];
  pagination: PaginationMeta;
}

const ESTADO_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  borrador:  { label: 'Borrador',  variant: 'secondary',    color: 'text-neutral-500 dark:text-neutral-400' },
  firmado:   { label: 'Firmado',   variant: 'default',      color: 'text-blue-600'    },
  vigente:   { label: 'Vigente',   variant: 'default',      color: 'text-emerald-600' },
  cerrado:   { label: 'Cerrado',   variant: 'outline',      color: 'text-neutral-400 dark:text-neutral-500' },
};

const FILTER_TABS = [
  { key: 'todos',   label: 'Todos'   },
  { key: 'borrador', label: 'Borrador' },
  { key: 'firmado',  label: 'Firmado'  },
  { key: 'vigente',  label: 'Vigente'  },
  { key: 'cerrado',  label: 'Cerrado'  },
];


export default function ConveniosClient({ convenios, pagination }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm]   = useState('');
  const [activeTab, setActiveTab]     = useState('todos');
  const [feedback, setFeedback]       = useState<{ type: 'error' | 'success' | 'info' | 'warning'; message: string } | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);

  const updateSearchParams = (next: { page?: number; per_page?: number }) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (next.page !== undefined) params.set('page', String(next.page));
    if (next.per_page !== undefined) params.set('per_page', String(next.per_page));
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleDownloadPdf = async (convenio: Convenio) => {
    if (!convenio.solicitud?.id) {
      setFeedback({ type: 'warning', message: 'Este convenio no tiene solicitud asociada.' });
      return;
    }
    setDownloading(convenio.id);
    try {
      const response = await api.get(`/documentos/convenio/${convenio.solicitud.id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `convenio_${convenio.numero_convenio}.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // Fallback: open the pdf_url directly in a new tab if available
      if (convenio.pdf_url) {
        const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace(/\/api$/, '');
        const fullUrl = convenio.pdf_url.startsWith('http') ? convenio.pdf_url : `${apiBase}${convenio.pdf_url}`;
        window.open(fullUrl, '_blank');
      } else {
        setFeedback({ type: 'error', message: 'No se pudo descargar el convenio.' });
      }
    } finally {
      setDownloading(null);
    }
  };

  const filtered = convenios.filter((c) => {
    const matchesTab    = activeTab === 'todos' || c.estado === activeTab;
    const searchLower   = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm
      || c.numero_convenio.toLowerCase().includes(searchLower)
      || (c.solicitud?.folio ?? '').toLowerCase().includes(searchLower)
      || (c.solicitud?.empresa?.nombre ?? '').toLowerCase().includes(searchLower)
      || (c.solicitud?.titulo_proyecto ?? '').toLowerCase().includes(searchLower);
    return matchesTab && matchesSearch;
  });

  const countByEstado = (estado: string) =>
    convenios.filter((c) => estado === 'todos' || c.estado === estado).length;

  const formatDate = (date: string | null) =>
    date ? new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {feedback && (
        <AlertBox type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">Convenios</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
            {`Gestión de convenios formales entre ${INSTITUTION.name} y empresas beneficiarias.`}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-700 rounded-xl px-4 py-2 shadow-sm">
          <FileSignature className="w-5 h-5 text-accent" />
          <span className="text-sm font-bold text-neutral-700 dark:text-neutral-200">{convenios.length} convenio{convenios.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Search + Filter tabs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 dark:text-neutral-500" />
          <Input
            placeholder="Buscar por número, folio o institución..."
            className="pl-10 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 h-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:border-primary/30 hover:text-primary'
              }`}
            >
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
              }`}>
                {countByEstado(tab.key)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content card */}
      <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm relative overflow-hidden ring-1 ring-black/5">
        <div className="bg-gradient-to-r from-accent/20 to-transparent h-1 w-full absolute top-0" />
        <CardHeader className="bg-white/50 border-b border-neutral-100 dark:border-neutral-700">
          <CardTitle className="text-lg text-primary flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-accent" />
            Listado de Convenios
          </CardTitle>
          <CardDescription>
            {filtered.length === convenios.length
              ? `${convenios.length} convenio${convenios.length !== 1 ? 's' : ''} registrado${convenios.length !== 1 ? 's' : ''}`
              : `${filtered.length} de ${convenios.length} convenios`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <DataCardGrid
            items={filtered}
            getKey={(c) => c.id}
            columns={2}
            accentColor={(c) => {
              if (c.estado === 'vigente') return 'emerald';
              if (c.estado === 'firmado') return 'sky';
              if (c.estado === 'cerrado') return 'neutral';
              return 'amber'; // borrador
            }}
            emptyState={
              <div className="p-16 text-center">
                <FileSignature className="h-14 w-14 mx-auto mb-3 text-neutral-200" />
                <p className="text-neutral-400 dark:text-neutral-500 font-medium">
                  {convenios.length === 0
                    ? 'No hay convenios registrados aún.'
                    : 'No hay convenios que coincidan con tu búsqueda.'}
                </p>
                {convenios.length === 0 && (
                  <p className="text-xs text-neutral-300 mt-1">
                    Los convenios se generan desde Solicitudes cuando una es aprobada.
                  </p>
                )}
              </div>
            }
            renderCard={(convenio) => {
              const cfg = ESTADO_CONFIG[convenio.estado] ?? ESTADO_CONFIG.borrador;
              return (
                <div className="pl-3">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <FileSignature className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-bold text-primary font-mono text-xs">{convenio.numero_convenio}</span>
                        <Badge variant={cfg.variant} className="text-[10px] h-4">{cfg.label}</Badge>
                      </div>
                      <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 line-clamp-1">
                        {convenio.solicitud?.titulo_proyecto ?? 'Sin título'}
                      </p>
                      {convenio.solicitud?.folio && (
                        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">{convenio.solicitud.folio}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <span className="flex items-center gap-1 text-neutral-500 dark:text-neutral-300 truncate">
                      <Building2 className="w-3 h-3 shrink-0" />
                      {convenio.solicitud?.empresa?.nombre ?? 'Sin empresa'}
                    </span>
                    <span className="flex items-center gap-1 text-neutral-500 dark:text-neutral-300 font-semibold tabular-nums">
                      <DollarSign className="w-3 h-3 shrink-0" />
                      {formatCurrency(convenio.monto_aprobado ?? 0)}
                    </span>
                    <span className="flex items-center gap-1 text-neutral-500 dark:text-neutral-300">
                      <Layers className="w-3 h-3 shrink-0" />
                      {convenio.num_tranches} tranche{convenio.num_tranches !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1 text-neutral-500 dark:text-neutral-300">
                      <Calendar className="w-3 h-3 shrink-0" />
                      {formatDate(convenio.fecha_generacion ?? convenio.created_at)}
                    </span>
                  </div>
                  <div className="flex justify-end pt-2 border-t border-neutral-50 dark:border-neutral-800">
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5"
                      onClick={() => handleDownloadPdf(convenio)} disabled={downloading === convenio.id}>
                      {downloading === convenio.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Download className="h-3.5 w-3.5" />
                      }
                      Descargar PDF
                    </Button>
                  </div>
                </div>
              );
            }}
          />
          <PaginationControls
            currentPage={pagination.current_page}
            lastPage={pagination.last_page}
            total={pagination.total}
            perPage={pagination.per_page}
            onPageChange={(p) => updateSearchParams({ page: p })}
            onPerPageChange={(pp) => updateSearchParams({ page: 1, per_page: pp })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
