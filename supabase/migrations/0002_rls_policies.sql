-- ============================================================
-- Migracion 0002: Row Level Security por Matriz de Permisos
-- ADMINISTRADOR: acceso total (eliminar cotizaciones/recibos, modificar productos)
-- NIVEL_2: crear/modificar cotizaciones, crear recibos, abonos, crear productos
-- NIVEL_3: consultar, crear recibos, abonos, modificar sus propios recibos (via RPC)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_correlatives ENABLE ROW LEVEL SECURITY;

-- Auxiliar: consultar rol del usuario autenticado
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ===== profiles =====
-- Cada usuario ve su propio perfil; ADMINISTRADOR ve todos
CREATE POLICY "profiles_select_propio_o_admin" ON public.profiles
    FOR SELECT USING (id = auth.uid() OR public.get_my_role() = 'ADMINISTRADOR');

CREATE POLICY "profiles_update_admin" ON public.profiles
    FOR UPDATE USING (public.get_my_role() = 'ADMINISTRADOR')
    WITH CHECK (public.get_my_role() = 'ADMINISTRADOR');
-- INSERT solo via bootstrap (SQL Editor, rol postgres)

-- ===== clients =====
CREATE POLICY "clients_select_autenticados" ON public.clients
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "clients_insert_admin_nivel2" ON public.clients
    FOR INSERT WITH CHECK (public.get_my_role() IN ('ADMINISTRADOR', 'NIVEL_2'));

CREATE POLICY "clients_update_admin_nivel2" ON public.clients
    FOR UPDATE USING (public.get_my_role() IN ('ADMINISTRADOR', 'NIVEL_2'))
    WITH CHECK (public.get_my_role() IN ('ADMINISTRADOR', 'NIVEL_2'));

CREATE POLICY "clients_delete_admin" ON public.clients
    FOR DELETE USING (public.get_my_role() = 'ADMINISTRADOR');

-- ===== products =====
-- Precio de compra visible para todos los roles autenticados en la capa DB;
-- la UI lo oculta para NIVEL_3 segun la matriz
CREATE POLICY "products_select_autenticados" ON public.products
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "products_insert_admin_nivel2" ON public.products
    FOR INSERT WITH CHECK (public.get_my_role() IN ('ADMINISTRADOR', 'NIVEL_2'));

-- Modificar productos: unicamente ADMINISTRADOR (la creacion si la tiene NIVEL_2)
CREATE POLICY "products_update_admin" ON public.products
    FOR UPDATE USING (public.get_my_role() = 'ADMINISTRADOR')
    WITH CHECK (public.get_my_role() = 'ADMINISTRADOR');

CREATE POLICY "products_delete_admin" ON public.products
    FOR DELETE USING (public.get_my_role() = 'ADMINISTRADOR');

-- ===== quotes =====
CREATE POLICY "quotes_select_autenticados" ON public.quotes
    FOR SELECT USING (auth.role() = 'authenticated');

-- INSERT y UPDATE solo via RPC (create_quote / update_quote) para garantizar
-- el recalculo atomico de impuestos y el correlativo transaccional

-- Eliminacion reservada SOLO para Administrador
CREATE POLICY "Solo admin elimina cotizaciones" ON public.quotes
    FOR DELETE USING (public.get_my_role() = 'ADMINISTRADOR');

-- ===== quote_items =====
CREATE POLICY "quote_items_select_autenticados" ON public.quote_items
    FOR SELECT USING (auth.role() = 'authenticated');
-- Escritura solo via RPC (create_quote / update_quote / delete_quote)

-- ===== payments =====
CREATE POLICY "payments_select_autenticados" ON public.payments
    FOR SELECT USING (auth.role() = 'authenticated');

-- INSERT solo via RPC register_abono (bloqueo FOR UPDATE del saldo)
-- UPDATE solo via RPC modify_abono (ADMIN cualquier recibo; NIVEL_3 solo los propios)
-- Eliminacion reservada SOLO para Administrador (la app usa delete_abono, que
-- ademas bloquea ordenes CERRADAS)
CREATE POLICY "Solo admin elimina pagos" ON public.payments
    FOR DELETE USING (public.get_my_role() = 'ADMINISTRADOR');

-- ===== quote_correlatives =====
-- Sin politicas: acceso exclusivo via RPC con SECURITY DEFINER
