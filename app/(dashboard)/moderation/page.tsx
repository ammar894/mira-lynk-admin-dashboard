'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, apiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { Report, PageResult, AdminPostDetail, BlocklistKeyword } from '@/types/api';
import { X } from 'lucide-react';

const actionSchema = z.object({
  action: z.enum(['actioned', 'dismissed']),
  notes: z.string().max(500).optional(),
});
type ActionForm = z.infer<typeof actionSchema>;

const keywordSchema = z.object({ keyword: z.string().min(1, 'Keyword is required').max(100) });
type KeywordForm = z.infer<typeof keywordSchema>;

const STATUS_COLORS: Record<string, 'warning' | 'success' | 'secondary'> = {
  pending: 'warning',
  reviewed: 'warning',
  actioned: 'success',
  dismissed: 'secondary',
};

// Which id is set tells you what was reported; the API has no targetType field.
function targetOf(report: Report) {
  if (report.postId) return { type: 'post', id: report.postId };
  if (report.commentId) return { type: 'comment', id: report.commentId };
  if (report.messageId) return { type: 'message', id: report.messageId };
  return null;
}

export default function ModerationPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [cursor, setCursor] = useState<string | undefined>();
  const [cursors, setCursors] = useState<string[]>([]);
  const [selected, setSelected] = useState<Report | null>(null);
  const [viewingPostId, setViewingPostId] = useState<string | null>(null);
  const [confirmingPostDelete, setConfirmingPostDelete] = useState(false);
  const [view, setView] = useState<'reports' | 'blocklist'>('reports');

  const { data, isLoading } = useQuery<PageResult<Report>>({
    queryKey: ['admin-reports', statusFilter, cursor],
    queryFn: () =>
      api.get('/admin/moderation/reports', {
        params: { status: statusFilter || undefined, cursor, limit: 20 },
      }).then((r) => r.data),
  });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<ActionForm>({
    resolver: zodResolver(actionSchema),
    defaultValues: { action: 'dismissed' },
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ActionForm }) =>
      api.post(`/admin/moderation/reports/${id}/action`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-reports'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      toast({ title: 'Report actioned' });
      setSelected(null);
      reset();
    },
    onError: (err) => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  });

  const postQuery = useQuery<AdminPostDetail>({
    queryKey: ['admin-post', viewingPostId],
    queryFn: () => api.get(`/admin/posts/${viewingPostId}`).then((r) => r.data),
    enabled: !!viewingPostId,
  });

  const deletePostMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/posts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-post', viewingPostId] });
      toast({ title: 'Post deleted' });
      setConfirmingPostDelete(false);
    },
    onError: (err) => {
      toast({ title: 'Error', description: apiError(err), variant: 'destructive' });
      setConfirmingPostDelete(false);
    },
  });

  function closePostDialog() {
    setViewingPostId(null);
    setConfirmingPostDelete(false);
  }

  const blocklistQuery = useQuery<{ items: BlocklistKeyword[]; nextCursor?: string | null }>({
    queryKey: ['admin-blocklist'],
    queryFn: () => api.get('/admin/moderation/blocklist', { params: { limit: 100 } }).then((r) => r.data),
    enabled: view === 'blocklist',
  });

  const {
    register: registerKeyword,
    handleSubmit: handleKeywordSubmit,
    reset: resetKeyword,
    formState: { errors: keywordErrors, isSubmitting: isKeywordSubmitting },
  } = useForm<KeywordForm>({ resolver: zodResolver(keywordSchema) });

  const addKeywordMutation = useMutation({
    mutationFn: (data: KeywordForm) => api.post('/admin/moderation/blocklist', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-blocklist'] });
      toast({ title: 'Keyword added' });
      resetKeyword();
    },
    onError: (err) => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  });

  const removeKeywordMutation = useMutation({
    mutationFn: (keywordId: string) => api.delete(`/admin/moderation/blocklist/${keywordId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-blocklist'] });
      toast({ title: 'Keyword removed' });
    },
    onError: (err) => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
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

  const currentAction = watch('action');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Button
          variant={view === 'reports' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('reports')}
        >
          Reports
        </Button>
        <Button
          variant={view === 'blocklist' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('blocklist')}
        >
          Keyword Blocklist
        </Button>
      </div>

      {view === 'blocklist' && (
        <div className="flex flex-col gap-4">
          <form
            onSubmit={handleKeywordSubmit((d) => addKeywordMutation.mutate(d))}
            className="flex items-start gap-2"
          >
            <div className="flex flex-col gap-1">
              <Input placeholder="Keyword to block" className="w-64" {...registerKeyword('keyword')} />
              {keywordErrors.keyword && <p className="text-xs text-red-600">{keywordErrors.keyword.message}</p>}
            </div>
            <Button type="submit" disabled={isKeywordSubmitting || addKeywordMutation.isPending}>
              {addKeywordMutation.isPending ? 'Adding...' : 'Add'}
            </Button>
          </form>

          {blocklistQuery.isLoading ? (
            <div className="flex justify-center py-12"><Spinner className="h-7 w-7" /></div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blocklistQuery.data?.items.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="text-sm font-medium">{k.keyword}</TableCell>
                      <TableCell className="text-xs text-slate-500 tabular-nums">{formatDate(k.createdAt)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeKeywordMutation.mutate(k.id)}
                          disabled={removeKeywordMutation.isPending}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {blocklistQuery.data?.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-slate-500">
                        No blocked keywords
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {view === 'reports' && (
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCursor(undefined); setCursors([]); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="actioned">Actioned</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-slate-500">{data?.total ?? 0} reports</span>
      </div>
      )}

      {view === 'reports' && (isLoading ? (
        <div className="flex justify-center py-12"><Spinner className="h-7 w-7" /></div>
      ) : (
        <>
          <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="text-sm">
                      {report.reporterId ? (
                        <Link
                          href={`/users/${report.reporterId}`}
                          className="font-mono text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                          {report.reporterId.slice(0, 8)}
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const target = targetOf(report);
                        if (!target) return <span className="text-xs text-slate-400">—</span>;
                        if (target.type === 'post') {
                          return (
                            <button
                              type="button"
                              onClick={() => setViewingPostId(target.id)}
                              className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                            >
                              <span className="capitalize">post</span>{' '}
                              <span className="font-mono">{target.id.slice(0, 8)}</span>
                            </button>
                          );
                        }
                        // Comment/message reports have no admin viewer yet -- shown
                        // as plain text rather than a dead link.
                        return (
                          <span className="text-xs text-slate-500">
                            <span className="capitalize">{target.type}</span>{' '}
                            <span className="font-mono">{target.id.slice(0, 8)}</span>
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-500 capitalize">{report.category}</span>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">{report.reason}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[report.status] ?? 'secondary'} className="capitalize">
                        {report.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 tabular-nums">{formatDate(report.createdAt)}</TableCell>
                    <TableCell>
                      {report.status === 'pending' && (
                        <Button size="sm" variant="outline" onClick={() => { setSelected(report); reset(); }}>
                          Action
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {data?.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                      No reports
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={goPrev} disabled={cursors.length === 0}>Previous</Button>
            <Button variant="outline" size="sm" onClick={goNext} disabled={!data?.nextCursor}>Next</Button>
          </div>
        </>
      ))}

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Action Report</DialogTitle>
            <DialogDescription>Choose what action to take on this report.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((d) => selected && actionMutation.mutate({ id: selected.id, data: d }))}
            className="flex flex-col gap-4 mt-2"
          >
            <div className="flex flex-col gap-1.5">
              <Label>Action</Label>
              <Select value={currentAction} onValueChange={(v) => setValue('action', v as ActionForm['action'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dismissed">Dismiss</SelectItem>
                  <SelectItem value="actioned">Uphold (action)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Note (optional)</Label>
              <Input id="notes" placeholder="Internal note..." {...register('notes')} />
            </div>
            {errors.action && <p className="text-xs text-red-600">{errors.action.message}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingPostId} onOpenChange={(o) => { if (!o) closePostDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reported Post</DialogTitle>
            <DialogDescription>Review the reported content before deciding whether to remove it.</DialogDescription>
          </DialogHeader>
          {postQuery.isLoading ? (
            <div className="flex justify-center py-8"><Spinner className="h-6 w-6" /></div>
          ) : postQuery.data ? (
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{postQuery.data.author.displayName} ({postQuery.data.author.email})</span>
                <span className="tabular-nums">{formatDate(postQuery.data.createdAt)}</span>
              </div>
              <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm whitespace-pre-wrap dark:border-slate-800 dark:bg-slate-950">
                {postQuery.data.content || <span className="text-slate-400">(no text content)</span>}
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{postQuery.data.likeCount} likes</span>
                <span>{postQuery.data.commentCount} comments</span>
                <Badge variant={postQuery.data.isDeleted ? 'destructive' : 'success'}>
                  {postQuery.data.isDeleted ? 'Deleted' : 'Live'}
                </Badge>
              </div>
              {!postQuery.data.isDeleted && (
                confirmingPostDelete ? (
                  <div className="flex flex-col gap-2 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
                    <p className="text-sm text-red-700 dark:text-red-400">
                      This hides the post everywhere (feed, profile, comments). Confirm delete?
                    </p>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setConfirmingPostDelete(false)}>
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={deletePostMutation.isPending}
                        onClick={() => viewingPostId && deletePostMutation.mutate(viewingPostId)}
                      >
                        {deletePostMutation.isPending ? 'Deleting...' : 'Yes, delete'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <Button type="button" variant="destructive" size="sm" onClick={() => setConfirmingPostDelete(true)}>
                      Delete post
                    </Button>
                  </div>
                )
              )}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">Post not found.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
