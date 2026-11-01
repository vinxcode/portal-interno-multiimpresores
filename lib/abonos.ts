import { round2 } from './financial';

export function calculatePendingBalance(total: number, abonos: number[]): number {
  const totalAbonado = round2(abonos.reduce((acc, amount) => acc + amount, 0));
  return round2(total - totalAbonado);
}

export function validateNewAbono(total: number, abonos: number[], newAmount: number): boolean {
  if (!Number.isFinite(newAmount) || newAmount <= 0) {
    return false;
  }
  const saldo = calculatePendingBalance(total, abonos);
  return round2(newAmount) <= saldo;
}
