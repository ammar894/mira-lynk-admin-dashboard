'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, StopCircle, UserMinus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { api, apiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { VideoSession } from '@/types/api';

/** Rounds to whole minutes; falls back to seconds under a minute. */
function formatDuration(startIso: string, endIso: string): string {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (ms < 0) return '—';
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return `${Math.round(ms / 1000)}s`;
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

const STATUS_COLORS: Record<string, 'warning' | 'success' | 'secondary' | 'destructive'> = {
  active: 'success',
  scheduled: 'warning',
  ended: 'secondary',
  cancelled: 'destructive',
};

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [kickTarget, setKickTarget] = useState<{ userId: string; displayName: string } | null>(null);

  const { data: session, isLoading } = useQuery<VideoSession>({
    queryKey: ['admin-session', id],
    queryFn: () => api.get(`/admin/sessions/${id}`).then((r) => r.data),
  });

  const forceEndMutation = useMutation({
    mutationFn: () => api.post(`/admin/sessions/${id}/end`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-session', id] });
      qc.invalidateQueries({ queryKey: ['admin-sessions'] });
      toast({ title: 'Session ended' });
      setConfirmEndOpen(false);
    },
    onError: (err) => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  });

  const kickMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/admin/sessions/${id}/participants/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-session', id] });
      toast({ title: 'Participant kicked' });
      setKickTarget(null);
    },
    onError: (err) => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;
  if (!session) return <p className="text-slate-500">Session not found.</p>;

  const canEnd = session.status === 'active' || session.status === 'scheduled';

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/sessions" className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{session.title}</h2>
        <Badge variant={STATUS_COLORS[session.status] ?? 'secondary'} className="capitalize">{session.status}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Row label="Host" value={session.hostName ?? session.hostDisplayName ?? session.hostId} />
            {session.sessionType && <Row label="Type" value={<span className="capitalize">{session.sessionType}</span>} />}
            {session.maxParticipants != null && <Row label="Max participants" value={String(session.maxParticipants)} />}
            {session.scheduledAt && <Row label="Scheduled" value={formatDate(session.scheduledAt)} />}
            {session.startedAt && <Row label="Started" value={formatDate(session.startedAt)} />}
            {session.endedAt && <Row label="Ended" value={formatDate(session.endedAt)} />}
            {session.startedAt && session.endedAt && (
              <Row label="Duration" value={formatDuration(session.startedAt, session.endedAt)} />
            )}
            <Row label="Created" value={formatDate(session.createdAt)} />
          </CardContent>
        </Card>

        {session.participants && session.participants.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Participants ({session.participants.length})</CardTitle></CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {session.participants.map((p) => (
                  <li key={p.userId} className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{p.displayName}</p>
                      <p className="text-xs text-slate-500 capitalize">{p.role}</p>
                    </div>
                    {p.role !== 'host' && p.leftAt == null && canEnd && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => setKickTarget({ userId: p.userId, displayName: p.displayName })}
                        disabled={kickMutation.isPending}
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                        Kick
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {canEnd && (
        <div>
          <Button variant="destructive" onClick={() => setConfirmEndOpen(true)}>
            <StopCircle className="h-4 w-4" />
            Force End Session
          </Button>
        </div>
      )}

      <Dialog open={confirmEndOpen} onOpenChange={setConfirmEndOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Force end this session?</DialogTitle>
            <DialogDescription>
              Every participant still connected will be disconnected immediately. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmEndOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => forceEndMutation.mutate()}
              disabled={forceEndMutation.isPending}
            >
              {forceEndMutation.isPending ? 'Ending...' : 'Force End Session'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!kickTarget} onOpenChange={(o) => { if (!o) setKickTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {kickTarget?.displayName} from this session?</DialogTitle>
            <DialogDescription>They will be disconnected immediately.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setKickTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => kickTarget && kickMutation.mutate(kickTarget.userId)}
              disabled={kickMutation.isPending}
            >
              {kickMutation.isPending ? 'Removing...' : 'Remove'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500 dark:text-slate-400 shrink-0">{label}</span>
      <span className="text-right text-slate-800 dark:text-slate-200">{value}</span>
    </div>
  );
}
