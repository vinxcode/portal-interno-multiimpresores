import type { QuoteTotals } from '@/lib/financial';
import { formatCurrency } from '@/lib/format';

interface QuoteTotalsPanelProps {
  totals: QuoteTotals;
  itemsCount: number;
}

export function QuoteTotalsPanel({ totals, itemsCount }: QuoteTotalsPanelProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-brand-light p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Desglose ({itemsCount} ítems)</h3>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-brand-muted">Sub-Total sin IVA</dt>
          <dd className="font-semibold text-brand-dark">{formatCurrency(totals.subtotalSinIva)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-brand-muted">IVA (13%)</dt>
          <dd className="font-semibold text-brand-dark">{formatCurrency(totals.ivaTotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-brand-muted">Sub-Total con IVA</dt>
          <dd className="font-semibold text-brand-dark">{formatCurrency(totals.subtotalConIva)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-brand-muted">Retención Renta (10%)</dt>
          <dd className="font-semibold text-brand-dark">-{formatCurrency(totals.retencionRenta)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-brand-muted">Descuento</dt>
          <dd className="font-semibold text-brand-dark">-{formatCurrency(totals.discount)}</dd>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-slate-300 pt-2">
          <dt className="font-bold text-brand-navy">TOTAL</dt>
          <dd className="text-base font-bold text-brand-navy">{formatCurrency(totals.total)}</dd>
        </div>
      </dl>
    </div>
  );
}
