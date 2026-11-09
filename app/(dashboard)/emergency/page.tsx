'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { EmergencyAlert, PageResult } from '@/types/api';

export default function EmergencyPage() {
  const [cursor, setCursor] = useState<string | undefined>();
  const [cursors, setCursors] = useState<string[]>([]);

  const { data, isLoading } = useQuery<PageResult<EmergencyAlert>>({
    queryKey: ['admin-emergency', cursor],
    queryFn: () =>
      api.get('/admin/emergency/alerts', { params: { cursor, limit: 20 } }).then((r) => r.data),
    refetchInterval: 30_000,
  });

  function goNext() {
    if (!data?.nextCursor) return;
    setCursors((c) => [...c, cursor ?? '']);
    setCursor(data.nextCursor ?? undefined);
  }

  function goPrev() {
    const prev = cursors[cursors.length - 1];
    setCursors((c) => c.slice(0, -1));
    setCursor(prev || undefined);
  }

  const activeCount = data?.items.filter((a) => a.status === 'active').length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {activeCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          {activeCount} active Live Alert{activeCount !== 1 ? 's' : ''} right now
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner className="h-7 w-7" /></div>
      ) : (
        <>
          <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Triggered</TableHead>
                  <TableHead>Resolved</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {alert.userDisplayName ?? alert.userId}
                    </TableCell>
                    <TableCell>
                      <Badge variant={alert.status === 'active' ? 'destructive' : 'secondary'} className="capitalize">
                        {alert.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {alert.latitude != null && alert.longitude != null ? (
                        <a
                          href={`https://maps.google.com/?q=${alert.latitude},${alert.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                          <MapPin className="h-3 w-3" />
                          {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">No location</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 tabular-nums">{formatDate(alert.triggeredAt)}</TableCell>
                    <TableCell className="text-xs text-slate-500 tabular-nums">
                      {alert.resolvedAt ? formatDate(alert.resolvedAt) : '-'}
                    </TableCell>
                    <TableCell>
                      <Link href={`/emergency/${alert.id}`} className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                        Details
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {data?.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-slate-500">No Live Alerts</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>{data?.total ?? 0} total alerts</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={goPrev} disabled={cursors.length === 0}>Previous</Button>
              <Button variant="outline" size="sm" onClick={goNext} disabled={!data?.nextCursor}>Next</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
