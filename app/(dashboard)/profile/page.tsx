'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, LogOut } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, apiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { AdminUserDetail, AdminSession, AuditLog, PageResult } from '@/types/api';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-slate-500 dark:text-slate-400 shrink-0">{label}</span>
      <span className="text-right text-slate-800 dark:text-slate-200">{value}</span>
    </div>
  );
}

const editSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(60),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, and underscores only').optional().or(z.literal('')),
  bio: z.string().max(300).optional().or(z.literal('')),
});
type EditForm = z.infer<typeof editSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });
type PasswordForm = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const { data: me, isLoading: meLoading } = useQuery<AdminUserDetail>({
    queryKey: ['admin-me'],
    queryFn: () => api.get('/me/profile').then((r) => r.data),
  });

  const { data: logs, isLoading: logsLoading } = useQuery<PageResult<AuditLog>>({
    queryKey: ['admin-audit-logs-me', me?.id],
    queryFn: () => api.get('/admin/audit-logs', { params: { userId: me!.id, limit: 20 } }).then((r) => r.data),
    enabled: !!me,
  });

  const { data: loginHistory, isLoading: loginHistoryLoading } = useQuery<PageResult<AuditLog>>({
    queryKey: ['admin-login-history'],
    queryFn: () => api.get('/admin/me/login-history', { params: { limit: 20 } }).then((r) => r.data),
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery<AdminSession[]>({
    queryKey: ['admin-sessions'],
    queryFn: () => api.get('/auth/sessions').then((r) => r.data),
  });

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isEditSubmitting },
  } = useForm<EditForm>({ resolver: zodResolver(editSchema) });

  const updateMutation = useMutation({
    mutationFn: (data: EditForm) =>
      api.patch('/me/profile', {
        displayName: data.displayName,
        username: data.username || undefined,
        bio: data.bio || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-me'] });
      toast({ title: 'Profile updated' });
      setEditOpen(false);
    },
    onError: (err) => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  });

  function openEdit() {
    if (!me) return;
    resetEdit({ displayName: me.displayName, username: me.username ?? '', bio: '' });
    setEditOpen(true);
  }

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const changePasswordMutation = useMutation({
    mutationFn: (data: PasswordForm) =>
      api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }),
    onSuccess: () => {
      toast({ title: 'Password changed' });
      setPasswordOpen(false);
      resetPassword();
    },
    onError: (err) => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (tokenId: string) => api.delete(`/auth/sessions/${tokenId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-sessions'] });
      toast({ title: 'Session revoked' });
    },
    onError: (err) => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  });

  if (meLoading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {me && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Account</CardTitle>
            <Button size="sm" variant="outline" onClick={openEdit}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Row label="Display name" value={me.displayName} />
            <Row label="Email" value={me.email} />
            <Row label="Username" value={me.username ? `@${me.username}` : '—'} />
            <Row label="Role" value={<Badge variant="default">Super Admin</Badge>} />
            <Row label="Joined" value={formatDate(me.createdAt)} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Password & Security</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setPasswordOpen(true)}>
            Change Password
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {sessionsLoading ? (
            <div className="flex justify-center py-8"><Spinner className="h-6 w-6" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions?.map((s) => (
                  <TableRow key={s.tokenId}>
                    <TableCell className="text-sm">{s.deviceName ?? s.deviceId ?? 'Unknown device'}</TableCell>
                    <TableCell className="text-xs text-slate-500 tabular-nums">{formatDate(s.createdAt)}</TableCell>
                    <TableCell className="text-xs text-slate-500 tabular-nums">{formatDate(s.expiresAt)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => revokeSessionMutation.mutate(s.tokenId)}
                        disabled={revokeSessionMutation.isPending}
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {sessions?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-slate-500 text-sm">No active sessions</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Login History</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loginHistoryLoading ? (
            <div className="flex justify-center py-8"><Spinner className="h-6 w-6" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP address</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loginHistory?.items.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-slate-500 tabular-nums">{log.ipAddress ?? '—'}</TableCell>
                    <TableCell className="text-xs text-slate-500 tabular-nums">{formatDate(log.createdAt)}</TableCell>
                  </TableRow>
                ))}
                {loginHistory?.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="py-8 text-center text-slate-500 text-sm">No login history yet</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Recent admin actions</CardTitle></CardHeader>
        <CardContent className="p-0">
          {logsLoading ? (
            <div className="flex justify-center py-8"><Spinner className="h-6 w-6" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(logs?.items as AuditLog[])?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs font-mono text-slate-700 dark:text-slate-300">{log.action}</TableCell>
                    <TableCell className="text-xs text-slate-500 capitalize">{log.entityType}</TableCell>
                    <TableCell className="text-xs text-slate-500 tabular-nums">{log.ipAddress ?? '-'}</TableCell>
                    <TableCell className="text-xs text-slate-500 tabular-nums">{formatDate(log.createdAt)}</TableCell>
                  </TableRow>
                ))}
                {(!logs?.items?.length) && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-slate-500 text-sm">No activity yet</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Update your display name, username, or bio.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit((d) => updateMutation.mutate(d))} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-displayName">Display name</Label>
              <Input id="edit-displayName" {...registerEdit('displayName')} />
              {editErrors.displayName && <p className="text-xs text-red-600">{editErrors.displayName.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-username">Username</Label>
              <Input id="edit-username" placeholder="janedoe" {...registerEdit('username')} />
              {editErrors.username && <p className="text-xs text-red-600">{editErrors.username.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-bio">Bio</Label>
              <Input id="edit-bio" {...registerEdit('bio')} />
              {editErrors.bio && <p className="text-xs text-red-600">{editErrors.bio.message}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isEditSubmitting || updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordOpen} onOpenChange={(o) => { setPasswordOpen(o); if (!o) resetPassword(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handlePasswordSubmit((d) => changePasswordMutation.mutate(d))}
            className="flex flex-col gap-4 mt-2"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="current-password">Current password</Label>
              <Input id="current-password" type="password" {...registerPassword('currentPassword')} />
              {passwordErrors.currentPassword && <p className="text-xs text-red-600">{passwordErrors.currentPassword.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input id="new-password" type="password" {...registerPassword('newPassword')} />
              {passwordErrors.newPassword && <p className="text-xs text-red-600">{passwordErrors.newPassword.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input id="confirm-password" type="password" {...registerPassword('confirmPassword')} />
              {passwordErrors.confirmPassword && <p className="text-xs text-red-600">{passwordErrors.confirmPassword.message}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPasswordOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPasswordSubmitting || changePasswordMutation.isPending}>
                {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
