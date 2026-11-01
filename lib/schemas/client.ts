import { z } from 'zod';

export const clientSchema = z.object({
  docId: z.string().trim().min(1, 'El NIT/NRC/DUI es obligatorio'),
  name: z.string().trim().min(1, 'El nombre del cliente es obligatorio'),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().max(120).optional(),
});

export type ClientInput = z.infer<typeof clientSchema>;
