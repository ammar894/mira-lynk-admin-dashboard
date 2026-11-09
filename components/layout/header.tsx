'use client';

import { usePathname } from 'next/navigation';

const titleMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/users': 'User Management',
  '/moderation': 'Content Moderation',
  '/communities': 'Communities',
  '/sessions': 'Video Sessions',
  '/emergency': 'Live Alerts',
  '/revenue': 'Revenue & Ads',
  '/profile': 'My Profile',
};

function getTitle(pathname: string): string {
  for (const [prefix, title] of Object.entries(titleMap)) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) return title;
  }
  return 'Admin';
}

export function Header() {
  const pathname = usePathname();
  return (
    <header className="flex h-14 items-center border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">{getTitle(pathname)}</h1>
    </header>
  );
}
