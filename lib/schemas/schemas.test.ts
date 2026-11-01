import { describe, it, expect } from 'vitest';
import { loginSchema } from './login';
import { abonoSchema } from './abono';
import { quoteSchema } from './quote';
import { clientSchema } from './client';
import { productSchema } from './product';
import { cierreSchema } from './cierre';

const UUID = '3f1e9b8a-6c2d-4e7f-9a1b-2c3d4e5f6a7b';

describe('Esquema de Login por Código Interno', () => {
  it('debe aceptar un código interno válido con contraseña', () => {
    const result = loginSchema.safeParse({ userCode: '00126', password: 'secreto', rememberUser: true });

    expect(result.success).toBe(true);
  });

  it('debe aplicar el valor por defecto de rememberUser', () => {
    const result = loginSchema.parse({ userCode: '00126', password: 'secreto' });

    expect(result.rememberUser).toBe(true);
  });

  it('debe rechazar códigos cortos y contraseñas insuficientes', () => {
    expect(loginSchema.safeParse({ userCode: '01', password: 'secreto', rememberUser: true }).success).toBe(false);
    expect(loginSchema.safeParse({ userCode: '00126', password: 'abc', rememberUser: true }).success).toBe(false);
  });
});

describe('Esquema de Registro de Abono', () => {
  it('debe aceptar un abono válido', () => {
    const result = abonoSchema.safeParse({
      quoteId: UUID,
      amount: 25.4,
      paymentMethod: 'EFECTIVO',
      observation: 'Abono inicial',
    });

    expect(result.success).toBe(true);
  });

  it('debe rechazar montos no positivos', () => {
    expect(abonoSchema.safeParse({ quoteId: UUID, amount: 0, paymentMethod: 'EFECTIVO' }).success).toBe(false);
    expect(abonoSchema.safeParse({ quoteId: UUID, amount: -10, paymentMethod: 'EFECTIVO' }).success).toBe(false);
  });

  it('debe rechazar métodos de pago fuera del catálogo', () => {
    expect(abonoSchema.safeParse({ quoteId: UUID, amount: 10, paymentMethod: 'BITCOIN' }).success).toBe(false);
  });
});

describe('Esquema de Cotización', () => {
  const validItem = { quantity: 100, detail: 'Tazas sublimadas 15oz', unitPrice: 6.75 };

  it('debe aceptar una cotización con ítems válidos', () => {
    const result = quoteSchema.safeParse({
      clientId: UUID,
      items: [validItem],
      applyRenta: false,
      discount: 0,
    });

    expect(result.success).toBe(true);
  });

  it('debe rechazar cotizaciones sin ítems', () => {
    const result = quoteSchema.safeParse({
      clientId: UUID,
      items: [],
      applyRenta: false,
      discount: 0,
    });

    expect(result.success).toBe(false);
  });

  it('debe rechazar cantidades fraccionadas y precios negativos', () => {
    const base = { clientId: UUID, applyRenta: false, discount: 0 };

    expect(quoteSchema.safeParse({ ...base, items: [{ ...validItem, quantity: 1.5 }] }).success).toBe(false);
    expect(quoteSchema.safeParse({ ...base, items: [{ ...validItem, unitPrice: -1 }] }).success).toBe(false);
  });
});

describe('Esquemas de Cliente, Producto y Cierre', () => {
  it('debe rechazar un cliente sin documento o sin nombre', () => {
    expect(clientSchema.safeParse({ docId: '', name: 'Cliente' }).success).toBe(false);
    expect(clientSchema.safeParse({ docId: '12345', name: '' }).success).toBe(false);
  });

  it('debe aceptar un producto con precios válidos', () => {
    const result = productSchema.safeParse({
      code: 'TAZ-15',
      name: 'Taza ceramica 15oz',
      purchasePrice: 2.5,
      salePrice: 6.75,
    });

    expect(result.success).toBe(true);
  });

  it('debe rechazar el cierre sin número de factura externa', () => {
    expect(cierreSchema.safeParse({ quoteId: UUID, externalInvoiceNumber: '' }).success).toBe(false);
  });
});
