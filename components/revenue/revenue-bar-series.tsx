'use client';

import { formatDayLabel, formatMoney } from '@/lib/utils';
import type { RevenuePoint } from '@/types/api';

/**
 * Daily revenue as CSS bars.
 *
 * Deliberately not a charting library: the panel has no other charts, and one
 * dependency for one view would be the only thing in the bundle that renders its own
 * SVG. Bars are height-scaled against the window's peak, so a flat series reads as
 * flat rather than as noise amplified to fill the box.
 */
export function RevenueBarSeries({
  points,
  currency,
}: {
  points: RevenuePoint[];
  currency: string;
}) {
  const peak = Math.max(...points.map((p) => Math.abs(p.netCents)), 0);

  if (peak === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        No revenue recorded in this window.
      </p>
    );
  }

  // Long windows would otherwise render 90 unreadable date labels.
  const labelEvery = Math.ceil(points.length / 8);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-40 items-end gap-px overflow-x-auto">
        {points.map((p) => {
          const pct = peak ? (Math.abs(p.netCents) / peak) * 100 : 0;
          const isRefund = p.netCents < 0;
          return (
            <div
              key={p.date}
              className="group relative flex min-w-[6px] flex-1 flex-col justify-end"
              // Native tooltip: no popover dependency, and it works on keyboard focus.
              title={`${formatDayLabel(p.date)} — ${formatMoney(p.netCents, currency)} net, ${p.transactions} txn`}
            >
              <div
                className={
                  isRefund
                    ? 'rounded-t-sm bg-red-500/70 transition-colors group-hover:bg-red-500'
                    : 'rounded-t-sm bg-indigo-500/70 transition-colors group-hover:bg-indigo-500'
                }
                // Floor at 2% so a small non-zero day is still visible.
                style={{ height: `${Math.max(pct, 2)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] tabular-nums text-slate-400">
        {points
          .filter((_, i) => i % labelEvery === 0)
          .map((p) => (
            <span key={p.date}>{formatDayLabel(p.date)}</span>
          ))}
      </div>
    </div>
  );
}
