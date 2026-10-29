'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Flag,
  Globe,
  Video,
  AlertTriangle,
  DollarSign,
  UserCircle,
  LogOut,
  BarChart2,
  Settings,
  Sun,
  Moon,
} from 'lucide-react';
import webLogo from '@/assets/web-logo.png';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/auth';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/moderation', label: 'Moderation', icon: Flag },
  { href: '/polls', label: 'Polls', icon: BarChart2 },
  { href: '/communities', label: 'Communities', icon: Globe },
  { href: '/sessions', label: 'Sessions', icon: Video },
  { href: '/emergency', label: 'Emergency', icon: AlertTriangle },
  { href: '/revenue', label: 'Revenue', icon: DollarSign },
  { href: '/profile', label: 'My Profile', icon: UserCircle },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  function handleLogout() {
    auth.clear();
    router.push('/login');
  }

  return (
    <aside className="flex h-full w-60 flex-col bg-slate-900 text-slate-100">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-800">
        <Image src={webLogo} alt="Miralynk" className="h-8 w-auto shrink-0 rounded-md" priority />
        <span className="font-semibold text-white tracking-tight">Admin</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="flex flex-col gap-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-slate-800 p-3 flex flex-col gap-1">
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
        >
          {isDark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
          {isDark ? 'Light mode' : 'Dark mode'}
        </button>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
