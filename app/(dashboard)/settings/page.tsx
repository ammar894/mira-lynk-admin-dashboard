'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { api, apiError } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import type { AdminNotificationPref } from '@/types/api';

export default function SettingsPage() {
  const qc = useQueryClient();

  const { data: prefs, isLoading } = useQuery<AdminNotificationPref>({
    queryKey: ['admin-notif-prefs'],
    queryFn: () => api.get('/admin/me/notification-preferences').then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { isSubmitting, isDirty } } = useForm<AdminNotificationPref>();

  useEffect(() => {
    if (prefs) reset(prefs);
  }, [prefs, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: AdminNotificationPref) => api.patch('/admin/me/notification-preferences', data),
    onSuccess: (_res, saved) => {
      qc.setQueryData(['admin-notif-prefs'], saved);
      reset(saved);
      toast({ title: 'Preferences saved' });
    },
    onError: (err) => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Settings</h2>

      <Card>
        <CardHeader><CardTitle className="text-sm">Notification Preferences</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="flex flex-col gap-5">
            <Checkbox id="onNewReport" label="Notify on new content report" {...register('onNewReport')} />
            <Checkbox id="onActiveAlert" label="Notify on active Live Alert" {...register('onActiveAlert')} />
            <Checkbox id="onNewUser" label="Notify on new user registration" {...register('onNewUser')} />

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting || !isDirty}>
                {isSubmitting ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Checkbox({ id, label, ...props }: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="checkbox"
        id={id}
        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        {...props}
      />
      <Label htmlFor={id} className="text-sm font-normal text-slate-700 dark:text-slate-300 cursor-pointer">
        {label}
      </Label>
    </div>
  );
}
