'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationControlsProps {
  currentPage: number;
  lastPage: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
}

const PER_PAGE_OPTIONS = [10, 15, 25, 50];
const ACCENT = 'var(--brand-vino)';

function getPageNumbers(currentPage: number, lastPage: number): (number | '...')[] {
  if (lastPage <= 5) {
    return Array.from({ length: lastPage }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [];

  if (currentPage <= 3) {
    pages.push(1, 2, 3, 4, 5);
    if (lastPage > 5) pages.push('...', lastPage);
  } else if (currentPage >= lastPage - 2) {
    pages.push(1, '...');
    for (let i = lastPage - 4; i <= lastPage; i++) pages.push(i);
  } else {
    pages.push(1, '...');
    pages.push(currentPage - 1, currentPage, currentPage + 1);
    pages.push('...', lastPage);
  }

  return pages;
}

export default function PaginationControls({
  currentPage,
  lastPage,
  total,
  perPage,
  onPageChange,
  onPerPageChange,
}: PaginationControlsProps) {
  const from = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const to = Math.min(currentPage * perPage, total);
  const pages = getPageNumbers(currentPage, lastPage);

  const btnBase =
    'inline-flex items-center justify-center h-8 w-8 rounded-md text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
  const btnGhost =
    `${btnBase} bg-white border border-neutral-200 text-neutral-600 hover:border-primary/40 hover:text-primary`;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-3 border-t border-neutral-100">
      {/* Info + per-page selector */}
      <div className="flex items-center gap-3 text-sm text-neutral-500">
        <span>
          Mostrando{' '}
          <span className="font-semibold text-neutral-700">{from}–{to}</span>{' '}
          de{' '}
          <span className="font-semibold text-neutral-700">{total}</span>{' '}
          registros
        </span>
        {onPerPageChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400 text-xs">por página:</span>
            <select
              value={perPage}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
              className="h-7 rounded-md border border-neutral-200 bg-white px-2 text-xs font-medium text-neutral-700 focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
            >
              {PER_PAGE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page controls */}
      {lastPage > 1 && (
        <div className="flex items-center gap-1">
          {/* First page */}
          <button
            className={btnGhost}
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            title="Primera página"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>

          {/* Prev page */}
          <button
            className={btnGhost}
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            title="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Page numbers */}
          {pages.map((p, idx) =>
            p === '...' ? (
              <span
                key={`ellipsis-${idx}`}
                className="inline-flex items-center justify-center h-8 w-8 text-neutral-400 text-sm select-none"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                className={`${btnBase} border text-sm ${
                  p === currentPage
                    ? 'border-transparent text-white font-bold shadow-sm'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:border-primary/40 hover:text-primary'
                }`}
                style={
                  p === currentPage
                    ? { backgroundColor: ACCENT, borderColor: ACCENT }
                    : undefined
                }
                disabled={p === currentPage}
              >
                {p}
              </button>
            )
          )}

          {/* Next page */}
          <button
            className={btnGhost}
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === lastPage}
            title="Página siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Last page */}
          <button
            className={btnGhost}
            onClick={() => onPageChange(lastPage)}
            disabled={currentPage === lastPage}
            title="Última página"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
