'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Users,
  FileText,
  Globe,
  Video,
  Flag,
  AlertTriangle,
  UserCheck,
  TrendingUp,
  DollarSign,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatMoney, formatNumber } from '@/lib/utils';
import type { AdminStats, RevenueOverview } from '@/types/api';

function StatCard({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: number | string;
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
          {typeof value === 'number' ? formatNumber(value) : value}
        </p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then((r) => r.data),
  });

  // TRD §Dashboard lists "Revenue overview" beside user statistics and content
  // activity. The detail lives on /revenue; these three tiles are the summary.
  const { data: revenue } = useQuery<RevenueOverview>({
    queryKey: ['admin-revenue-overview', '30', 'PRODUCTION'],
    queryFn: () =>
      api
        .get('/admin/revenue/overview', { params: { days: 30, environment: 'PRODUCTION' } })
        .then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
        Failed to load stats. Check your connection and try again.
      </div>
    );
  }

  const tierEntries = Object.entries(data.tierBreakdown ?? {});

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={data.totalUsers} icon={Users} />
        <StatCard label="Active Users" value={data.activeUsers} icon={UserCheck} />
        <StatCard label="New This Week" value={data.newUsersLast7Days} icon={TrendingUp} />
        <StatCard label="Total Posts" value={data.totalPosts} icon={FileText} />
        <StatCard label="Communities" value={data.totalCommunities} icon={Globe} />
        <StatCard label="Active Sessions" value={data.activeSessions} icon={Video} />
        <StatCard label="Pending Reports" value={data.pendingReports} icon={Flag} highlight={data.pendingReports > 0} />
        <StatCard label="Active Alerts" value={data.activeEmergencyAlerts} icon={AlertTriangle} highlight={data.activeEmergencyAlerts > 0} />
      </div>

      {revenue && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Revenue — last 30 days
            </h3>
            <Link
              href="/revenue"
              className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              View details
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Net Revenue"
              value={formatMoney(revenue.totals.netCents, revenue.currency)}
              icon={DollarSign}
            />
            <StatCard
              label="MRR"
              value={formatMoney(revenue.subscriptions.mrrCents, revenue.currency)}
              icon={RefreshCw}
            />
            <StatCard
              label="Active Subscriptions"
              value={revenue.subscriptions.activeSubscriptions}
              icon={UserCheck}
            />
          </div>
          {!revenue.hasProductionData && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No production purchases yet — the app is still on RevenueCat Test Store keys.
            </p>
          )}
        </div>
      )}

      {tierEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Subscription Tiers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {tierEntries.map(([tier, count]) => (
                <div key={tier} className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {tier}
                  </Badge>
                  <span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                    {formatNumber(count as number)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
