# Estándares de Código y Desarrollo (Next.js + TypeScript + Zustand + Zod)

## Stack Tecnológico
- **Framework:** Next.js (App Router, React 19).
- **Lenguaje:** TypeScript Estricto (`strict: true`, cero `any`).
- **Estilos:** Tailwind CSS (Desktop-first con responsividad móvil fluida).
- **Validación:** Zod para esquemas de entrada de cotizaciones, abonos, logins y facturas.
- **Estado Global:** Zustand para el estado interactivo del cotizador y creación de recibos.

## Convenciones de Archivos y Nombres
1. **Componentes:** `PascalCase` (ej. `QuoteTable.tsx`, `TicketPreview.tsx`).
2. **Hooks:** `camelCase` con prefijo `use` (ej. `useQuoteCalculator.ts`).
3. **Esquemas Zod:** `camelCase` en `lib/schemas/` (ej. `quoteSchema.ts`, `abonoSchema.ts`).
4. **Rutas:** `kebab-case` en `app/` (ej. `app/cotizaciones/[id]/page.tsx`).

## Manejo Obligatorio de 4 Estados de UI
Todo componente de consulta o renderizado de datos debe contemplar explícitamente:
- **Cargando (Loading):** Skeletons estilizados.
- **Vacío (Empty):** Estado amigable (ej. "No hay abonos registrados para esta orden").
- **Error:** Notificación clara con opción de reintentar.
- **Éxito (Data Loaded):** Renderizado final de los datos.

## Esquemas de Validación Principales (Zod)

### 1. Login por Código Interno
```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  userCode: z.string().min(3, 'El código de usuario es obligatorio'), // ej. "00126"
  password: z.string().min(4, 'La contraseña es obligatoria'),
  rememberUser: z.boolean().default(true),
});
```

### 2. Registro de Abono

```typescript
export const abonoSchema = z.object({
  quoteId: z.string().uuid(),
  amount: z.number().positive('El monto del abono debe ser mayor a 0'),
  paymentMethod: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA']),
  observation: z.string().optional(),
});
```
