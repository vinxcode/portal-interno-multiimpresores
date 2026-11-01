import { z } from 'zod';

export const abonoSchema = z.object({
  quoteId: z.string().uuid(),
  amount: z.number().positive('El monto del abono debe ser mayor a 0'),
  paymentMethod: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA']),
  observation: z.string().optional(),
});

export type AbonoInput = z.infer<typeof abonoSchema>;
