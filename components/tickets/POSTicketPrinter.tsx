'use client';

import { useEffect } from 'react';
import { FileDown, Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BUSINESS, PAYMENT_METHOD_LABELS } from '@/lib/constants';
import { calculatePendingBalance } from '@/lib/abonos';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import type { Profile, QuoteWithRelations } from '@/lib/types/database';

interface POSTicketPrinterProps {
  open: boolean;
  onClose: () => void;
  quote: QuoteWithRelations;
  profile: Profile;
}

export function POSTicketPrinter({ open, onClose, quote, profile }: POSTicketPrinterProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const payments = [...quote.payments].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const totalAbonado = payments.reduce((acc, payment) => acc + payment.amount, 0);
  const saldo = calculatePendingBalance(
    quote.total,
    payments.map((payment) => payment.amount)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-dark/50 p-4 print:static print:overflow-visible print:bg-transparent"
      role="dialog"
      aria-modal="true"
      aria-label="Ticket POS 80mm"
    >
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl print:max-w-none print:rounded-none print:shadow-none">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 print:hidden">
          <h2 className="text-base font-semibold text-brand-dark">Ticket POS 80mm</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-brand-muted transition-colors hover:bg-brand-surface hover:text-brand-dark"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex justify-center bg-brand-surface p-4 print:bg-white print:p-0">
          <div id="pos-ticket" className="bg-white p-3 font-mono text-[11px] leading-snug text-black" style={{ width: '80mm' }}>
            <div className="text-center">
              <p className="text-[13px] font-bold">{BUSINESS.name}</p>
              <p>{BUSINESS.tagline}</p>
              <p>{BUSINESS.address}</p>
              <p>Tel: {BUSINESS.phone}</p>
            </div>

            <div className="my-2 border-t border-dashed border-black" />

            <p className="text-center font-bold">RECIBO DE ABONO</p>
            <div className="flex justify-between">
              <span>OT: {quote.correlative}</span>
              <span>{formatDateTime(new Date().toISOString())}</span>
            </div>
            <p>Cliente: {quote.client?.name ?? '-'}</p>
            <p>Doc: {quote.client?.doc_id ?? '-'}</p>
            <p>Atendido por: {profile.user_code}</p>

            <div className="my-2 border-t border-dashed border-black" />

            <p className="font-bold">DETALLE DE SERVICIOS</p>
            {quote.items.map((item) => (
              <div key={item.id} className="mb-1">
                <p>{item.detail}</p>
                <p className="flex justify-between">
                  <span>
                    {item.quantity} x {formatCurrency(item.unit_price)}
                  </span>
                  <span>{formatCurrency(item.total_price)}</span>
                </p>
              </div>
            ))}

            <div className="my-2 border-t border-dashed border-black" />

            <div className="flex justify-between">
              <span>SUB-TOTAL sin IVA</span>
              <span>{formatCurrency(quote.subtotal_sin_iva)}</span>
            </div>
            <div className="flex justify-between">
              <span>IVA 13%</span>
              <span>{formatCurrency(quote.iva_total)}</span>
            </div>
            <div className="flex justify-between">
              <span>SUB-TOTAL con IVA</span>
              <span>{formatCurrency(quote.subtotal_con_iva)}</span>
            </div>
            {quote.retencion_renta > 0 ? (
              <div className="flex justify-between">
                <span>RETENCIÓN RENTA 10%</span>
                <span>-{formatCurrency(quote.retencion_renta)}</span>
              </div>
            ) : null}
            {quote.discount > 0 ? (
              <div className="flex justify-between">
                <span>DESCUENTO</span>
                <span>-{formatCurrency(quote.discount)}</span>
              </div>
            ) : null}
            <div className="flex justify-between font-bold">
              <span>TOTAL</span>
              <span>{formatCurrency(quote.total)}</span>
            </div>

            <div className="my-2 border-t border-dashed border-black" />

            <p className="font-bold">ABONOS RECIBIDOS</p>
            {payments.map((payment) => (
              <div key={payment.id} className="flex justify-between">
                <span>
                  {formatDate(payment.created_at)} {PAYMENT_METHOD_LABELS[payment.payment_method]}
                </span>
                <span>{formatCurrency(payment.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold">
              <span>TOTAL ABONADO</span>
              <span>{formatCurrency(totalAbonado)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>SALDO PENDIENTE</span>
              <span>{formatCurrency(saldo)}</span>
            </div>

            <div className="my-2 border-t border-dashed border-black" />

            <p className="text-center font-bold">{BUSINESS.taxLegend}</p>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4 print:hidden">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <FileDown className="h-4 w-4" aria-hidden />
            Exportar a PDF
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden />
            Imprimir Ticket
          </Button>
        </div>
      </div>
    </div>
  );
}
