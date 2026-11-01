export const IVA_RATE = 0.13;
export const RETENCION_RENTA_RATE = 0.1;

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface QuoteItemInput {
  quantity: number;
  unitPrice: number;
}

export interface QuoteTotalsOptions {
  applyRenta: boolean;
  discount?: number;
}

export interface QuoteTotals {
  subtotalSinIva: number;
  ivaTotal: number;
  subtotalConIva: number;
  retencionRenta: number;
  discount: number;
  total: number;
}

export function calculateQuoteTotals(items: QuoteItemInput[], options: QuoteTotalsOptions): QuoteTotals {
  const bruto = round2(items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0));
  const subtotalConIva = round2(bruto);
  const subtotalSinIva = round2(subtotalConIva / (1 + IVA_RATE));
  const ivaTotal = round2(subtotalConIva - subtotalSinIva);
  const retencionRenta = options.applyRenta ? round2(subtotalSinIva * RETENCION_RENTA_RATE) : 0;
  const discount = round2(options.discount ?? 0);
  const total = round2(subtotalConIva - retencionRenta - discount);
  return { subtotalSinIva, ivaTotal, subtotalConIva, retencionRenta, discount, total };
}
