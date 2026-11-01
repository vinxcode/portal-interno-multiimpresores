'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircleCheck, Plus, Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/states';
import { QuoteTotalsPanel } from '@/components/cotizador/QuoteTotalsPanel';
import { POSTicketPrinter } from '@/components/tickets/POSTicketPrinter';
import { useRecibosStore } from '@/store/recibosStore';
import { AbonosModal } from './AbonosModal';
import { AbonosTable } from './AbonosTable';
import { CloseQuoteModal } from './CloseQuoteModal';
import { canCloseQuotes, canDeleteAbonos, canModifyAbono, canRegisterAbonos } from '@/lib/auth/roles';
import { calculatePendingBalance } from '@/lib/abonos';
import { formatCurrency, formatDate } from '@/lib/format';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Payment, Profile, QuoteWithRelations } from '@/lib/types/database';

interface RecibosViewProps {
  quotes: QuoteWithRelations[];
  profile: Profile;
  initialQuoteId: string | null;
}

export function RecibosView({ quotes, profile, initialQuoteId }: RecibosViewProps) {
  const router = useRouter();
  const selectedQuoteId = useRecibosStore((s) => s.selectedQuoteId);
  const selectQuote = useRecibosStore((s) => s.selectQuote);

  const activeQuote = useMemo(
    () =>
      quotes.find((quote) => quote.id === selectedQuoteId) ??
      quotes.find((quote) => quote.id === initialQuoteId) ??
      quotes[0] ??
      null,
    [quotes, selectedQuoteId, initialQuoteId]
  );

  const [abonoOpen, setAbonoOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saldo =
    activeQuote !== null
      ? calculatePendingBalance(
          activeQuote.total,
          activeQuote.payments.map((payment) => payment.amount)
        )
      : 0;

  const totalAbonado = activeQuote?.payments.reduce((acc, payment) => acc + payment.amount, 0) ?? 0;

  const canRegister =
    activeQuote !== null &&
    canRegisterAbonos(profile.role) &&
    activeQuote.status !== 'CERRADO' &&
    activeQuote.status !== 'RECHAZADO';

  const canClose =
    activeQuote !== null && activeQuote.status === 'COMPLETADO' && saldo === 0 && canCloseQuotes(profile.role);

  async function handleDeletePayment() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: rpcError } = await supabase.rpc('delete_abono', { p_payment_id: deleteTarget.id });
      if (rpcError) {
        setError(rpcError.message);
        return;
      }
      setDeleteTarget(null);
      router.refresh();
    } catch {
      setError('No se pudo eliminar el abono. Intente de nuevo.');
    } finally {
      setDeleting(false);
    }
  }

  if (!activeQuote) {
    return (
      <EmptyState
        title="No hay órdenes para administrar recibos"
        description="Cree una cotización primero; aquí podrá registrar abonos y generar tickets POS."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-brand-navy">{activeQuote.correlative}</h2>
                <StatusBadge status={activeQuote.status} />
              </div>
              <p className="mt-1 text-sm font-medium text-brand-dark">
                {activeQuote.client?.name ?? 'Sin cliente'}
              </p>
              <p className="text-xs text-brand-muted">NIT/NRC/DUI: {activeQuote.client?.doc_id ?? '-'}</p>
              {activeQuote.assigned ? (
                <p className="text-xs text-brand-muted">Operario: {activeQuote.assigned.user_code} - {activeQuote.assigned.full_name}</p>
              ) : null}
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Total de la orden</p>
              <p className="text-lg font-bold text-brand-navy">{formatCurrency(activeQuote.total)}</p>
              <p className="text-xs text-brand-muted">
                Abonado: <span className="font-semibold text-brand-dark">{formatCurrency(totalAbonado)}</span>
              </p>
            </div>
          </div>

          <div
            className={`mt-4 flex items-center justify-between rounded-md px-4 py-3 ${saldo > 0 ? 'bg-amber-50' : 'bg-emerald-50'}`}
          >
            <span
              className={`text-xs font-semibold uppercase tracking-wide ${saldo > 0 ? 'text-amber-700' : 'text-emerald-700'}`}
            >
              Saldo pendiente
            </span>
            <span className={`text-xl font-bold ${saldo > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {formatCurrency(saldo)}
            </span>
          </div>

          {activeQuote.external_invoice_number ? (
            <p className="mt-3 rounded-md bg-brand-surface px-3 py-2 text-xs text-brand-dark">
              Orden CERRADA con factura externa:{' '}
              <span className="font-semibold text-emerald-700">{activeQuote.external_invoice_number}</span>
            </p>
          ) : null}

          {error ? (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
            <Button
              onClick={() => {
                setEditingPayment(null);
                setAbonoOpen(true);
              }}
              disabled={!canRegister}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Registrar Abono
            </Button>
            <Button variant="secondary" onClick={() => setTicketOpen(true)}>
              <Printer className="h-4 w-4" aria-hidden />
              Imprimir Ticket
            </Button>
            {canClose ? (
              <Button onClick={() => setCloseOpen(true)}>
                <CircleCheck className="h-4 w-4" aria-hidden />
                Cerrar Orden
              </Button>
            ) : null}
          </div>
        </section>

        <QuoteTotalsPanel
          totals={{
            subtotalSinIva: activeQuote.subtotal_sin_iva,
            ivaTotal: activeQuote.iva_total,
            subtotalConIva: activeQuote.subtotal_con_iva,
            retencionRenta: activeQuote.retencion_renta,
            discount: activeQuote.discount,
            total: activeQuote.total,
          }}
          itemsCount={activeQuote.items.length}
        />

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-brand-dark">Abonos Realizados</h2>
          <div className="mt-3">
            <AbonosTable
              payments={activeQuote.payments}
              onEdit={
                activeQuote.status === 'CERRADO'
                  ? undefined
                  : (payment) => {
                      if (canModifyAbono(profile.role, payment.created_by, profile.id)) {
                        setEditingPayment(payment);
                        setAbonoOpen(true);
                      }
                    }
              }
              onDelete={
                activeQuote.status === 'CERRADO' || !canDeleteAbonos(profile.role)
                  ? undefined
                  : (payment) => setDeleteTarget(payment)
              }
            />
          </div>
        </section>
      </div>

      <aside className="h-fit rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-brand-dark">Últimos Recibos</h2>
          <p className="text-xs text-brand-muted">Seleccione una orden para administrar sus pagos.</p>
        </div>
        <div className="max-h-[720px] divide-y divide-slate-100 overflow-y-auto p-2">
          {quotes.map((quote) => {
            const abonado = quote.payments.reduce((acc, payment) => acc + payment.amount, 0);
            const quoteSaldo = calculatePendingBalance(
              quote.total,
              quote.payments.map((payment) => payment.amount)
            );
            const active = quote.id === activeQuote.id;
            return (
              <button
                key={quote.id}
                type="button"
                onClick={() => selectQuote(quote.id)}
                className={`w-full rounded-md p-3 text-left transition-colors ${
                  active ? 'bg-blue-50 ring-1 ring-brand-cobalt' : 'hover:bg-brand-light'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-brand-dark">{quote.correlative}</span>
                  <StatusBadge status={quote.status} />
                </div>
                <p className="mt-0.5 truncate text-xs text-brand-muted">{quote.client?.name ?? 'Sin cliente'}</p>
                <div className="mt-1 flex justify-between gap-2 text-xs text-brand-muted">
                  <span>
                    Abonado <span className="font-semibold text-brand-dark">{formatCurrency(abonado)}</span>
                  </span>
                  <span>
                    Saldo{' '}
                    <span className={`font-semibold ${quoteSaldo > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {formatCurrency(quoteSaldo)}
                    </span>
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-brand-muted">{formatDate(quote.created_at)}</p>
              </button>
            );
          })}
        </div>
      </aside>

      <AbonosModal
        open={abonoOpen}
        onClose={() => {
          setAbonoOpen(false);
          setEditingPayment(null);
        }}
        quote={activeQuote}
        editingPayment={editingPayment}
        onSaved={() => router.refresh()}
        onPrint={() => {
          setAbonoOpen(false);
          setEditingPayment(null);
          setTicketOpen(true);
        }}
      />

      <POSTicketPrinter
        open={ticketOpen}
        onClose={() => setTicketOpen(false)}
        quote={activeQuote}
        profile={profile}
      />

      <CloseQuoteModal open={closeOpen} quote={activeQuote} onClose={() => setCloseOpen(false)} />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar Abono"
        message={`Se eliminará el abono de ${formatCurrency(deleteTarget?.amount ?? 0)}. El saldo pendiente aumentará en ese monto.`}
        confirmLabel="Eliminar"
        loading={deleting}
        onConfirm={() => void handleDeletePayment()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
