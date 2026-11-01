'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { CircleCheck, Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { abonoSchema } from '@/lib/schemas/abono';
import { calculatePendingBalance, validateNewAbono } from '@/lib/abonos';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/format';
import { PAYMENT_METHOD_LABELS } from '@/lib/constants';
import type { Payment, PaymentMethod, QuoteWithRelations } from '@/lib/types/database';

interface AbonosModalProps {
  open: boolean;
  onClose: () => void;
  quote: QuoteWithRelations;
  editingPayment: Payment | null;
  onSaved: () => void;
  onPrint?: () => void;
}

export function AbonosModal({ open, onClose, quote, editingPayment, onSaved, onPrint }: AbonosModalProps) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('EFECTIVO');
  const [observation, setObservation] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [savedAmount, setSavedAmount] = useState<number | null>(null);

  const isEditing = editingPayment !== null;

  useEffect(() => {
    if (open) {
      setAmount(editingPayment ? String(editingPayment.amount) : '');
      setPaymentMethod(editingPayment ? editingPayment.payment_method : 'EFECTIVO');
      setObservation(editingPayment?.observation ?? '');
      setErrors([]);
      setSavedAmount(null);
      setLoading(false);
    }
  }, [open, editingPayment]);

  const otherAmounts = quote.payments
    .filter((payment) => payment.id !== editingPayment?.id)
    .map((payment) => payment.amount);
  const saldoDisponible = calculatePendingBalance(quote.total, otherAmounts);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors([]);

    const numericAmount = Number(amount);
    const parsed = abonoSchema.safeParse({
      quoteId: quote.id,
      amount: numericAmount,
      paymentMethod,
      observation: observation.trim() === '' ? undefined : observation.trim(),
    });

    if (!parsed.success) {
      setErrors(parsed.error.issues.map((issue) => issue.message));
      return;
    }

    if (!validateNewAbono(quote.total, otherAmounts, numericAmount)) {
      setErrors([`El monto supera el saldo disponible (${formatCurrency(saldoDisponible)}).`]);
      return;
    }

    const cleanObservation = observation.trim() === '' ? null : observation.trim();

    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: rpcError } = isEditing
        ? await supabase.rpc('modify_abono', {
            p_payment_id: editingPayment.id,
            p_amount: numericAmount,
            p_payment_method: paymentMethod,
            p_observation: cleanObservation,
          })
        : await supabase.rpc('register_abono', {
            p_quote_id: quote.id,
            p_amount: numericAmount,
            p_payment_method: paymentMethod,
            p_observation: cleanObservation,
          });

      if (rpcError) {
        setErrors([rpcError.message]);
        return;
      }

      onSaved();
      if (isEditing) {
        onClose();
      } else {
        setSavedAmount(numericAmount);
      }
    } catch {
      setErrors(['No se pudo registrar el abono. Intente de nuevo.']);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      title={isEditing ? `Editar Abono - ${quote.correlative}` : `Registrar Abono - ${quote.correlative}`}
      onClose={loading ? () => undefined : onClose}
    >
      {savedAmount !== null ? (
        <div className="space-y-4 text-center">
          <CircleCheck className="mx-auto h-10 w-10 text-emerald-600" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-brand-dark">
              Abono de {formatCurrency(savedAmount)} registrado correctamente.
            </p>
            <p className="mt-1 text-xs text-brand-muted">El saldo pendiente fue actualizado de forma atómica.</p>
          </div>
          <div className="flex justify-center gap-2">
            {onPrint ? (
              <Button onClick={onPrint}>
                <Printer className="h-4 w-4" aria-hidden />
                Imprimir Ticket
              </Button>
            ) : null}
            <Button variant="secondary" onClick={onClose}>
              Listo
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="flex items-center justify-between rounded-md bg-brand-surface px-3 py-2 text-sm">
            <span className="text-brand-muted">Saldo disponible</span>
            <span className="font-bold text-brand-navy">{formatCurrency(saldoDisponible)}</span>
          </div>

          <Field label="Monto del abono" htmlFor="abono-amount" hint={`Maximo: ${formatCurrency(saldoDisponible)}`}>
            <div className="flex gap-2">
              <Input
                id="abono-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                disabled={loading}
              />
              {!isEditing ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setAmount(String(saldoDisponible))}
                  disabled={loading || saldoDisponible <= 0}
                >
                  Liquidar todo
                </Button>
              ) : null}
            </div>
          </Field>

          <Field label="Método de pago" htmlFor="abono-method">
            <Select
              id="abono-method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              disabled={loading}
            >
              {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_METHOD_LABELS[method]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Observación" htmlFor="abono-observation">
            <Textarea
              id="abono-observation"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Ej. Abono inicial contra la OT 002-2026"
              disabled={loading}
            />
          </Field>

          {errors.length > 0 ? (
            <div className="rounded-md bg-red-50 px-3 py-2" role="alert">
              {errors.map((message) => (
                <p key={message} className="text-xs font-medium text-red-700">
                  {message}
                </p>
              ))}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              {isEditing ? 'Guardar Cambios' : 'Registrar Abono'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
