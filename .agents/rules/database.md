# Especificación de Base de Datos, RLS y Funciones RPC (Supabase / PostgreSQL)

## Esquema de Tablas

```sql
-- 1. Usuarios y Perfiles (Roles)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_code TEXT UNIQUE NOT NULL, -- ej: '00126'
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMINISTRADOR', 'NIVEL_2', 'NIVEL_3')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Clientes
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id TEXT NOT NULL, -- NIT / NRC / DVI
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Catálogo de Productos y Servicios
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    purchase_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    sale_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    wholesale_price NUMERIC(10,2) DEFAULT 0.00,
    observation TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Cotizaciones / Órdenes de Trabajo (OT)
CREATE TABLE public.quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correlative TEXT UNIQUE NOT NULL, -- ej: '001-2026'
    client_id UUID REFERENCES public.clients(id),
    status TEXT NOT NULL DEFAULT 'CREADO' CHECK (
        status IN ('CREADO', 'APROBADO', 'EN_PROCESO', 'COMPLETADO', 'CERRADO', 'RECHAZADO')
    ),
    subtotal_sin_iva NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    iva_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    subtotal_con_iva NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    retencion_renta NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    product_link TEXT,
    reference_image_url TEXT,
    notes TEXT,
    external_invoice_number TEXT, -- Registrado al cerrar
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Operario asignado (reporte de trabajos en proceso)
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Items de Cotización
CREATE TABLE public.quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity > 0),
    detail TEXT NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(10,2) NOT NULL CHECK (total_price >= 0)
);

-- 6. Abonos y Pagos Parciales
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA')),
    observation TEXT,
    created_by UUID REFERENCES public.profiles(id) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Contador de correlativos por año (formato NNN-AAAA, uso exclusivo vía RPC)
CREATE TABLE public.quote_correlatives (
    year INT PRIMARY KEY CHECK (year >= 2020),
    last_number INT NOT NULL DEFAULT 0 CHECK (last_number >= 0)
);
```

## Funciones Atómicas RPC

### 1. Registro Seguro de Abonos (`register_abono`)

```sql
CREATE OR REPLACE FUNCTION public.register_abono(
    p_quote_id UUID,
    p_amount NUMERIC(10,2),
    p_payment_method TEXT,
    p_observation TEXT
) RETURNS UUID AS $$
DECLARE
    v_total NUMERIC(10,2);
    v_total_abonos NUMERIC(10,2);
    v_saldo_pendiente NUMERIC(10,2);
    v_payment_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;

    -- Bloquear orden para evitar concurrencia
    SELECT total INTO v_total
    FROM public.quotes
    WHERE id = p_quote_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La orden especificada no existe.';
    END IF;

    -- Calcular suma acumulada de abonos
    SELECT COALESCE(SUM(amount), 0.00) INTO v_total_abonos
    FROM public.payments
    WHERE quote_id = p_quote_id;

    v_saldo_pendiente := v_total - v_total_abonos;

    IF p_amount > v_saldo_pendiente THEN
        RAISE EXCEPTION 'El abono ($%) supera el saldo pendiente ($%).', p_amount, v_saldo_pendiente;
    END IF;

    -- Registrar abono guardando el usuario que ejecutó la transacción
    INSERT INTO public.payments (quote_id, amount, payment_method, observation, created_by)
    VALUES (p_quote_id, p_amount, p_payment_method, p_observation, v_user_id)
    RETURNING id INTO v_payment_id;

    RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Catálogo de RPC atómicas (`supabase/migrations/0003_rpc_functions.sql`)

| RPC | Autorización | Función |
| --- | --- | --- |
| `create_quote` | ADMIN / NIVEL_2 | Crea cotización con correlativo transaccional `NNN-AAAA` y recálculo atómico de impuestos |
| `update_quote` | ADMIN / NIVEL_2 | Edita cotizaciones solo en `CREADO`/`RECHAZADO` y sin abonos; recalcula totales |
| `change_quote_status` | ADMIN / NIVEL_2 | Transiciones del ciclo de vida OT (`CREADO`→`APROBADO`→`EN_PROCESO`→`COMPLETADO`) |
| `close_quote` | ADMIN / NIVEL_2 | Cierra una orden `COMPLETADO` liquidada a $0.00 registrando la factura externa |
| `modify_abono` | ADMIN (cualquiera) / NIVEL_3 (propios) | Modifica un abono revalidando el saldo con `FOR UPDATE` |
| `delete_abono` | ADMIN | Elimina un abono (bloquea órdenes `CERRADO`) |
| `delete_quote` | ADMIN | Elimina una cotización (bloquea órdenes con abonos para no borrar historial de caja) |
| `list_operarios` | Autenticados | Lista operarios para la asignación en cotizaciones |

Notas de integridad:
- `register_abono` además rechaza abonos en órdenes `CERRADO`/`RECHAZADO`.
- `INSERT`/`UPDATE` directos sobre `quotes`, `quote_items` y `payments` no tienen política RLS: la única vía es RPC, garantizando el recálculo atómico de impuestos.
- El cálculo de totales replica el modelo de precios con IVA incluido (ver `.agents/rules/testing.md`).

## Políticas de RLS por Matriz de Permisos

El conjunto completo de políticas por tabla (`profiles`, `clients`, `products`, `quotes`, `quote_items`, `payments`, `quote_correlatives`) vive en `supabase/migrations/0002_rls_policies.sql`. Núcleo del esquema:

```sql
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Auxiliar: Consultar Rol
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$SELECT role FROM public.profiles WHERE id = auth.uid();$$ LANGUAGE sql SECURITY DEFINER;

-- Eliminación reservada SOLO para Administrador
CREATE POLICY "Solo admin elimina cotizaciones" ON public.quotes
FOR DELETE USING (public.get_my_role() = 'ADMINISTRADOR');

CREATE POLICY "Solo admin elimina pagos" ON public.payments
FOR DELETE USING (public.get_my_role() = 'ADMINISTRADOR');
```
