import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined) {
  const d = new Date(date ?? NaN);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US').format(n);
}

/**
 * Renders integer minor units as currency. The API is minor-units end to end, so
 * every amount goes through here rather than being divided at the call site.
 */
export function formatMoney(cents: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Compact form for tiles, where "$12.4K" reads better than the full number. */
export function formatMoneyCompact(cents: number, currency = 'USD') {
  const abs = Math.abs(cents);
  if (abs < 100_000) return formatMoney(cents, currency);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(cents / 100);
}

/** Short axis label for a YYYY-MM-DD bucket, e.g. "Sep 8". */
export function formatDayLabel(isoDate: string) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}
