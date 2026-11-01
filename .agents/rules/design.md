# Reglas de Diseño y Sistema Visual (MULTI IMPRESORES)

## Sistema de Diseño y Tipografía
- **Tipografía Base:** **Inter** (vía `next/font/google`).
- **Jerarquía de Pesos:**
  - `font-normal` (400): Texto de cuerpo y tablas.
  - `font-medium` (500): Etiquetas de formularios y headers secundarios.
  - `font-semibold` (600): Montos financieros, números correlativos y títulos de tarjetas.
  - `font-bold` (700): Totales finales, encabezados principales y títulos de tickets.

## Paleta de Colores (Basada en Identidad Corporativa)
- **Primary (Azul Corporativo):** `#0D253F` / `#1E3A8A`
- **Secondary (Azul Cobalto Accent):** `#2563EB`
- **Success (Aprobado / Liquidado):** `#059669`
- **Warning (En Proceso / Saldo Pendiente):** `#D97706`
- **Danger (Eliminar / Anulado):** `#DC2626`
- **Background / Surfaces:** `#F8FAFC` (Fondo de app), `#FFFFFF` (Tarjetas y modales), `#F1F5F9` (Encabezados de tablas)
- **Text:** `#0F172A` (Texto principal), `#475569` (Texto secundario/labels)

## Extensión de `tailwind.config.ts`
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0D253F',
          cobalt: '#2563EB',
          light: '#F8FAFC',
          dark: '#0F172A',
          muted: '#64748B',
          surface: '#F1F5F9',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
```

## Regla Estricta de Iconografía

* **Prohibido el uso de Emojis en toda la interfaz y código fuente.**
* Usar únicamente iconos de `lucide-react` (ej. `Printer`, `FileText`, `DollarSign`, `Search`, `Trash2`, `Plus`, `CheckCircle`, `User`, `Lock`).

## Especificación para Impresión de Ticket Térmico POS (80mm)

* **Ancho fijo:** `80mm` (`302px` aproximadamente).
* **Fuente de ticket:** Monospaced o Inter compacta (`text-xs` / `text-[11px]`).
* **CSS Print Rule:**

```css
@media print {
  body * {
    visibility: hidden;
  }
  #pos-ticket, #pos-ticket * {
    visibility: visible;
  }
  #pos-ticket {
    position: absolute;
    left: 0;
    top: 0;
    width: 80mm;
  }
}
```
