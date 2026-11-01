'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, Filter } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { formatCurrency, formatDate } from '@/lib/format';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Client, QuoteWithRelations } from '@/lib/types/database';

interface Filters {
  clientId: string;
  desde: string;
  hasta: string;
}

const EMPTY_FILTERS: Filters = { clientId: '', desde: '', hasta: '' };

interface PendientesReportProps {
  clients: Client[];
}

export function PendientesReport({ clients }: PendientesReportProps) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [quotes, setQuotes] = useState<QuoteWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (f: Filters) => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      let query = supabase
        .from('quotes')
        .select(
          `*,
          client:clients(*),
          items:quote_items(*),
          payments(*),
          assigned:profiles!quotes_assigned_to_fkey(id, user_code, full_name),
          creator:profiles!quotes_created_by_fkey(id, user_code, full_name)`
        )
        .eq('status', 'CREADO')
        .order('created_at', { ascending: false });
      if (f.clientId) query = query.eq('client_id', f.clientId);
      if (f.desde) query = query.gte('created_at', `${f.desde}T00:00:00`);
      if (f.hasta) query = query.lte('created_at', `${f.hasta}T23:59:59.999`);

      const { data, error: fetchError } = await query;
      if (fetchError) {
        setError('No se pudo cargar el reporte. Intente de nuevo.');
        return;
      }
      setQuotes((data as unknown as QuoteWithRelations[] | null) ?? []);
    } catch {
      setError('No se pudo conectar con Supabase. Verifique la configuración.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(applied);
  }, [applied, load]);

  const montoTotal = quotes.reduce((acc, quote) => acc + quote.total, 0);

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="grid grid-cols-1 gap-3 border-b border-slate-200 p-4 md:grid-cols-4">
        <Field label="Cliente" htmlFor="pendientes-cliente">
          <Select
            id="pendientes-cliente"
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
        <Field label="Desde" htmlFor="pendientes-desde">
          <Input id="pendientes-desde" type="date" value={filters.desde} onChange={(e) => setFilters({ ...filters, desde: e.target.value })} />
        </Field>
        <Field label="Hasta" htmlFor="pendientes-hasta">
          <Input id="pendientes-hasta" type="date" value={filters.hasta} onChange={(e) => setFilters({ ...filters, hasta: e.target.value })} />
        </Field>
        <div className="flex items-end">
          <Button onClick={() => setApplied({ ...filters })} className="w-full">
            <Filter className="h-4 w-4" aria-hidden />
            Aplicar
          </Button>
        </div>
      </div>

      {!loading && !error && quotes.length > 0 ? (
        <div className="flex flex-wrap gap-4 border-b border-slate-200 bg-brand-surface px-4 py-3">
          <p className="text-sm text-brand-muted">
            Cotizaciones pendientes: <span className="font-bold text-brand-navy">{quotes.length}</span>
          </p>
          <p className="text-sm text-brand-muted">
            Monto total cotizado: <span className="font-bold text-brand-navy">{formatCurrency(montoTotal)}</span>
          </p>
        </div>
      ) : null}

      <div className="p-4">
        {loading ? (
          <TableSkeleton rows={5} columns={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load(applied)} />
        ) : quotes.length === 0 ? (
          <EmptyState title="No hay cotizaciones pendientes" description="No se encontraron cotizaciones en estado CREADO con estos filtros." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-brand-surface text-left text-xs font-semibold uppercase tracking-wide text-brand-muted">
                  <th className="px-3 py-2">Correlativo</th>
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2">Creada</th>
                  <th className="px-3 py-2 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => (
                  <tr key={quote.id} className="border-b border-slate-100 last:border-0 hover:bg-brand-light">
                    <td className="whitespace-nowrap px-3 py-2 font-semibold text-brand-dark">{quote.correlative}</td>
                    <td className="px-3 py-2 text-brand-dark">{quote.client?.name ?? '-'}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-brand-dark">
                      {formatCurrency(quote.total)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-brand-muted">{formatDate(quote.created_at)}</td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/cotizaciones/${quote.id}`}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-muted transition-colors hover:bg-brand-surface hover:text-brand-dark"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden />
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
