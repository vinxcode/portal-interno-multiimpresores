# Estrategia de Testing Unitario con Vitest

## Objetivo de Calidad
Garantizar precisión absoluta en los recálculos financieros (IVA 13%, Retención de Renta 10%), control de saldos de abonos y esquemas de validación Zod antes de entregar cambios a producción.

## Modelo de Precios (Decisión de Negocio)
- Los precios del catálogo **incluyen IVA**: el desglose se calcula hacia atrás (`subtotalSinIva = bruto / 1.13`, `ivaTotal = bruto - subtotalSinIva`).
- La **Retención de Renta (10%)** se aplica sobre el subtotal sin IVA.
- El **descuento** se aplica como monto directo restado del total final.
- Todos los valores monetarios se redondean a 2 decimales en cada paso del cálculo.

## Configuración de Vitest (`vitest.config.ts`)
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
```

## Suites de Prueba Críticas

### 1. Test de Recálculos Financieros (`lib/financial.test.ts`)

```typescript
import { describe, it, expect } from 'vitest';
import { calculateQuoteTotals } from './financial';

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
});
```

### 2. Test de Cálculo de Saldo Pendiente (`lib/abonos.test.ts`)

```typescript
import { describe, it, expect } from 'vitest';
import { calculatePendingBalance, validateNewAbono } from './abonos';

describe('Cálculo de Saldos y Abonos', () => {
  it('debe restar los abonos del total para obtener el saldo correcto', () => {
    const totalOrden = 80.40;
    const abonos = [15.00, 40.00];
    const saldo = calculatePendingBalance(totalOrden, abonos);

    expect(saldo).toBeCloseTo(25.40, 2);
  });

  it('no debe permitir abonos que excedan el saldo restante', () => {
    const totalOrden = 80.40;
    const abonos = [15.00, 40.00];
    const isValid = validateNewAbono(totalOrden, abonos, 30.00); // 25.40 max

    expect(isValid).toBe(false);
  });
});
```
