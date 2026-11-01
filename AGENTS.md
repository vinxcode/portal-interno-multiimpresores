# AGENTS.md - Reglas Globales y Mapa de Navegación del Sistema

## Descripción del Proyecto
**MULTI IMPRESORES** es una plataforma web para digitalizar, trazar y automatizar el ciclo comercial operativo de una imprenta y centro de servicios gráficos. Abarca desde la prospección y cotización dinámica, conversión a Órdenes de Trabajo (OT), control de abonos parciales con impresión de tickets térmicos POS (80mm), hasta la liquidación con facturación externa y reportes de caja.

## Principios e Invariantes Globales
1. **Seguridad Financiera Atómica:** Toda modificación de saldos, registro de abonos y recalculo de impuestos (IVA 13%, Retención de Renta 10%) debe ejecutarse mediante Funciones RPC en PostgreSQL con bloqueos `FOR UPDATE` para evitar condiciones de carrera.
2. **Autenticación por Código Interno:** El acceso al portal es estrictamente por **Código de Identificación Interna** (ej. `00126`, **NUNCA correo electrónico**) y contraseña.
3. **Persistencia de Credenciales:** La interfaz puede permitir "Recordar Usuario", pero **JAMÁS debe recordar la contraseña** por motivos de seguridad en caja/taller.
4. **Matriz de Autorización de 3 Niveles:**
   - `ADMINISTRADOR`: Acceso total. Único rol autorizado para eliminar cotizaciones/recibos, modificar recibos y crear/modificar productos.
   - `NIVEL_2`: Consultar/modificar precios, crear/modificar cotizaciones, crear recibos, ingresar abonos y crear productos.
   - `NIVEL_3`: Consultar precios, crear recibos, ingresar abonos y modificar sus propios recibos.
5. **Regla Estricta de UI:** Queda estrictamente prohibido el uso de Emojis en código y componentes de UI. Usar exclusivamente la librería `lucide-react`.

## Estrategia de Documentos y Reglas
- `.agents/rules/design.md`: Guía de diseño, Tailwind CSS, tipografía Inter y maquetación de tickets térmicos POS.
- `.agents/rules/coding.md`: Estándares de Next.js (App Router), TypeScript estricto, Zod y Zustand.
- `.agents/rules/database.md`: Esquema PostgreSQL en Supabase, políticas RLS y funciones RPC para abonos y cierres.
- `.agents/rules/testing.md`: Configuración de Vitest para pruebas unitarias matemáticas y esquemas de validación.
- `.agents/rules/verification.md`: Protocolo de verificación obligatoria y Definition of Done (DoD).
- `product/PRODUCT.md`: Especificación de reglas de negocio, impuestos salvadoreños y ciclo de vida de OTs.
- `product/components.md`: Especificación técnica de componentes reutilizables (Ticket POS, Cotizador).
- `product/pages.md`: Rutas y vistas completas del sistema.
