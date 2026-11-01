import { describe, it, expect } from 'vitest';
import { calculatePendingBalance, validateNewAbono } from './abonos';

describe('Cálculo de Saldos y Abonos', () => {
  it('debe restar los abonos del total para obtener el saldo correcto', () => {
    const totalOrden = 80.4;
    const abonos = [15.0, 40.0];
    const saldo = calculatePendingBalance(totalOrden, abonos);

    expect(saldo).toBeCloseTo(25.4, 2);
  });

  it('no debe permitir abonos que excedan el saldo restante', () => {
    const totalOrden = 80.4;
    const abonos = [15.0, 40.0];
    const isValid = validateNewAbono(totalOrden, abonos, 30.0); // 25.40 max

    expect(isValid).toBe(false);
  });

  it('debe permitir un abono igual al saldo pendiente (liquidación exacta)', () => {
    const isValid = validateNewAbono(80.4, [15.0, 40.0], 25.4);

    expect(isValid).toBe(true);
  });

  it('debe rechazar abonos negativos, en cero o inválidos', () => {
    expect(validateNewAbono(100, [0], -5)).toBe(false);
    expect(validateNewAbono(100, [0], 0)).toBe(false);
    expect(validateNewAbono(100, [0], Number.NaN)).toBe(false);
  });

  it('debe calcular saldo pendiente en cero para una orden liquidada', () => {
    const saldo = calculatePendingBalance(135.0, [100, 35]);

    expect(saldo).toBeCloseTo(0, 2);
  });

  it('debe calcular el saldo completo cuando no hay abonos', () => {
    const saldo = calculatePendingBalance(113.0, []);

    expect(saldo).toBeCloseTo(113.0, 2);
  });
});
