'use client';

import { Banknote, CreditCard, Landmark, Pencil, Trash2 } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { PAYMENT_METHOD_LABELS } from '@/lib/constants';
import type { Payment, PaymentMethod } from '@/lib/types/database';

const METHOD_ICONS: Record<PaymentMethod, typeof Banknote> = {
  EFECTIVO: Banknote,
  TRANSFERENCIA: Landmark,
  TARJETA: CreditCard,
};

interface AbonosTableProps {
  payments: Payment[];
  onEdit?: (payment: Payment) => void;
  onDelete?: (payment: Payment) => void;
}

export function AbonosTable({ payments, onEdit, onDelete }: AbonosTableProps) {
  if (payments.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-brand-muted">
        No hay abonos registrados para esta orden.
      </p>
    );
  }

  const totalAbonado = payments.reduce((acc, payment) => acc + payment.amount, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-brand-surface text-left text-xs font-semibold uppercase tracking-wide text-brand-muted">
            <th className="px-3 py-2">Fecha</th>
            <th className="px-3 py-2">Método</th>
            <th className="px-3 py-2 text-right">Monto</th>
            <th className="px-3 py-2">Observación</th>
            <th className="px-3 py-2">Cajero</th>
            {onEdit || onDelete ? <th className="px-3 py-2 text-right">Acciones</th> : null}
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => {
            const MethodIcon = METHOD_ICONS[payment.payment_method];
            return (
              <tr key={payment.id} className="border-b border-slate-100 last:border-0 hover:bg-brand-light">
                <td className="whitespace-nowrap px-3 py-2 text-xs text-brand-dark">{formatDateTime(payment.created_at)}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 text-xs text-brand-dark">
                    <MethodIcon className="h-3.5 w-3.5 text-brand-muted" aria-hidden />
                    {PAYMENT_METHOD_LABELS[payment.payment_method]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-brand-dark">
                  {formatCurrency(payment.amount)}
                </td>
                <td className="max-w-40 px-3 py-2 text-xs text-brand-muted">{payment.observation ?? '-'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-brand-muted">
                  {payment.profile?.user_code ?? '-'}
                </td>
                {onEdit || onDelete ? (
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <span className="inline-flex gap-1">
                      {onEdit ? (
                        <button
                          type="button"
                          onClick={() => onEdit(payment)}
                          className="rounded p-1 text-brand-muted transition-colors hover:bg-brand-surface hover:text-brand-dark"
                          aria-label="Editar abono"
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </button>
                      ) : null}
                      {onDelete ? (
                        <button
                          type="button"
                          onClick={() => onDelete(payment)}
                          className="rounded p-1 text-brand-muted transition-colors hover:bg-red-50 hover:text-red-600"
                          aria-label="Eliminar abono"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      ) : null}
                    </span>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200">
            <td colSpan={2} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-brand-muted">
              Total abonado
            </td>
            <td className="px-3 py-2 text-right font-bold text-brand-navy">{formatCurrency(totalAbonado)}</td>
            <td colSpan={onEdit || onDelete ? 3 : 2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
