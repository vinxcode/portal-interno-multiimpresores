import { z } from 'zod';

export const cierreSchema = z.object({
  quoteId: z.uuid(),
  externalInvoiceNumber: z.string().trim().min(1, 'El número de factura externa es obligatorio'),
});

export type CierreInput = z.infer<typeof cierreSchema>;
