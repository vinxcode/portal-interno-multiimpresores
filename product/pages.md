# Especificación de Vistas y Rutas de la Aplicación

## 1. `/login` (Acceso al Portal)
- Identificación por código interno y contraseña.

## 2. `/dashboard` (Portal Principal - Nivel 3 / General)
- Visualización de banners principales: "COTIZACIÓN: Crea y administra tus cotizaciones" y "RECIBOS: Administra tus recibos y pagos".
- Buscador global de productos con tabla que muestra: Código, Nombre, Precio de Compra (oculto según rol), P. Venta, Precio Mayoreo y Observación.

## 3. `/cotizaciones` (Gestión y Creador)
- Vista dividida: Formulario de cotización activa a la izquierda y listado histórico de cotizaciones a la derecha con filtro por correlativo (`001-2026`), cliente y fecha.

## 4. `/recibos` (Control de Pagos y Tickets)
- Vista de administración de comprobantes: muestra recibo activo con tabla de abonos realizados, saldo liquidado y panel de historial de últimos recibos.

## 5. `/reportes` (Tableros de Control)
- **Reporte de Trabajos en Proceso:** Filtrado por operarios, fechas y clientes.
- **Reporte de Cotizaciones Pendientes:** Seguimiento comercial.
- **Reporte de Órdenes Cerradas e Ingresos:** Arqueo de caja, conciliación de abonos recibidos e historial de facturas externas.
