'use client';

import { useCallback, useEffect, useState } from 'react';
import { Banknote, CreditCard, Filter, Landmark, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { PAYMENT_METHOD_LABELS } from '@/lib/constants';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Client, Payment, PaymentMethod, QuoteWithRelations } from '@/lib/types/database';

interface PaymentWithQuote extends Payment {
  quote: { correlative: string } | null;
}

interface Filters {
  clientId: string;
  desde: string;
  hasta: string;
}

const EMPTY_FILTERS: Filters = { clientId: '', desde: '', hasta: '' };

interface CerradasReportProps {
  clients: Client[];
}

export function CerradasReport({ clients }: CerradasReportProps) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [quotes, setQuotes] = useState<QuoteWithRelations[]>([]);
  const [payments, setPayments] = useState<PaymentWithQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (f: Filters) => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();

      let quotesQuery = supabase
        .from('quotes')
        .select(
          `*,
          client:clients(*),
          items:quote_items(*),
          payments(*),
          assigned:profiles!quotes_assigned_to_fkey(id, user_code, full_name),
          creator:profiles!quotes_created_by_fkey(id, user_code, full_name)`
        )
        .eq('status', 'CERRADO')
        .order('updated_at', { ascending: false });
      if (f.clientId) quotesQuery = quotesQuery.eq('client_id', f.clientId);
      if (f.desde) quotesQuery = quotesQuery.gte('updated_at', `${f.desde}T00:00:00`);
      if (f.hasta) quotesQuery = quotesQuery.lte('updated_at', `${f.hasta}T23:59:59.999`);

      let paymentsQuery = supabase
        .from('payments')
        .select(`*, profile:profiles(id, user_code, full_name), quote:quotes(correlative)`)
        .order('created_at', { ascending: false });
      if (f.desde) paymentsQuery = paymentsQuery.gte('created_at', `${f.desde}T00:00:00`);
      if (f.hasta) paymentsQuery = paymentsQuery.lte('created_at', `${f.hasta}T23:59:59.999`);

      const [quotesResult, paymentsResult] = await Promise.all([quotesQuery, paymentsQuery]);

      if (quotesResult.error || paymentsResult.error) {
        setError('No se pudo cargar el reporte. Intente de nuevo.');
        return;
      }

      const closedQuotes = (quotesResult.data as unknown as QuoteWithRelations[] | null) ?? [];
      const allPayments = (paymentsResult.data as unknown as PaymentWithQuote[] | null) ?? [];

      let filteredPayments = allPayments;
      if (f.clientId) {
        const closedIds = new Set(closedQuotes.map((quote) => quote.id));
        filteredPayments = allPayments.filter((payment) => closedIds.has(payment.quote_id));
      }

      setQuotes(closedQuotes);
      setPayments(filteredPayments);
    } catch {
      setError('No se pudo conectar con Supabase. Verifique la configuración.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(applied);
  }, [applied, load]);

  const totalsByMethod: Record<PaymentMethod, number> = { EFECTIVO: 0, TRANSFERENCIA: 0, TARJETA: 0 };
  for (const payment of payments) {
    totalsByMethod[payment.payment_method] += payment.amount;
  }
  const totalAbonos = totalsByMethod.EFECTIVO + totalsByMethod.TRANSFERENCIA + totalsByMethod.TARJETA;
  const totalFacturado = quotes.reduce((acc, quote) => acc + quote.total, 0);

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="grid grid-cols-1 gap-3 border-b border-slate-200 p-4 md:grid-cols-4">
          <Field label="Cliente" htmlFor="cerradas-cliente">
            <Select
              id="cerradas-cliente"
              value={filters.clientId}
              onChange={(e) => setFilters({ ...filters, clientId: e.target.value })}
            >
              <option value="">Todos</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Desde" htmlFor="cerradas-desde">
            <Input id="cerradas-desde" type="date" value={filters.desde} onChange={(e) => setFilters({ ...filters, desde: e.target.value })} />
          </Field>
          <Field label="Hasta" htmlFor="cerradas-hasta">
            <Input id="cerradas-hasta" type="date" value={filters.hasta} onChange={(e) => setFilters({ ...filters, hasta: e.target.value })} />
          </Field>
          <div className="flex items-end">
            <Button onClick={() => setApplied({ ...filters })} className="w-full">
              <Filter className="h-4 w-4" aria-hidden />
              Aplicar
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={5} columns={5} />
          </div>
        ) : error ? (
          <div className="p-4">
            <ErrorState message={error} onRetry={() => void load(applied)} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-5">
            <div className="rounded-md border border-slate-200 bg-brand-light p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Órdenes cerradas</p>
              <p className="mt-1 text-lg font-bold text-brand-navy">{quotes.length}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-brand-light p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Total facturado</p>
              <p className="mt-1 text-lg font-bold text-brand-navy">{formatCurrency(totalFacturado)}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-brand-light p-3">
              <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-brand-muted">
                <Banknote className="h-3 w-3" aria-hidden />
                Efectivo
              </p>
              <p className="mt-1 text-base font-bold text-brand-navy">{formatCurrency(totalsByMethod.EFECTIVO)}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-brand-light p-3">
              <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-brand-muted">
                <Landmark className="h-3 w-3" aria-hidden />
                Transferencia
              </p>
              <p className="mt-1 text-base font-bold text-brand-navy">{formatCurrency(totalsByMethod.TRANSFERENCIA)}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-brand-light p-3">
              <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-brand-muted">
                <CreditCard className="h-3 w-3" aria-hidden />
                Tarjeta
              </p>
              <p className="mt-1 text-base font-bold text-brand-navy">{formatCurrency(totalsByMethod.TARJETA)}</p>
            </div>
          </div>
        )}
      </div>

      {!loading && !error ? (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-brand-muted">
            <Wallet className="h-4 w-4 text-brand-cobalt" aria-hidden />
            Arqueo de caja: total de abonos recibidos en el período
          </p>
          <p className="text-lg font-bold text-brand-navy">{formatCurrency(totalAbonos)}</p>
        </div>
      ) : null}

      {!loading && !error && quotes.length === 0 && payments.length === 0 ? (
        <EmptyState
          title="Sin resultados"
          description="No hay órdenes cerradas ni abonos registrados en el período seleccionado."
        />
      ) : null}

      {!loading && !error && quotes.length > 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-brand-dark">Órdenes Cerradas e Historial de Facturas</h2>
          </div>
          <div className="overflow-x-auto p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-brand-surface text-left text-xs font-semibold uppercase tracking-wide text-brand-muted">
                  <th className="px-3 py-2">Correlativo</th>
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">Factura externa</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2">Fecha de cierre</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => (
                  <tr key={quote.id} className="border-b border-slate-100 last:border-0 hover:bg-brand-light">
                    <td className="whitespace-nowrap px-3 py-2 font-semibold text-brand-dark">{quote.correlative}</td>
                    <td className="px-3 py-2 text-brand-dark">{quote.client?.name ?? '-'}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs font-semibold text-emerald-700">
                      {quote.external_invoice_number ?? '-'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-brand-dark">
                      {formatCurrency(quote.total)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-brand-muted">{formatDateTime(quote.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {!loading && !error && payments.length > 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-brand-dark">Conciliación de Abonos Recibidos</h2>
          </div>
          <div className="overflow-x-auto p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-brand-surface text-left text-xs font-semibold uppercase tracking-wide text-brand-muted">
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">OT</th>
                  <th className="px-3 py-2">Método</th>
                  <th className="px-3 py-2 text-right">Monto</th>
                  <th className="px-3 py-2">Cajero</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-slate-100 last:border-0 hover:bg-brand-light">
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-brand-muted">
                      {formatDateTime(payment.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-semibold text-brand-dark">
                      {payment.quote?.correlative ?? '-'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-brand-dark">
                      {PAYMENT_METHOD_LABELS[payment.payment_method]}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-brand-dark">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-brand-muted">
                      {payment.profile?.user_code ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
