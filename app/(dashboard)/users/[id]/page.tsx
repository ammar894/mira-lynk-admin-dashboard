'use client';

import { useState } from 'react';
import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Ban, CheckCircle, ShieldCheck, ShieldOff, Trash2 } from 'lucide-react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, apiError } from '@/lib/api';
import { formatDate, formatNumber } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type {
  AdminUserDetail,
  AdminUserBlock,
  AdminUserSubscription,
  PageResult,
} from '@/types/api';

const banSchema = z.object({ reason: z.string().min(1, 'Reason is required') });
type BanForm = z.infer<typeof banSchema>;

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const [banOpen, setBanOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: user, isLoading } = useQuery<AdminUserDetail>({
    queryKey: ['admin-user', id],
    queryFn: () => api.get(`/admin/users/${id}`).then((r) => r.data),
  });

  const { data: subscription } = useQuery<AdminUserSubscription>({
    queryKey: ['admin-user-subscription', id],
    queryFn: () => api.get(`/admin/users/${id}/subscription`).then((r) => r.data),
  });

  const { data: blocksData } = useQuery<PageResult<AdminUserBlock>>({
    queryKey: ['admin-user-blocks', id],
    queryFn: () => api.get(`/admin/users/${id}/blocks`, { params: { limit: 20 } }).then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<BanForm>({
    resolver: zodResolver(banSchema),
  });

  const banMutation = useMutation({
    mutationFn: (data: BanForm) => api.post(`/admin/users/${id}/ban`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user', id] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'User banned', variant: 'destructive' });
      setBanOpen(false);
      reset();
    },
    onError: (err) => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  });

  const unbanMutation = useMutation({
    mutationFn: () => api.delete(`/admin/users/${id}/ban`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user', id] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'User unbanned' });
    },
    onError: (err) => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  });

  const verifyMutation = useMutation({
    mutationFn: () => api.post(`/admin/users/${id}/verify`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user', id] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'User verified' });
    },
    onError: (err) => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  });

  const unverifyMutation = useMutation({
    mutationFn: () => api.delete(`/admin/users/${id}/verify`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user', id] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'Verification removed' });
    },
    onError: (err) => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      toast({ title: 'User deleted', variant: 'destructive' });
      setDeleteOpen(false);
      router.push('/users');
    },
    onError: (err) => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  });

  const removeBlockMutation = useMutation({
    mutationFn: (blockedUserId: string) => api.delete(`/admin/users/${id}/blocks/${blockedUserId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user-blocks', id] });
      toast({ title: 'Block removed' });
    },
    onError: (err) => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;
  if (!user) return <p className="text-slate-500">User not found.</p>;

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/users" className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          {user.displayName}
          {user.isVerified && <CheckCircle className="h-4 w-4 text-blue-500" />}
        </h2>
        {user.isDeleted ? (
          <Badge variant="destructive">Deleted</Badge>
        ) : user.isBanned ? (
          <Badge variant="destructive">Banned</Badge>
        ) : (
          <Badge variant="success">Active</Badge>
        )}
        {user.isVerified && <Badge variant="default" className="bg-blue-600">Verified</Badge>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Account</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Row label="Email" value={user.email} />
            <Row label="Username" value={user.username ? `@${user.username}` : '—'} />
            <Row label="Tier" value={<Badge variant="secondary" className="capitalize">{user.tier}</Badge>} />
            <Row label="Platform role" value={user.platformRole} />
            <Row label="Joined" value={formatDate(user.createdAt)} />
            {user.bio && <Row label="Bio" value={user.bio} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Activity</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Row label="Posts" value={formatNumber(user.postCount ?? 0)} />
            <Row label="Followers" value={formatNumber(user.followerCount ?? 0)} />
            <Row label="Following" value={formatNumber(user.followingCount ?? 0)} />
            {subscription?.status ? (
              <>
                <Row label="Sub tier" value={<Badge variant="secondary" className="capitalize">{subscription.tier}</Badge>} />
                <Row label="Sub status" value={<span className="capitalize">{subscription.status.replace('_', ' ')}</span>} />
                {subscription.platform && <Row label="Platform" value={<span className="capitalize">{subscription.platform}</span>} />}
                {subscription.expiresAt && <Row label="Expires" value={formatDate(subscription.expiresAt)} />}
              </>
            ) : (
              <Row label="Subscription" value={<span className="text-xs text-slate-400">None on record</span>} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Block relationships */}
      {blocksData && blocksData.items.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Blocks ({blocksData.items.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Blocked user</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Blocked at</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {blocksData.items.map((b) => (
                  <TableRow key={b.blockedUserId}>
                    <TableCell className="text-sm font-medium">{b.blockedDisplayName}</TableCell>
                    <TableCell className="text-xs text-slate-500">{b.blockedEmail ?? '—'}</TableCell>
                    <TableCell className="text-xs text-slate-500 tabular-nums">{formatDate(b.blockedAt)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeBlockMutation.mutate(b.blockedUserId)}
                        disabled={removeBlockMutation.isPending}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!user.isDeleted && (
        <div className="flex flex-wrap gap-3">
          {/* Verify / Unverify */}
          {user.isVerified ? (
            <Button variant="outline" onClick={() => unverifyMutation.mutate()} disabled={unverifyMutation.isPending}>
              <ShieldOff className="h-4 w-4" />
              Remove Verification
            </Button>
          ) : (
            <Button variant="outline" onClick={() => verifyMutation.mutate()} disabled={verifyMutation.isPending}>
              <ShieldCheck className="h-4 w-4" />
              Verify Identity
            </Button>
          )}

          {/* Ban / Unban */}
          {user.isBanned ? (
            <Button variant="outline" onClick={() => unbanMutation.mutate()} disabled={unbanMutation.isPending}>
              <CheckCircle className="h-4 w-4" />
              Unban User
            </Button>
          ) : (
            <Button variant="destructive" onClick={() => setBanOpen(true)}>
              <Ban className="h-4 w-4" />
              Ban User
            </Button>
          )}

          {/* Delete */}
          <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
            Delete Account
          </Button>
        </div>
      )}

      {/* Ban Dialog */}
      <Dialog open={banOpen} onOpenChange={setBanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban {user.displayName}?</DialogTitle>
            <DialogDescription>This will revoke all active sessions and block login. Provide a reason.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => banMutation.mutate(d))} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reason">Reason</Label>
              <Input id="reason" placeholder="e.g. Repeated policy violations" {...register('reason')} />
              {errors.reason && <p className="text-xs text-red-600">{errors.reason.message}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setBanOpen(false)}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={isSubmitting}>
                {isSubmitting ? 'Banning...' : 'Confirm Ban'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {user.displayName}?</DialogTitle>
            <DialogDescription>This will permanently deactivate the account and revoke all sessions. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Account'}
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
