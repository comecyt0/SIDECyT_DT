/**
 * Helpers de formato.
 *
 * Usa `INSTITUTION.locale` / `INSTITUTION.currency` (que leen de env vars
 * `NEXT_PUBLIC_INSTITUTION_LOCALE` / `NEXT_PUBLIC_INSTITUTION_CURRENCY`).
 * También respeta los aliases legacy `NEXT_PUBLIC_LOCALE` / `NEXT_PUBLIC_CURRENCY`.
 */
import { INSTITUTION } from './institution';

const LOCALE = process.env.NEXT_PUBLIC_LOCALE || INSTITUTION.locale;
const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || INSTITUTION.currency;

/** Devuelve un número como moneda con símbolo + agrupador. Ej: $60,000.00 */
export function formatCurrency(value: number | string | null | undefined, options?: Intl.NumberFormatOptions): string {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    maximumFractionDigits: 2,
    ...options,
  }).format(n);
}

/** Sólo símbolo de moneda (útil para prefixar inputs). Resuelve dinámicamente del locale/currency. */
export function currencySymbol(): string {
  try {
    const parts = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY }).formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value ?? '$';
  } catch {
    return '$';
  }
}

/** Formato de fecha corto. `date` puede ser ISO string, Date, o null. */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Formato de fecha + hora corto. */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(LOCALE, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
