'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { Pencil, TrendingUp, RefreshCw, Undo2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RevenueBarSeries } from '@/components/revenue/revenue-bar-series';
import { api, apiError } from '@/lib/api';
import { formatDate, formatMoney, formatNumber } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type {
  AdConfig,
  PageResult,
  RevenueEnvironment,
  RevenueOverview,
  RevenueTransaction,
} from '@/types/api';

type EditFormRaw = {
  adsEnabled: 'true' | 'false';
  injectionInterval: string;
  adUnitId: string;
  /** Entered in whole currency units; converted to minor units on submit. */
  ecpm: string;
};

const WINDOWS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

const ENVIRONMENTS: { value: RevenueEnvironment; label: string }[] = [
  { value: 'PRODUCTION', label: 'Production' },
  { value: 'SANDBOX', label: 'Sandbox' },
  { value: 'ALL', label: 'All' },
];

export default function RevenuePage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<AdConfig | null>(null);
  const [days, setDays] = useState('30');
  const [environment, setEnvironment] = useState<RevenueEnvironment>('PRODUCTION');

  const { data: overview, isLoading: overviewLoading } = useQuery<RevenueOverview>({
    queryKey: ['admin-revenue-overview', days, environment],
    queryFn: () =>
      api
        .get('/admin/revenue/overview', { params: { days: Number(days), environment } })
        .then((r) => r.data),
  });

  const { data: txns } = useQuery<PageResult<RevenueTransaction>>({
    queryKey: ['admin-revenue-transactions', days, environment],
    queryFn: () =>
      api
        .get('/admin/revenue/transactions', {
          params: { days: Number(days), environment, limit: 10 },
        })
        .then((r) => r.data),
  });

  const { data: configs, isLoading: configsLoading } = useQuery<AdConfig[]>({
    queryKey: ['admin-ad-configs'],
    queryFn: () => api.get('/admin/ad-configs').then((r) => r.data),
  });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<EditFormRaw>();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditFormRaw }) => {
      const interval = parseInt(data.injectionInterval, 10);
      // Backend caps this at 50; validating here keeps the user out of a 400.
      if (isNaN(interval) || interval < 1 || interval > 50) throw new Error('Interval must be 1-50');
      const ecpm = data.ecpm.trim() === '' ? 0 : Number(data.ecpm);
      if (isNaN(ecpm) || ecpm < 0) throw new Error('eCPM must be a positive amount');
      return api.patch(`/admin/ad-configs/${id}`, {
        adsEnabled: data.adsEnabled === 'true',
        injectionInterval: interval,
        adUnitId: data.adUnitId || undefined,
        estimatedEcpmCents: Math.round(ecpm * 100),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-ad-configs'] });
      qc.invalidateQueries({ queryKey: ['admin-revenue-overview'] });
      toast({ title: 'Ad config updated' });
      setSelected(null);
    },
    onError: (err) => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  });

  function openEdit(config: AdConfig) {
    setSelected(config);
    reset({
      adsEnabled: config.adsEnabled ? 'true' : 'false',
      injectionInterval: String(config.injectionInterval),
      adUnitId: config.adUnitId ?? '',
      ecpm: config.estimatedEcpmCents ? String(config.estimatedEcpmCents / 100) : '',
    });
  }

  if (overviewLoading || configsLoading) {
    return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;
  }

  const currency = overview?.currency ?? 'USD';

  return (
    <div className="flex flex-col gap-6">
      {/* ── Filters ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {WINDOWS.map((w) => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={environment} onValueChange={(v) => setEnvironment(v as RevenueEnvironment)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ENVIRONMENTS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {environment !== 'PRODUCTION' && (
          <Badge variant="warning">Includes simulated purchases — not earnings</Badge>
        )}
      </div>

      {/*
        Until real store keys ship, every purchase arrives as SANDBOX and a production
        report is legitimately empty. Saying so beats rendering a row of zeros that
        reads as "we earned nothing".
      */}
      {overview && !overview.hasProductionData && environment === 'PRODUCTION' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          No production purchases recorded yet. The app is still on RevenueCat Test Store keys,
          so purchases arrive as sandbox events — switch the environment filter to{' '}
          <strong>Sandbox</strong> to see test activity. See RELEASE_CHECKLIST.md, blocker 4.
        </div>
      )}

      {/* ── Revenue overview (TRD §Dashboard → Revenue overview) ── */}
      {overview && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Net revenue"
              value={formatMoney(overview.totals.netCents, currency)}
              hint={`${formatMoney(overview.totals.grossCents, currency)} gross`}
              icon={TrendingUp}
            />
            <StatCard
              label="MRR"
              value={formatMoney(overview.subscriptions.mrrCents, currency)}
              hint={`${formatNumber(overview.subscriptions.activeSubscriptions)} active subs`}
              icon={RefreshCw}
            />
            <StatCard
              label="ARPU"
              value={formatMoney(overview.subscriptions.arpuCents, currency)}
              hint={`ARPPU ${formatMoney(overview.subscriptions.arppuCents, currency)}`}
              icon={Users}
            />
            <StatCard
              label="Refunded"
              value={formatMoney(overview.totals.refundedCents, currency)}
              hint={`${formatNumber(overview.subscriptions.churnedInWindow)} churned`}
              icon={Undo2}
              highlight={overview.totals.refundedCents > 0}
            />
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Net revenue per day</CardTitle>
                <span className="text-xs text-slate-500 tabular-nums">
                  {formatNumber(overview.totals.transactions)} transactions ·{' '}
                  {formatNumber(overview.totals.payingUsers)} paying users
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <RevenueBarSeries points={overview.series} currency={currency} />
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Revenue mix</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <Row label="New subscriptions" value={formatMoney(overview.split.newCents, currency)} />
                <Row label="Renewals" value={formatMoney(overview.split.renewalCents, currency)} />
                <Row label="One-off purchases" value={formatMoney(overview.split.oneOffCents, currency)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">By tier</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                {overview.byTier.length === 0 && <EmptyHint />}
                {overview.byTier.map((t) => (
                  <Row
                    key={t.tier ?? 'none'}
                    label={<span className="capitalize">{t.tier ?? 'Other'}</span>}
                    value={formatMoney(t.netCents, currency)}
                  />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">By store</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                {overview.byStore.length === 0 && <EmptyHint />}
                {overview.byStore.map((s) => (
                  <Row
                    key={s.store}
                    label={<span className="capitalize">{s.store}</span>}
                    value={formatMoney(s.netCents, currency)}
                  />
                ))}
              </CardContent>
            </Card>
          </div>

          {/* ── Ad performance (TRD §Advertisements → monitor placements) ── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Rewarded ad performance</CardTitle>
                <Badge variant="secondary">Estimated</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
              <Row label="Completions" value={formatNumber(overview.ads.rewardedCompletions)} />
              <Row label="Unique viewers" value={formatNumber(overview.ads.uniqueViewers)} />
              <Row label="Active rewards" value={formatNumber(overview.ads.activeRewards)} />
              <Row
                label="Estimated ad revenue"
                value={
                  overview.ads.estimatedCents === null ? (
                    <span className="text-xs text-slate-400">Set an eCPM below</span>
                  ) : (
                    formatMoney(overview.ads.estimatedCents, currency)
                  )
                }
              />
              <p className="col-span-full text-xs text-slate-500 dark:text-slate-400">
                AdMob reports earnings only to its own console. This figure is completions x the
                eCPM configured below — an estimate, never a settled amount.
              </p>
            </CardContent>
          </Card>

          {/* ── Transaction drill-down ─────────────────────────── */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Recent transactions</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txns?.items.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm">{t.displayName ?? <span className="text-slate-400">Unmatched</span>}</TableCell>
                      <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-400">{t.eventType}</TableCell>
                      <TableCell className="text-xs capitalize text-slate-500">{t.tier ?? '—'}</TableCell>
                      <TableCell className="text-xs capitalize text-slate-500">{t.store}</TableCell>
                      <TableCell className={`text-right text-sm tabular-nums ${t.netCents < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                        {formatMoney(t.netCents, t.currency)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 tabular-nums">{formatDate(t.occurredAt)}</TableCell>
                    </TableRow>
                  ))}
                  {!txns?.items.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-slate-500">
                        No transactions in this window
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* ── AdMob placement configuration ───────────────────── */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          AdMob placements
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {configs?.map((config) => (
            <Card key={config.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm capitalize">{config.tier} tier</CardTitle>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(config)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <Row label="Ads enabled" value={
                  <Badge variant={config.adsEnabled ? 'success' : 'secondary'}>
                    {config.adsEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                } />
                <Row label="Injection interval" value={`Every ${config.injectionInterval} posts`} />
                <Row label="Ad unit ID" value={
                  config.adUnitId
                    ? <span className="font-mono text-xs">{config.adUnitId}</span>
                    : <span className="text-xs text-slate-400">Bundled default</span>
                } />
                <Row label="eCPM" value={
                  config.estimatedEcpmCents
                    ? formatMoney(config.estimatedEcpmCents, currency)
                    : <span className="text-xs text-slate-400">Not set</span>
                } />
                <Row label="Updated" value={<span className="text-xs tabular-nums">{formatDate(config.updatedAt)}</span>} />
              </CardContent>
            </Card>
          ))}
          {configs?.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-slate-500">
              No ad configs found. Run DB seed to populate.
            </p>
          )}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">Edit {selected?.tier} tier placement</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((d) => selected && updateMutation.mutate({ id: selected.id, data: d }))}
            className="mt-2 flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label>Ads enabled</Label>
              <Select value={watch('adsEnabled')} onValueChange={(v) => setValue('adsEnabled', v as 'true' | 'false')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Enabled</SelectItem>
                  <SelectItem value="false">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="injectionInterval">Injection interval (posts between ads)</Label>
              <Input
                id="injectionInterval"
                type="number"
                min={1}
                max={50}
                {...register('injectionInterval', {
                  required: 'Required',
                  min: { value: 1, message: 'Min 1' },
                  max: { value: 50, message: 'Max 50' },
                })}
              />
              {errors.injectionInterval && <p className="text-xs text-red-600">{errors.injectionInterval.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="adUnitId">Ad unit ID</Label>
              <Input id="adUnitId" placeholder="ca-app-pub-..." {...register('adUnitId')} />
              <p className="text-xs text-slate-500">
                Sent to the app for this tier&apos;s feed and rewarded placements. Leave blank to use
                the unit bundled with the build.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ecpm">Estimated eCPM</Label>
              <Input id="ecpm" type="number" step="0.01" min={0} placeholder="e.g. 4.50" {...register('ecpm')} />
              <p className="text-xs text-slate-500">
                Used only to estimate ad revenue on this page. Blank or 0 hides the estimate.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ElementType;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</CardTitle>
          <Icon className={`h-4 w-4 ${highlight ? 'text-red-500' : 'text-slate-400'}`} />
        </div>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold tabular-nums ${highlight ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'}`}>
          {value}
        </p>
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="shrink-0 text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function EmptyHint() {
  return <span className="text-xs text-slate-400">No revenue in this window</span>;
}
