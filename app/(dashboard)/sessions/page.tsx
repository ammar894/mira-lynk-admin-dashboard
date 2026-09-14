'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { VideoSession, PageResult } from '@/types/api';

const STATUS_COLORS: Record<string, 'warning' | 'success' | 'secondary' | 'destructive'> = {
  active: 'success',
  scheduled: 'warning',
  ended: 'secondary',
  cancelled: 'destructive',
};

export default function SessionsPage() {
  const [cursor, setCursor] = useState<string | undefined>();
  const [cursors, setCursors] = useState<string[]>([]);

  const { data, isLoading } = useQuery<PageResult<VideoSession>>({
    queryKey: ['admin-sessions', cursor],
    queryFn: () =>
      api.get('/admin/sessions', { params: { cursor, limit: 20 } }).then((r) => r.data),
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

  return (
    <div className="flex flex-col gap-4">
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner className="h-7 w-7" /></div>
      ) : (
        <>
          <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Topic</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Host</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-slate-900 dark:text-slate-100">{s.title ?? s.topic}</TableCell>
                    <TableCell className="text-xs text-slate-500 capitalize">{s.sessionType ?? '—'}</TableCell>
                    <TableCell className="text-sm text-slate-600 dark:text-slate-400">{s.hostName ?? s.hostDisplayName ?? s.hostId}</TableCell>
                    <TableCell className="tabular-nums text-sm">{s.maxParticipants ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[s.status] ?? 'secondary'} className="capitalize">{s.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 tabular-nums">
                      {s.scheduledAt ? formatDate(s.scheduledAt) : '-'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 tabular-nums">
                      {s.startedAt ? formatDate(s.startedAt) : '-'}
                    </TableCell>
                    <TableCell>
                      <Link href={`/sessions/${s.id}`} className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {data?.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-slate-500">No sessions found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>{data?.total ?? 0} total sessions</span>
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
