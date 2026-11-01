'use client';

import { LogOut, TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export function NoProfileScreen() {
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
    <main className="flex min-h-screen items-center justify-center bg-brand-light px-4">
      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <TriangleAlert className="mx-auto h-10 w-10 text-amber-600" aria-hidden />
        <h1 className="mt-3 text-lg font-bold text-brand-navy">Perfil no encontrado</h1>
        <p className="mt-2 text-sm text-brand-muted">
          Su usuario está autenticado pero no tiene perfil en el portal. Ejecute supabase/bootstrap.sql en el proyecto
          Supabase o contacte al administrador.
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-brand-dark transition-colors hover:bg-brand-surface"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Salir
        </button>
      </div>
    </main>
  );
}
