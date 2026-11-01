import { z } from 'zod';

export const quoteItemSchema = z.object({
  quantity: z.number().int().positive('La cantidad debe ser un entero mayor a 0'),
  detail: z.string().trim().min(1, 'El detalle del ítem es obligatorio'),
  unitPrice: z.number().min(0, 'El precio unitario no puede ser negativo'),
});

export const quoteSchema = z.object({
  clientId: z.uuid('Debe seleccionar un cliente válido'),
  items: z.array(quoteItemSchema).min(1, 'La cotización debe tener al menos un ítem'),
  applyRenta: z.boolean(),
  discount: z.number().min(0, 'El descuento no puede ser negativo'),
  productLink: z.string().trim().max(500).optional(),
  referenceImageUrl: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
  assignedTo: z.uuid().nullable().optional(),
});

export type QuoteItemInput = z.infer<typeof quoteItemSchema>;
export type QuoteInput = z.input<typeof quoteSchema>;
