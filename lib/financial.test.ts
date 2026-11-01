import { describe, it, expect } from 'vitest';
import { calculateQuoteTotals, round2 } from './financial';

describe('Cálculos Financieros de Cotización', () => {
  it('debe desglosar correctamente el IVA (13%) incluido en los precios', () => {
    const items = [{ quantity: 200, unitPrice: 6.75 }]; // Bruto con IVA incluido: $1350.00
    const result = calculateQuoteTotals(items, { applyRenta: false, discount: 0 });

    expect(result.subtotalSinIva).toBeCloseTo(1194.69, 2);
    expect(result.ivaTotal).toBeCloseTo(155.31, 2);
    expect(result.subtotalConIva).toBeCloseTo(1350.00, 2);
    expect(result.total).toBeCloseTo(1350.00, 2);
  });

  it('debe descontar correctamente la Retención de Renta del 10% sobre el subtotal sin IVA', () => {
    const items = [{ quantity: 1, unitPrice: 1000.00 }]; // Bruto con IVA incluido: $1000.00
    const result = calculateQuoteTotals(items, { applyRenta: true, discount: 0 });

    expect(result.subtotalSinIva).toBeCloseTo(884.96, 2);
    expect(result.ivaTotal).toBeCloseTo(115.04, 2);
    expect(result.subtotalConIva).toBeCloseTo(1000.00, 2);
    expect(result.retencionRenta).toBeCloseTo(88.50, 2);
    expect(result.total).toBeCloseTo(911.50, 2);
  });

  it('debe sumar múltiples ítems antes de desglosar impuestos', () => {
    const items = [
      { quantity: 100, unitPrice: 1.13 },
      { quantity: 2, unitPrice: 56.5 },
    ];
    const result = calculateQuoteTotals(items, { applyRenta: false, discount: 0 });

    expect(result.subtotalConIva).toBeCloseTo(226.0, 2);
    expect(result.subtotalSinIva).toBeCloseTo(200.0, 2);
    expect(result.ivaTotal).toBeCloseTo(26.0, 2);
  });

  it('debe aplicar el descuento como monto directo sobre el total', () => {
    const items = [{ quantity: 1, unitPrice: 113.0 }];
    const result = calculateQuoteTotals(items, { applyRenta: false, discount: 13.0 });

    expect(result.subtotalConIva).toBeCloseTo(113.0, 2);
    expect(result.discount).toBeCloseTo(13.0, 2);
    expect(result.total).toBeCloseTo(100.0, 2);
  });

  it('debe retornar totales en cero para una cotización sin ítems', () => {
    const result = calculateQuoteTotals([], { applyRenta: true, discount: 0 });

    expect(result.subtotalSinIva).toBe(0);
    expect(result.ivaTotal).toBe(0);
    expect(result.subtotalConIva).toBe(0);
    expect(result.retencionRenta).toBe(0);
    expect(result.total).toBe(0);
  });

  it('debe redondear a 2 decimales correctamente', () => {
    expect(round2(1194.6902654867257)).toBe(1194.69);
    expect(round2(88.49557522123894)).toBe(88.5);
    expect(round2(0.005)).toBe(0.01);
  });
});
