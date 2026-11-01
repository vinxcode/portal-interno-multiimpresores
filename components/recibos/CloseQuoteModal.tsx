'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CircleCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { cierreSchema } from '@/lib/schemas/cierre';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/format';
import type { QuoteWithRelations } from '@/lib/types/database';

interface CloseQuoteModalProps {
  open: boolean;
  quote: QuoteWithRelations | null;
  onClose: () => void;
}

export function CloseQuoteModal({ open, quote, onClose }: CloseQuoteModalProps) {
  const router = useRouter();
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quote) return;
    setErrors([]);

    const parsed = cierreSchema.safeParse({ quoteId: quote.id, externalInvoiceNumber: invoiceNumber });
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((issue) => issue.message));
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: rpcError } = await supabase.rpc('close_quote', {
        p_quote_id: quote.id,
        p_external_invoice_number: parsed.data.externalInvoiceNumber,
      });
      if (rpcError) {
        setErrors([rpcError.message]);
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setErrors(['No se pudo cerrar la orden. Intente de nuevo.']);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} title={`Cerrar Orden ${quote?.correlative ?? ''}`} onClose={loading ? () => undefined : onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="flex items-start gap-2 rounded-md bg-emerald-50 px-3 py-2">
          <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          <p className="text-xs text-emerald-800">
            La orden está liquidada a {formatCurrency(0)}. Al cerrar se registrará la factura externa y la OT pasará a
            estado CERRADO (terminal).
          </p>
        </div>

        <Field label="Número de Factura / CCF externa" htmlFor="external-invoice">
          <Input
            id="external-invoice"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="Ej. 00125A-1224 o CCF-0087"
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
            Cerrar Orden
          </Button>
        </div>
      </form>
    </Modal>
  );
}
