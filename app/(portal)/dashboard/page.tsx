import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, Receipt } from 'lucide-react';
import { ProductSearchTable } from '@/components/products/ProductSearchTable';
import { canCreateProducts, canSeePurchasePrice, canUpdateProducts } from '@/lib/auth/roles';
import { requireProfile } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Dashboard - MULTI IMPRESORES',
};

export default async function DashboardPage() {
  const profile = await requireProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-brand-navy">Portal Principal</h1>
        <p className="text-sm text-brand-muted">Bienvenido, {profile.full_name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/cotizaciones"
          className="group rounded-lg border border-slate-200 bg-white p-6 transition-colors hover:border-brand-cobalt"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-brand-cobalt">
              <FileText className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-brand-navy">COTIZACIÓN</h2>
              <p className="text-xs text-brand-muted">Crea y administra tus cotizaciones</p>
            </div>
          </div>
        </Link>
        <Link
          href="/recibos"
          className="group rounded-lg border border-slate-200 bg-white p-6 transition-colors hover:border-brand-cobalt"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-brand-cobalt">
              <Receipt className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-brand-navy">RECIBOS</h2>
              <p className="text-xs text-brand-muted">Administra tus recibos y pagos</p>
            </div>
          </div>
        </Link>
      </div>

      <ProductSearchTable
        canSeePurchasePrice={canSeePurchasePrice(profile.role)}
        canCreate={canCreateProducts(profile.role)}
        canEdit={canUpdateProducts(profile.role)}
      />
    </div>
  );
}
