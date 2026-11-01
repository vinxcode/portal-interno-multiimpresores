import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { AbonosTable } from '@/components/recibos/AbonosTable';
import { QuoteActions } from '@/components/cotizador/QuoteActions';
import { QuoteTotalsPanel } from '@/components/cotizador/QuoteTotalsPanel';
import { StatusBadge } from '@/components/ui/Badge';
import { requireProfile } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { calculatePendingBalance } from '@/lib/abonos';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { QuoteWithRelations } from '@/lib/types/database';

export const metadata: Metadata = {
  title: 'Detalle de OT - MULTI IMPRESORES',
};

interface QuoteDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function QuoteDetailPage({ params }: QuoteDetailPageProps) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await getSupabaseServerClient();

  const { data } = await supabase
    .from('quotes')
    .select(
      `*,
      client:clients(*),
      items:quote_items(*),
      payments(*, profile:profiles(id, user_code, full_name)),
      assigned:profiles!quotes_assigned_to_fkey(id, user_code, full_name),
      creator:profiles!quotes_created_by_fkey(id, user_code, full_name)`
    )
    .eq('id', id)
    .single();

  if (!data) {
    notFound();
  }

  const quote = data as unknown as QuoteWithRelations;
  const saldo = calculatePendingBalance(
    quote.total,
    quote.payments.map((payment) => payment.amount)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/cotizaciones"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-muted transition-colors hover:text-brand-dark"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Volver a Cotizaciones
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-xl font-bold text-brand-navy">{quote.correlative}</h1>
            <StatusBadge status={quote.status} />
          </div>
          <p className="mt-1 text-sm text-brand-muted">{quote.client?.name ?? 'Sin cliente'}</p>
        </div>
        <Link
          href={`/recibos?quote=${quote.id}`}
          className="inline-flex items-center gap-2 rounded-md bg-brand-cobalt px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Ir a Recibo
        </Link>
      </div>

      <section className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Cliente</h2>
          <p className="mt-1 text-sm font-medium text-brand-dark">{quote.client?.name ?? '-'}</p>
          <p className="text-xs text-brand-muted">NIT/NRC/DUI: {quote.client?.doc_id ?? '-'}</p>
          <p className="text-xs text-brand-muted">Tel: {quote.client?.phone ?? '-'}</p>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Responsables</h2>
          <p className="mt-1 text-xs text-brand-muted">
            Creada por: <span className="font-medium text-brand-dark">{quote.creator ? `${quote.creator.user_code} - ${quote.creator.full_name}` : '-'}</span>
          </p>
          <p className="text-xs text-brand-muted">
            Operario asignado:{' '}
            <span className="font-medium text-brand-dark">
              {quote.assigned ? `${quote.assigned.user_code} - ${quote.assigned.full_name}` : 'Sin asignar'}
            </span>
          </p>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Fechas y cierre</h2>
          <p className="mt-1 text-xs text-brand-muted">
            Creada: <span className="font-medium text-brand-dark">{formatDateTime(quote.created_at)}</span>
          </p>
          <p className="text-xs text-brand-muted">
            Actualizada: <span className="font-medium text-brand-dark">{formatDateTime(quote.updated_at)}</span>
          </p>
          {quote.external_invoice_number ? (
            <p className="text-xs text-brand-muted">
              Factura externa: <span className="font-semibold text-emerald-700">{quote.external_invoice_number}</span>
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-brand-dark">Ítems de la Orden</h2>
        </div>
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-brand-surface text-left text-xs font-semibold uppercase tracking-wide text-brand-muted">
                  <th className="px-3 py-2">Cant.</th>
                  <th className="px-3 py-2">Detalle</th>
                  <th className="px-3 py-2 text-right">P. Unidad</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 font-semibold text-brand-dark">{item.quantity}</td>
                    <td className="px-3 py-2 text-brand-dark">{item.detail}</td>
                    <td className="px-3 py-2 text-right text-brand-dark">{formatCurrency(item.unit_price)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-brand-dark">
                      {formatCurrency(item.total_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {quote.product_link ? (
            <a
              href={quote.product_link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-brand-cobalt hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Link del producto
            </a>
          ) : null}

          {quote.notes ? (
            <p className="mt-4 rounded-md bg-brand-surface px-3 py-2 text-xs text-brand-dark">{quote.notes}</p>
          ) : null}
        </div>
      </section>

      {quote.reference_image_url ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-brand-dark">Imagen de Referencia</h2>
          <div className="mt-3">
            <Image
              src={quote.reference_image_url}
              alt={`Imagen de referencia de ${quote.correlative}`}
              width={320}
              height={240}
              unoptimized
              className="rounded-md border border-slate-200 object-cover"
            />
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <QuoteTotalsPanel
          totals={{
            subtotalSinIva: quote.subtotal_sin_iva,
            ivaTotal: quote.iva_total,
            subtotalConIva: quote.subtotal_con_iva,
            retencionRenta: quote.retencion_renta,
            discount: quote.discount,
            total: quote.total,
          }}
          itemsCount={quote.items.length}
        />
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-brand-dark">Abonos y Saldo</h2>
          <div className="mt-3">
            <AbonosTable payments={quote.payments} />
          </div>
          <div className={`mt-4 flex items-center justify-between rounded-md px-4 py-3 ${saldo > 0 ? 'bg-amber-50' : 'bg-emerald-50'}`}>
            <span className={`text-xs font-semibold uppercase tracking-wide ${saldo > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              Saldo pendiente
            </span>
            <span className={`text-lg font-bold ${saldo > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {formatCurrency(saldo)}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-brand-dark">Acciones</h2>
        <div className="mt-3">
          <QuoteActions quote={quote} role={profile.role} />
        </div>
      </section>
    </div>
  );
}
