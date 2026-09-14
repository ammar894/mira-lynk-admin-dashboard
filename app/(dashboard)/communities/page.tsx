'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, apiError } from '@/lib/api';
import { formatDate, formatNumber } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { Community, PageResult } from '@/types/api';

const deleteSchema = z.object({ reason: z.string().min(1, 'Reason is required').max(500) });
type DeleteForm = z.infer<typeof deleteSchema>;

export default function CommunitiesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [cursor, setCursor] = useState<string | undefined>();
  const [cursors, setCursors] = useState<string[]>([]);
  const [selected, setSelected] = useState<Community | null>(null);

  const { data, isLoading } = useQuery<PageResult<Community>>({
    queryKey: ['admin-communities', search, cursor],
    queryFn: () =>
      api.get('/admin/communities', {
        params: { search: search || undefined, cursor, limit: 20 },
      }).then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DeleteForm>({
    resolver: zodResolver(deleteSchema),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.delete(`/admin/communities/${id}`, { data: { reason } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-communities'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      toast({ title: 'Community removed', variant: 'destructive' });
      setSelected(null);
      reset();
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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setCursor(undefined);
    setCursors([]);
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSearch} className="flex gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search communities..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline" size="sm">Search</Button>
      </form>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner className="h-7 w-7" /></div>
      ) : (
        <>
          <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Community</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div>
                        <Link
                          href={`/communities/${c.id}`}
                          className="font-medium text-slate-900 hover:underline dark:text-slate-100"
                        >
                          {c.name}
                        </Link>
                        {c.description && <p className="text-xs text-slate-500 truncate max-w-[200px]">{c.description}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 dark:text-slate-400">{c.ownerDisplayName}</TableCell>
                    <TableCell className="tabular-nums text-sm">{formatNumber(c.memberCount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{c.visibility}</Badge>
                    </TableCell>
                    <TableCell>
                      {c.isDeleted ? (
                        <Badge variant="destructive">Removed</Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 tabular-nums">{formatDate(c.createdAt)}</TableCell>
                    <TableCell>
                      {!c.isDeleted && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          aria-label={`Remove community ${c.name}`}
                          title="Remove community"
                          onClick={() => { setSelected(c); reset(); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {data?.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-slate-500">No communities found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>{data?.total ?? 0} total communities</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={goPrev} disabled={cursors.length === 0}>Previous</Button>
              <Button variant="outline" size="sm" onClick={goNext} disabled={!data?.nextCursor}>Next</Button>
            </div>
          </div>
        </>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove &ldquo;{selected?.name}&rdquo;?</DialogTitle>
            <DialogDescription>This will platform-ban the community (soft-delete). Provide a reason for the audit log.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((d) => selected && deleteMutation.mutate({ id: selected.id, reason: d.reason }))}
            className="flex flex-col gap-4 mt-2"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reason">Reason</Label>
              <Input id="reason" placeholder="e.g. Violates community guidelines" {...register('reason')} />
              {errors.reason && <p className="text-xs text-red-600">{errors.reason.message}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={isSubmitting}>
                {isSubmitting ? 'Removing...' : 'Remove Community'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
