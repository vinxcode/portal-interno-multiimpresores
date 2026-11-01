import { z } from 'zod';

export const loginSchema = z.object({
  userCode: z.string().min(3, 'El código de usuario es obligatorio'), // ej. "00126"
  password: z.string().min(4, 'La contraseña es obligatoria'),
  rememberUser: z.boolean().default(true),
});

export type LoginInput = z.input<typeof loginSchema>;
export type LoginData = z.output<typeof loginSchema>;
