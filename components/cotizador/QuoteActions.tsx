'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircleCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CloseQuoteModal } from '@/components/recibos/CloseQuoteModal';
import { canCloseQuotes, canDeleteQuotes, canManageQuotes } from '@/lib/auth/roles';
import { calculatePendingBalance } from '@/lib/abonos';
import { formatCurrency } from '@/lib/format';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { QuoteStatus, QuoteWithRelations, Role } from '@/lib/types/database';

const TRANSITIONS: Partial<Record<QuoteStatus, { next: QuoteStatus; label: string }[]>> = {
  CREADO: [
    { next: 'APROBADO', label: 'Convertir a OT' },
    { next: 'RECHAZADO', label: 'Rechazar' },
  ],
  RECHAZADO: [{ next: 'CREADO', label: 'Reactivar' }],
  APROBADO: [{ next: 'EN_PROCESO', label: 'Iniciar Proceso' }],
  EN_PROCESO: [{ next: 'COMPLETADO', label: 'Marcar Completado' }],
};

interface QuoteActionsProps {
  quote: QuoteWithRelations;
  role: Role;
}

export function QuoteActions({ quote, role }: QuoteActionsProps) {
  const router = useRouter();
  const [loadingStatus, setLoadingStatus] = useState<QuoteStatus | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const manage = canManageQuotes(role);
  const saldo = calculatePendingBalance(
    quote.total,
    quote.payments.map((payment) => payment.amount)
  );
  const canClose = quote.status === 'COMPLETADO' && saldo === 0 && canCloseQuotes(role);
  const canDelete = canDeleteQuotes(role) && quote.payments.length === 0;
  const transitions = manage ? (TRANSITIONS[quote.status] ?? []) : [];

  async function changeStatus(next: QuoteStatus) {
    setLoadingStatus(next);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: rpcError } = await supabase.rpc('change_quote_status', {
        p_quote_id: quote.id,
        p_new_status: next,
      });
      if (rpcError) {
        setError(rpcError.message);
        return;
      }
      router.refresh();
    } catch {
      setError('No se pudo cambiar el estado. Intente de nuevo.');
    } finally {
      setLoadingStatus(null);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: rpcError } = await supabase.rpc('delete_quote', { p_quote_id: quote.id });
      if (rpcError) {
        setError(rpcError.message);
        setDeleting(false);
        return;
      }
      router.replace('/cotizaciones');
      router.refresh();
    } catch {
      setError('No se pudo eliminar la cotización.');
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {transitions.map((transition) => (
          <Button
            key={transition.next}
            onClick={() => void changeStatus(transition.next)}
            loading={loadingStatus === transition.next}
            disabled={loadingStatus !== null}
          >
            {transition.label}
          </Button>
        ))}
        {canClose ? (
          <Button onClick={() => setCloseOpen(true)}>
            <CircleCheck className="h-4 w-4" aria-hidden />
            Cerrar Orden (liquidada)
          </Button>
        ) : null}
        {canDelete ? (
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" aria-hidden />
            Eliminar
          </Button>
        ) : null}
        {transitions.length === 0 && !canClose && !canDelete ? (
          <p className="text-xs text-brand-muted">
            No hay acciones disponibles para su rol en el estado actual de la orden.
          </p>
        ) : null}
      </div>

      {quote.status === 'COMPLETADO' && saldo > 0 ? (
        <p className="text-xs text-amber-700">
          La orden debe liquidarse a $0.00 (saldo pendiente: {formatCurrency(saldo)}) antes de poder cerrarse.
        </p>
      ) : null}

      <CloseQuoteModal open={closeOpen} quote={quote} onClose={() => setCloseOpen(false)} />

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar Cotización"
        message={`Se eliminará la cotización ${quote.correlative} y todos sus ítems. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
