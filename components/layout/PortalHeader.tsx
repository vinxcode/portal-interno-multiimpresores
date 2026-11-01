'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChartColumn, FileText, LayoutDashboard, LogOut, Receipt } from 'lucide-react';
import type { Profile } from '@/lib/types/database';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/cotizaciones', label: 'Cotizaciones', icon: FileText },
  { href: '/recibos', label: 'Recibos', icon: Receipt },
  { href: '/reportes', label: 'Reportes', icon: ChartColumn },
];

export function PortalHeader({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-sm font-bold text-brand-navy">
            MULTI IMPRESORES
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    active ? 'bg-brand-navy text-white' : 'text-brand-muted hover:bg-brand-surface hover:text-brand-dark'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-brand-dark">
              {profile.user_code} - {profile.full_name}
            </p>
            <p className="text-[11px] font-medium uppercase tracking-wide text-brand-muted">{profile.role}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-brand-dark transition-colors hover:bg-brand-surface"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
