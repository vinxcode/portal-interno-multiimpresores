# Especificación Técnica de Componentes UI

## 1. `LoginForm`
- **Ubicación:** `components/auth/LoginForm.tsx`
- **Comportamiento:**
  - Input para **Código de Identificación Interna** (ej. `00126`).
  - Input para Contraseña.
  - Checkbox *"Recordar Usuario"* (guarda únicamente el `user_code` en `localStorage`).
  - La contraseña nunca se almacena ni se autocompleta si no lo desea el navegador.

## 2. `QuoteBuilder` (Cotizador Dinámico)
- **Ubicación:** `components/cotizador/QuoteBuilder.tsx`
- **Características:**
  - Buscador dinámico de productos del catálogo.
  - Tabla interactiva con columnas: Cantidad, Detalle, P. Unidad, Total, Acciones (Eliminar fila).
  - Selector de cliente con datos de NIT/NRC y teléfono.
  - Input para **URL/Link del Producto** y área de carga/pegar **Imagen de Referencia**.
  - Panel lateral con desglose en tiempo real: Sub-Total sin IVA, IVA 13%, Sub-Total con IVA, Retención Renta 10%, Descuento y TOTAL.

## 3. `POSTicketPrinter`
- **Ubicación:** `components/tickets/POSTicketPrinter.tsx`
- **Características:**
  - Renderizado del comprobante de ingreso de 80mm.
  - Botón de **Exportar a PDF** e **Imprimir Ticket**.
  - Desglose claro de abonos previos con sus fechas respectivas y saldo restante destacado en negrita.

## 4. `AbonosModal`
- **Ubicación:** `components/recibos/AbonosModal.tsx`
- **Características:**
  - Permite ingresar un nuevo abono seleccionando método de pago (Efectivo, Transferencia, Tarjeta).
  - Valida mediante la RPC `register_abono` que el monto no exceda el saldo pendiente.
