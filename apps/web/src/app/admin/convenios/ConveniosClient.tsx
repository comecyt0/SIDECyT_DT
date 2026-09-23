'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/ui/page-header';
import {
  FileSignature, Search, Loader2, Download,
  Building2, Calendar, DollarSign, Layers,
} from 'lucide-react';
import api from '@/lib/api';
import { AlertBox } from '@/components/ui/alert-box';
import PaginationControls from '@/components/ui/pagination-controls';
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

const ESTADO_CONFIG: Record<string, { label: string; tone: string }> = {
  borrador:  { label: 'Borrador',  tone: 'neutral' },
  firmado:   { label: 'Firmado',   tone: 'sky'     },
  vigente:   { label: 'Vigente',   tone: 'emerald' },
  cerrado:   { label: 'Cerrado',   tone: 'neutral' },
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

      <PageHeader
        title="Convenios"
        description="Cada convenio fija cuánto se aprobó y en cuántas entregas se paga. Aquí puedes buscarlos y descargar el documento."
        icon={<FileSignature className="h-5 w-5" />}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--app-ink-2)] pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            aria-label="Buscar convenios"
            placeholder="Buscar por número, folio o empresa"
            className="auth-input auth-input-static pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap items-center">
          {FILTER_TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                aria-pressed={active}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-colors duration-150 flex items-center gap-1.5 border ${
                  active
                    ? 'bg-[var(--auth-vino)] text-white border-transparent'
                    : 'bg-[var(--app-card-bg)] text-[var(--app-ink-2)] border-[var(--app-rule)] hover:text-[var(--app-ink)]'
                }`}
              >
                {tab.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${active ? 'bg-white/20 text-white' : 'bg-[var(--auth-field)] text-[var(--app-ink-2)]'}`}>
                  {countByEstado(tab.key)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <FileSignature className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Convenios registrados
          </CardTitle>
          <CardDescription>
            {filtered.length === convenios.length
              ? `${convenios.length} convenio${convenios.length !== 1 ? 's' : ''} en total`
              : `${filtered.length} de ${convenios.length} convenios`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataCardGrid
            items={filtered}
            getKey={(c) => c.id}
            columns={2}
            accentColor={(c) => {
              if (c.estado === 'vigente') return 'emerald';
              if (c.estado === 'firmado') return 'sky';
              if (c.estado === 'cerrado') return 'neutral';
              return 'amber';
            }}
            emptyState={
              <div className="empty-state">
                <span className="tone-chip" data-tone={convenios.length === 0 ? 'violet' : 'sky'}><FileSignature aria-hidden="true" /></span>
                <p className="font-bold text-[var(--app-ink)]">
                  {convenios.length === 0 ? 'Sin convenios todavía' : 'Ningún convenio coincide con tu búsqueda'}
                </p>
                <p className="text-sm text-[var(--app-ink-2)]">
                  {convenios.length === 0
                    ? 'Los convenios se generan desde Solicitudes cuando una solicitud es aprobada.'
                    : 'Prueba con otro número, folio o empresa.'}
                </p>
              </div>
            }
            renderCard={(convenio) => {
              const cfg = ESTADO_CONFIG[convenio.estado] ?? ESTADO_CONFIG.borrador;
              return (
                <div className="pl-3">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="tone-chip shrink-0 h-11 w-11" data-tone={cfg.tone}>
                      <FileSignature className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-bold font-mono text-xs" style={{ color: 'var(--auth-vino)' }}>{convenio.numero_convenio}</span>
                        <span className="pill" data-tone={cfg.tone}>{cfg.label}</span>
                      </div>
                      <p className="text-sm font-semibold text-[var(--app-ink)] line-clamp-1">
                        {convenio.solicitud?.titulo_proyecto ?? 'Sin título'}
                      </p>
                      {convenio.solicitud?.folio && (
                        <p className="text-[11px] text-[var(--app-ink-2)] font-mono">{convenio.solicitud.folio}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3 text-[var(--app-ink-2)]">
                    <span className="flex items-center gap-1 truncate">
                      <Building2 className="w-3 h-3 shrink-0" />
                      {convenio.solicitud?.empresa?.nombre ?? 'Sin empresa'}
                    </span>
                    <span className="flex items-center gap-1 font-semibold tabular-nums text-[var(--app-ink)]">
                      <DollarSign className="w-3 h-3 shrink-0" />
                      {formatCurrency(convenio.monto_aprobado ?? 0)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 shrink-0" />
                      {convenio.num_tranches === 1 ? 'Una sola entrega' : `${convenio.num_tranches} entregas`}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 shrink-0" />
                      {formatDate(convenio.fecha_generacion ?? convenio.created_at)}
                    </span>
                  </div>
                  <div className="flex justify-end pt-3 border-t" style={{ borderColor: 'var(--app-rule)' }}>
                    <Button size="sm" variant="soft"
                      onClick={() => handleDownloadPdf(convenio)} disabled={downloading === convenio.id}>
                      {downloading === convenio.id
                        ? <Loader2 className="animate-spin" />
                        : <Download />
                      }
                      Descargar convenio
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
