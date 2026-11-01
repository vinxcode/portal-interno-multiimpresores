import { z } from 'zod';

export const productSchema = z.object({
  code: z.string().trim().min(1, 'El código es obligatorio'),
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  purchasePrice: z.number().min(0, 'El precio de compra no puede ser negativo'),
  salePrice: z.number().min(0, 'El precio de venta no puede ser negativo'),
  wholesalePrice: z.number().min(0, 'El precio mayoreo no puede ser negativo').optional(),
  observation: z.string().trim().max(500).optional(),
});

export type ProductInput = z.infer<typeof productSchema>;
