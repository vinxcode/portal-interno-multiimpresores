# Especificación General del Producto: MULTI IMPRESORES

## Visión General
**MULTI IMPRESORES** es un sistema integral de gestión para el taller gráfico que digitaliza el ciclo comercial completo: desde la cotización inicial, pasando por la ejecución en taller (Orden de Trabajo - OT), el cobro fraccionado con emisión de comprobantes internos tipo ticket (POS 80mm), hasta la liquidación final y vinculación con la factura física/CCF.

## Reglas Financieras e Impuestos (El Salvador)
1. **IVA (13%):** Las cotizaciones calculan automáticamente el Sub-Total sin IVA y el IVA (13%).
2. **Retención de Renta (10%):** Aplicable según la configuración del cliente/empresa, descontando el 10% sobre el valor subtotal.
3. **Descuentos:** Permite aplicar un monto de descuento directo antes del cálculo del total final.
4. **Formato de Ticket POS:** Los recibos de abono se emiten en formato ticket para impresora térmica (80mm) indicando:
   - Datos del taller y del cliente.
   - Detalle de servicios contratados.
   - Historial cronológico de abonos recibidos.
   - Saldo pendiente actualizado.
   - Leyenda legal: *"AL COMPLETAR SU PAGO, EXIJA SU FACTURA O CCF"*.

## Ciclo de Vida de las Órdenes de Trabajo (OT)
- `CREADO`: Cotización generada y enviada al cliente.
- `APROBADO`: Aceptada por el cliente; se convierte dinámicamente en Orden de Trabajo.
- `EN_PROCESO`: Trabajo en ejecución en el taller o línea de impresión/sublimado.
- `COMPLETADO / LISTO PARA ENTREGA`: Producto finalizado a la espera de la cancelación del saldo pendiente.
- `CERRADO`: Entregado al cliente, liquidado a $0.00 y con número de factura externa/física registrado.
- `RECHAZADO / ANULADO`: Cotización declinada.
