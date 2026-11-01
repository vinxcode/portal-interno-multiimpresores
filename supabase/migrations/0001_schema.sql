-- ============================================================
-- Migracion 0001: Esquema de tablas
-- MULTI IMPRESORES - Portal Interno (Supabase / PostgreSQL)
-- ============================================================

-- 1. Usuarios y Perfiles (Roles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_code TEXT UNIQUE NOT NULL, -- ej: '00126'
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMINISTRADOR', 'NIVEL_2', 'NIVEL_3')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Clientes
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id TEXT NOT NULL, -- NIT / NRC / DUI
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Catalogo de Productos y Servicios
-- IMPORTANTE: los precios INCLUYEN IVA 13% (ver .agents/rules/testing.md)
CREATE TABLE IF NOT EXISTS public.products (
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

-- 4. Cotizaciones / Ordenes de Trabajo (OT)
CREATE TABLE IF NOT EXISTS public.quotes (
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

-- 5. Items de Cotizacion
CREATE TABLE IF NOT EXISTS public.quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity > 0),
    detail TEXT NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(10,2) NOT NULL CHECK (total_price >= 0)
);

-- 6. Abonos y Pagos Parciales
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA')),
    observation TEXT,
    created_by UUID REFERENCES public.profiles(id) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Contador de correlativos por anio (formato NNN-AAAA)
CREATE TABLE IF NOT EXISTS public.quote_correlatives (
    year INT PRIMARY KEY CHECK (year >= 2020),
    last_number INT NOT NULL DEFAULT 0 CHECK (last_number >= 0)
);

-- Fila inicial del anio en curso
INSERT INTO public.quote_correlatives (year, last_number)
VALUES (EXTRACT(YEAR FROM NOW())::INT, 0)
ON CONFLICT (year) DO NOTHING;

-- Indices de consulta frecuente
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes (status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON public.quotes (client_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON public.quote_items (quote_id);
CREATE INDEX IF NOT EXISTS idx_payments_quote_id ON public.payments (quote_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products (name);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients (name);
