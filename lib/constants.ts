import type { PaymentMethod } from '@/lib/types/database';

export const INTERNAL_EMAIL_DOMAIN = 'internal.multiimpresores';

export const USER_CODE_STORAGE_KEY = 'mi_user_code';

export function toInternalEmail(userCode: string): string {
  return `${userCode.trim()}@${INTERNAL_EMAIL_DOMAIN}`;
}

export const BUSINESS = {
  name: 'MULTI IMPRESORES',
  tagline: 'Centro de Servicios Gráficos',
  address: 'Dirección del taller (configurar en lib/constants.ts)',
  phone: '+503 0000-0000',
  taxLegend: 'AL COMPLETAR SU PAGO, EXIJA SU FACTURA O CCF',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  TARJETA: 'Tarjeta',
};
