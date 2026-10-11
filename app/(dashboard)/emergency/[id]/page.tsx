'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { EmergencyAlert } from '@/types/api';

type AlertDetail = EmergencyAlert & {
  contacts?: { id: string; name: string; phone: string }[];
  visibility?: 'public' | 'private';
  locationSharing?: boolean;
  accuracy?: number | null;
  lastLocationAt?: string | null;
  alertedUserCount?: number;
  locations?: { latitude: number; longitude: number; accuracy: number | null; recordedAt: string }[];
};

const mapsUrl = (lat: number, lng: number) => `https://maps.google.com/?q=${lat},${lng}`;

export default function EmergencyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: alert, isLoading } = useQuery<AlertDetail>({
    queryKey: ['admin-emergency-alert', id],
    queryFn: () => api.get(`/admin/emergency/alerts/${id}`).then((r) => r.data),
    refetchInterval: 15_000,
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;
  if (!alert) return <p className="text-slate-500">Alert not found.</p>;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/emergency" className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Alert — {alert.userDisplayName ?? alert.userId}
        </h2>
        <Badge variant={alert.status === 'active' ? 'destructive' : 'secondary'} className="capitalize">
          {alert.status}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Alert info</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Row label="User" value={alert.userDisplayName ?? alert.userId} />
            <Row label="Triggered" value={formatDate(alert.triggeredAt)} />
            <Row label="Resolved" value={alert.resolvedAt ? formatDate(alert.resolvedAt) : 'Still active'} />
            {alert.visibility && (
              <Row
                label="Visibility"
                value={alert.visibility === 'public' ? 'Public (followers alerted)' : 'Private (contacts only)'}
              />
            )}
            {alert.locationSharing !== undefined && (
              <Row label="Live location" value={alert.locationSharing ? 'Shared' : 'Not shared'} />
            )}
            {alert.alertedUserCount !== undefined && (
              <Row label="Miralynk users alerted" value={alert.alertedUserCount} />
            )}
            {alert.lastLocationAt && <Row label="Last location update" value={formatDate(alert.lastLocationAt)} />}
            {alert.latitude != null && alert.longitude != null && (
              <Row
                label="Location"
                value={
                  <a
                    href={mapsUrl(alert.latitude, alert.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    <MapPin className="h-3 w-3" />
                    {alert.latitude.toFixed(5)}, {alert.longitude.toFixed(5)}
                    {alert.accuracy != null && ` (±${Math.round(alert.accuracy)} m)`}
                  </a>
                }
              />
            )}
          </CardContent>
        </Card>

        {alert.contacts && alert.contacts.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Trusted contacts</CardTitle></CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {alert.contacts.map((c) => (
                  <li key={c.id} className="text-sm">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.phone}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {alert.locations && alert.locations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Location trail ({alert.locations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {alert.locations.map((p) => (
                <li key={p.recordedAt} className="flex items-center justify-between gap-4 py-2">
                  <span className="text-slate-500 dark:text-slate-400">{formatDate(p.recordedAt)}</span>
                  <a
                    href={mapsUrl(p.latitude, p.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    <MapPin className="h-3 w-3" />
                    {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
                    {p.accuracy != null && ` (±${Math.round(p.accuracy)} m)`}
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
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
