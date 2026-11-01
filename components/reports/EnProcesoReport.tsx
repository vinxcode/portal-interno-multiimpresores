'use client';

import { useCallback, useEffect, useState } from 'react';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { calculatePendingBalance } from '@/lib/abonos';
import { formatCurrency, formatDate } from '@/lib/format';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Client, Operario, QuoteWithRelations } from '@/lib/types/database';

interface Filters {
  operarioId: string;
  clientId: string;
  desde: string;
  hasta: string;
}

const EMPTY_FILTERS: Filters = { operarioId: '', clientId: '', desde: '', hasta: '' };

interface EnProcesoReportProps {
  operarios: Operario[];
  clients: Client[];
}

export function EnProcesoReport({ operarios, clients }: EnProcesoReportProps) {
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
        .in('status', ['APROBADO', 'EN_PROCESO', 'COMPLETADO'])
        .order('created_at', { ascending: false });
      if (f.clientId) query = query.eq('client_id', f.clientId);
      if (f.operarioId) query = query.eq('assigned_to', f.operarioId);
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

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="grid grid-cols-1 gap-3 border-b border-slate-200 p-4 md:grid-cols-5">
        <Field label="Operario" htmlFor="proceso-operario">
          <Select
            id="proceso-operario"
            value={filters.operarioId}
            onChange={(e) => setFilters({ ...filters, operarioId: e.target.value })}
          >
            <option value="">Todos</option>
            {operarios.map((operario) => (
              <option key={operario.id} value={operario.id}>
                {operario.user_code} - {operario.full_name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Cliente" htmlFor="proceso-cliente">
          <Select
            id="proceso-cliente"
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
        <Field label="Desde" htmlFor="proceso-desde">
          <Input id="proceso-desde" type="date" value={filters.desde} onChange={(e) => setFilters({ ...filters, desde: e.target.value })} />
        </Field>
        <Field label="Hasta" htmlFor="proceso-hasta">
          <Input id="proceso-hasta" type="date" value={filters.hasta} onChange={(e) => setFilters({ ...filters, hasta: e.target.value })} />
        </Field>
        <div className="flex items-end">
          <Button onClick={() => setApplied({ ...filters })} className="w-full">
            <Filter className="h-4 w-4" aria-hidden />
            Aplicar
          </Button>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load(applied)} />
        ) : quotes.length === 0 ? (
          <EmptyState title="No hay trabajos en proceso" description="No se encontraron OT aprobadas, en proceso o completadas con estos filtros." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-brand-surface text-left text-xs font-semibold uppercase tracking-wide text-brand-muted">
                  <th className="px-3 py-2">Correlativo</th>
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Operario</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-right">Saldo</th>
                  <th className="px-3 py-2">Creada</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => {
                  const saldo = calculatePendingBalance(
                    quote.total,
                    quote.payments.map((payment) => payment.amount)
                  );
                  return (
                    <tr key={quote.id} className="border-b border-slate-100 last:border-0 hover:bg-brand-light">
                      <td className="whitespace-nowrap px-3 py-2 font-semibold text-brand-dark">{quote.correlative}</td>
                      <td className="px-3 py-2 text-brand-dark">{quote.client?.name ?? '-'}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={quote.status} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-brand-muted">
                        {quote.assigned ? `${quote.assigned.user_code} - ${quote.assigned.full_name}` : 'Sin asignar'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-brand-dark">
                        {formatCurrency(quote.total)}
                      </td>
                      <td className={`whitespace-nowrap px-3 py-2 text-right font-semibold ${saldo > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {formatCurrency(saldo)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-brand-muted">{formatDate(quote.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
