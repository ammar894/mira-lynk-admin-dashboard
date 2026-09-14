'use client';

import { useState } from 'react';
import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { api, apiError } from '@/lib/api';
import { formatDate, formatNumber } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { Community } from '@/types/api';

const deleteSchema = z.object({ reason: z.string().min(1, 'Reason is required').max(500) });
type DeleteForm = z.infer<typeof deleteSchema>;

export default function CommunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: community, isLoading } = useQuery<Community>({
    queryKey: ['admin-community', id],
    queryFn: () => api.get(`/admin/communities/${id}`).then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DeleteForm>({
    resolver: zodResolver(deleteSchema),
  });

  const deleteMutation = useMutation({
    mutationFn: (reason: string) => api.delete(`/admin/communities/${id}`, { data: { reason } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-communities'] });
      toast({ title: 'Community removed', variant: 'destructive' });
      router.push('/communities');
    },
    onError: (err) => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;
  if (!community) return <p className="text-slate-500">Community not found.</p>;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/communities" className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{community.name}</h2>
        {community.isDeleted ? (
          <Badge variant="destructive">Removed</Badge>
        ) : (
          <Badge variant="success">Active</Badge>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {community.description && <Row label="Description" value={community.description} />}
          <Row
            label="Owner"
            value={
              <Link href={`/users/${community.ownerId}`} className="text-indigo-600 hover:underline dark:text-indigo-400">
                {community.ownerDisplayName}
              </Link>
            }
          />
          <Row label="Members" value={formatNumber(community.memberCount)} />
          <Row label="Visibility" value={<Badge variant="outline" className="capitalize">{community.visibility}</Badge>} />
          <Row label="Created" value={formatDate(community.createdAt)} />
        </CardContent>
      </Card>

      {!community.isDeleted && (
        <div>
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => { setDeleteOpen(true); reset(); }}
          >
            <Trash2 className="h-4 w-4" />
            Remove Community
          </Button>
        </div>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove &ldquo;{community.name}&rdquo;?</DialogTitle>
            <DialogDescription>This will platform-ban the community (soft-delete). Provide a reason for the audit log.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((d) => deleteMutation.mutate(d.reason))}
            className="flex flex-col gap-4 mt-2"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reason">Reason</Label>
              <Input id="reason" placeholder="e.g. Violates community guidelines" {...register('reason')} />
              {errors.reason && <p className="text-xs text-red-600">{errors.reason.message}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={isSubmitting || deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Removing...' : 'Remove Community'}
              </Button>
            </div>
          </form>
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
