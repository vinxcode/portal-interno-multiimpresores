'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/Field';
import { StatusBadge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/states';
import { useQuoteStore } from '@/store/quoteStore';
import { calculatePendingBalance } from '@/lib/abonos';
import { formatCurrency, formatDate } from '@/lib/format';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { QuoteWithRelations } from '@/lib/types/database';

interface QuoteHistoryListProps {
  quotes: QuoteWithRelations[];
  canManageQuotes: boolean;
  canDelete: boolean;
}

export function QuoteHistoryList({ quotes, canManageQuotes, canDelete }: QuoteHistoryListProps) {
  const router = useRouter();
  const [correlativeFilter, setCorrelativeFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<QuoteWithRelations | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const correlative = correlativeFilter.trim().toLowerCase();
    const client = clientFilter.trim().toLowerCase();
    return quotes.filter((quote) => {
      if (correlative && !quote.correlative.toLowerCase().includes(correlative)) return false;
      if (client && !(quote.client?.name ?? '').toLowerCase().includes(client)) return false;
      if (dateFilter && !quote.created_at.startsWith(dateFilter)) return false;
      return true;
    });
  }, [quotes, correlativeFilter, clientFilter, dateFilter]);

  const canEditQuote = (quote: QuoteWithRelations) =>
    canManageQuotes && (quote.status === 'CREADO' || quote.status === 'RECHAZADO') && quote.payments.length === 0;

  const canDeleteQuote = (quote: QuoteWithRelations) => canDelete && quote.payments.length === 0;

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: rpcError } = await supabase.rpc('delete_quote', { p_quote_id: deleteTarget.id });
      if (rpcError) {
        setError(rpcError.message);
        return;
      }
      setDeleteTarget(null);
      router.refresh();
    } catch {
      setError('No se pudo eliminar la cotización. Intente de nuevo.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-brand-dark">Historial de Cotizaciones</h2>
      </div>

      <div className="grid grid-cols-3 gap-2 border-b border-slate-100 px-4 py-3">
        <Input
          value={correlativeFilter}
          onChange={(e) => setCorrelativeFilter(e.target.value)}
          placeholder="Correlativo"
          aria-label="Filtrar por correlativo"
        />
        <Input
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          placeholder="Cliente"
          aria-label="Filtrar por cliente"
        />
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          aria-label="Filtrar por fecha"
        />
      </div>

      {error ? (
        <p className="mx-4 mt-3 rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="max-h-[720px] divide-y divide-slate-100 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title={quotes.length === 0 ? 'No hay cotizaciones registradas' : 'Sin resultados'}
              description={
                quotes.length === 0 ? 'Las cotizaciones creadas aparecerán aquí.' : 'Ajuste los filtros de búsqueda.'
              }
            />
          </div>
        ) : (
          filtered.map((quote) => {
            const saldo = calculatePendingBalance(
              quote.total,
              quote.payments.map((payment) => payment.amount)
            );
            return (
              <article key={quote.id} className="rounded-md p-3 transition-colors hover:bg-brand-light">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-brand-dark">{quote.correlative}</span>
                  <StatusBadge status={quote.status} />
                </div>
                <p className="mt-0.5 truncate text-xs text-brand-muted">{quote.client?.name ?? 'Sin cliente'}</p>
                <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                  <span className="text-brand-muted">{formatDate(quote.created_at)}</span>
                  <span className="text-brand-muted">
                    Total <span className="font-semibold text-brand-dark">{formatCurrency(quote.total)}</span>
                    {' / '}
                    Saldo{' '}
                    <span className={`font-semibold ${saldo > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {formatCurrency(saldo)}
                    </span>
                  </span>
                </div>
                <div className="mt-2 flex justify-end gap-1">
                  <Link
                    href={`/cotizaciones/${quote.id}`}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-muted transition-colors hover:bg-brand-surface hover:text-brand-dark"
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                    Ver
                  </Link>
                  {canEditQuote(quote) ? (
                    <button
                      type="button"
                      onClick={() => useQuoteStore.getState().loadQuote(quote)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-muted transition-colors hover:bg-brand-surface hover:text-brand-dark"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      Cargar
                    </button>
                  ) : null}
                  {canDeleteQuote(quote) ? (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(quote)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-muted transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      Eliminar
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar Cotización"
        message={`Se eliminará la cotización ${deleteTarget?.correlative ?? ''} y todos sus ítems. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  );
}
