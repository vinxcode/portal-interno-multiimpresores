-- ============================================================
-- Migracion 0003: Funciones atomicas RPC
-- Todas las mutaciones financieras usan bloqueos FOR UPDATE para
-- evitar condiciones de carrera (Invariante 1 del harness).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Registro seguro de abonos (register_abono)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_abono(
    p_quote_id UUID,
    p_amount NUMERIC(10,2),
    p_payment_method TEXT,
    p_observation TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total NUMERIC(10,2);
    v_status TEXT;
    v_total_abonos NUMERIC(10,2);
    v_saldo_pendiente NUMERIC(10,2);
    v_payment_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'El monto del abono debe ser mayor a 0.';
    END IF;

    IF p_payment_method NOT IN ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA') THEN
        RAISE EXCEPTION 'Metodo de pago invalido.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
        RAISE EXCEPTION 'Perfil del usuario no encontrado.';
    END IF;

    -- Bloquear orden para evitar concurrencia
    SELECT total, status INTO v_total, v_status
    FROM public.quotes
    WHERE id = p_quote_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La orden especificada no existe.';
    END IF;

    IF v_status IN ('CERRADO', 'RECHAZADO') THEN
        RAISE EXCEPTION 'No se pueden registrar abonos en una orden en estado %.', v_status;
    END IF;

    -- Calcular suma acumulada de abonos
    SELECT COALESCE(SUM(amount), 0.00) INTO v_total_abonos
    FROM public.payments
    WHERE quote_id = p_quote_id;

    v_saldo_pendiente := v_total - v_total_abonos;

    IF p_amount > v_saldo_pendiente THEN
        RAISE EXCEPTION 'El abono ($%) supera el saldo pendiente ($%).', p_amount, v_saldo_pendiente;
    END IF;

    -- Registrar abono guardando el usuario que ejecuto la transaccion
    INSERT INTO public.payments (quote_id, amount, payment_method, observation, created_by)
    VALUES (p_quote_id, p_amount, p_payment_method, p_observation, v_user_id)
    RETURNING id INTO v_payment_id;

    RETURN v_payment_id;
END;
$$;

-- ------------------------------------------------------------
-- 2. Validacion y calculo de totales desde items JSONB
--    (uso interno: valida items y devuelve totales desglosados)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calcular_totales(
    p_items JSONB,
    p_apply_renta BOOLEAN,
    p_discount NUMERIC(10,2)
) RETURNS TABLE (
    subtotal_sin_iva NUMERIC(10,2),
    iva_total NUMERIC(10,2),
    subtotal_con_iva NUMERIC(10,2),
    retencion_renta NUMERIC(10,2),
    discount NUMERIC(10,2),
    total NUMERIC(10,2)
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_item JSONB;
    v_qty INT;
    v_price NUMERIC(10,2);
    v_bruto NUMERIC(10,2);
    v_sin_iva NUMERIC(10,2);
    v_iva NUMERIC(10,2);
    v_renta NUMERIC(10,2);
    v_total NUMERIC(10,2);
BEGIN
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'La cotizacion debe incluir al menos un item.';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_qty := NULLIF(v_item->>'quantity', '')::INT;
        v_price := NULLIF(v_item->>'unit_price', '')::NUMERIC(10,2);
        IF v_qty IS NULL OR v_qty <= 0 THEN
            RAISE EXCEPTION 'Cantidad invalida en el item "%".', COALESCE(v_item->>'detail', '(sin detalle)');
        END IF;
        IF v_price IS NULL OR v_price < 0 THEN
            RAISE EXCEPTION 'Precio unitario invalido en el item "%".', COALESCE(v_item->>'detail', '(sin detalle)');
        END IF;
        IF COALESCE(v_item->>'detail', '') = '' THEN
            RAISE EXCEPTION 'El detalle del item es obligatorio.';
        END IF;
        IF length(v_item->>'detail') > 500 THEN
            RAISE EXCEPTION 'El detalle del item no puede exceder 500 caracteres.';
        END IF;
    END LOOP;

    SELECT round(SUM((item->>'quantity')::numeric * (item->>'unit_price')::numeric), 2)
    INTO v_bruto
    FROM jsonb_array_elements(p_items) AS item;

    v_sin_iva := round(v_bruto / 1.13, 2);
    v_iva := round(v_bruto - v_sin_iva, 2);
    v_renta := CASE WHEN COALESCE(p_apply_renta, false) THEN round(v_sin_iva * 0.10, 2) ELSE 0.00 END;

    IF COALESCE(p_discount, 0) < 0 OR COALESCE(p_discount, 0) > v_bruto THEN
        RAISE EXCEPTION 'El descuento debe estar entre 0 y el subtotal con IVA.';
    END IF;

    v_total := round(v_bruto - v_renta - COALESCE(p_discount, 0), 2);

    IF v_total < 0 THEN
        RAISE EXCEPTION 'El total no puede ser negativo.';
    END IF;

    RETURN QUERY SELECT v_sin_iva, v_iva, v_bruto, v_renta, round(COALESCE(p_discount, 0), 2), v_total;
END;
$$;

-- ------------------------------------------------------------
-- 3. Creacion de cotizaciones con correlativo transaccional
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_quote(
    p_client_id UUID,
    p_items JSONB,
    p_apply_renta BOOLEAN,
    p_discount NUMERIC(10,2) DEFAULT 0,
    p_product_link TEXT DEFAULT NULL,
    p_reference_image_url TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_assigned_to UUID DEFAULT NULL
) RETURNS TABLE (quote_id UUID, correlative TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_user_id UUID := auth.uid();
    v_year INT := EXTRACT(YEAR FROM NOW())::INT;
    v_number INT;
    v_correlative TEXT;
    v_quote_id UUID;
    v_tot RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;

    SELECT public.get_my_role() INTO v_role;
    IF v_role IS NULL OR v_role NOT IN ('ADMINISTRADOR', 'NIVEL_2') THEN
        RAISE EXCEPTION 'Su rol (%) no esta autorizado a crear cotizaciones.', COALESCE(v_role, 'sin perfil');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id) THEN
        RAISE EXCEPTION 'El cliente especificado no existe.';
    END IF;

    IF p_assigned_to IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_assigned_to) THEN
        RAISE EXCEPTION 'El operario asignado no existe.';
    END IF;

    SELECT * INTO v_tot FROM public.calcular_totales(p_items, p_apply_renta, p_discount);

    -- Correlativo atomico NNN-AAAA (upsert con bloqueo de fila)
    INSERT INTO public.quote_correlatives (year, last_number)
    VALUES (v_year, 1)
    ON CONFLICT (year) DO UPDATE SET last_number = public.quote_correlatives.last_number + 1
    RETURNING last_number INTO v_number;

    v_correlative := lpad(v_number::TEXT, 3, '0') || '-' || v_year::TEXT;

    INSERT INTO public.quotes (
        correlative, client_id, status,
        subtotal_sin_iva, iva_total, subtotal_con_iva, retencion_renta, discount, total,
        product_link, reference_image_url, notes, created_by, assigned_to
    ) VALUES (
        v_correlative, p_client_id, 'CREADO',
        v_tot.subtotal_sin_iva, v_tot.iva_total, v_tot.subtotal_con_iva,
        v_tot.retencion_renta, v_tot.discount, v_tot.total,
        p_product_link, p_reference_image_url, p_notes, v_user_id, p_assigned_to
    )
    RETURNING public.quotes.id INTO v_quote_id;

    INSERT INTO public.quote_items (quote_id, quantity, detail, unit_price, total_price)
    SELECT
        v_quote_id,
        (item->>'quantity')::INT,
        item->>'detail',
        (item->>'unit_price')::NUMERIC(10,2),
        round((item->>'quantity')::numeric * (item->>'unit_price')::numeric, 2)
    FROM jsonb_array_elements(p_items) AS item;

    RETURN QUERY SELECT v_quote_id, v_correlative;
END;
$$;

-- ------------------------------------------------------------
-- 4. Edicion de cotizaciones (solo CREADO/RECHAZADO, sin abonos)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_quote(
    p_quote_id UUID,
    p_client_id UUID,
    p_items JSONB,
    p_apply_renta BOOLEAN,
    p_discount NUMERIC(10,2) DEFAULT 0,
    p_product_link TEXT DEFAULT NULL,
    p_reference_image_url TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_assigned_to UUID DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_status TEXT;
    v_tot RECORD;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;

    SELECT public.get_my_role() INTO v_role;
    IF v_role IS NULL OR v_role NOT IN ('ADMINISTRADOR', 'NIVEL_2') THEN
        RAISE EXCEPTION 'Su rol (%) no esta autorizado a modificar cotizaciones.', COALESCE(v_role, 'sin perfil');
    END IF;

    SELECT status INTO v_status FROM public.quotes WHERE id = p_quote_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La cotizacion especificada no existe.';
    END IF;

    IF v_status NOT IN ('CREADO', 'RECHAZADO') THEN
        RAISE EXCEPTION 'Solo se pueden editar cotizaciones en estado CREADO o RECHAZADO (estado actual: %).', v_status;
    END IF;

    IF EXISTS (SELECT 1 FROM public.payments WHERE quote_id = p_quote_id) THEN
        RAISE EXCEPTION 'No se puede modificar una orden con abonos registrados.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id) THEN
        RAISE EXCEPTION 'El cliente especificado no existe.';
    END IF;

    IF p_assigned_to IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_assigned_to) THEN
        RAISE EXCEPTION 'El operario asignado no existe.';
    END IF;

    SELECT * INTO v_tot FROM public.calcular_totales(p_items, p_apply_renta, p_discount);

    UPDATE public.quotes
    SET client_id = p_client_id,
        subtotal_sin_iva = v_tot.subtotal_sin_iva,
        iva_total = v_tot.iva_total,
        subtotal_con_iva = v_tot.subtotal_con_iva,
        retencion_renta = v_tot.retencion_renta,
        discount = v_tot.discount,
        total = v_tot.total,
        product_link = p_product_link,
        reference_image_url = p_reference_image_url,
        notes = p_notes,
        assigned_to = p_assigned_to,
        updated_at = NOW()
    WHERE id = p_quote_id;

    DELETE FROM public.quote_items WHERE quote_id = p_quote_id;

    INSERT INTO public.quote_items (quote_id, quantity, detail, unit_price, total_price)
    SELECT
        p_quote_id,
        (item->>'quantity')::INT,
        item->>'detail',
        (item->>'unit_price')::NUMERIC(10,2),
        round((item->>'quantity')::numeric * (item->>'unit_price')::numeric, 2)
    FROM jsonb_array_elements(p_items) AS item;
END;
$$;

-- ------------------------------------------------------------
-- 5. Cambio de estado del ciclo de vida OT
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.change_quote_status(
    p_quote_id UUID,
    p_new_status TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_status TEXT;
    v_allowed TEXT[];
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;

    SELECT public.get_my_role() INTO v_role;
    IF v_role IS NULL OR v_role NOT IN ('ADMINISTRADOR', 'NIVEL_2') THEN
        RAISE EXCEPTION 'Su rol (%) no esta autorizado a cambiar el estado de las ordenes.', COALESCE(v_role, 'sin perfil');
    END IF;

    IF p_new_status NOT IN ('CREADO', 'APROBADO', 'RECHAZADO', 'EN_PROCESO', 'COMPLETADO') THEN
        RAISE EXCEPTION 'Estado invalido. Use close_quote para cerrar una orden.';
    END IF;

    SELECT status INTO v_status FROM public.quotes WHERE id = p_quote_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La orden especificada no existe.';
    END IF;

    v_allowed := CASE v_status
        WHEN 'CREADO' THEN ARRAY['APROBADO', 'RECHAZADO']::TEXT[]
        WHEN 'RECHAZADO' THEN ARRAY['CREADO']::TEXT[]
        WHEN 'APROBADO' THEN ARRAY['EN_PROCESO']::TEXT[]
        WHEN 'EN_PROCESO' THEN ARRAY['COMPLETADO']::TEXT[]
        ELSE ARRAY[]::TEXT[]
    END;

    IF NOT (p_new_status = ANY (v_allowed)) THEN
        RAISE EXCEPTION 'Transicion no permitida: % -> %.', v_status, p_new_status;
    END IF;

    UPDATE public.quotes SET status = p_new_status, updated_at = NOW() WHERE id = p_quote_id;
END;
$$;

-- ------------------------------------------------------------
-- 6. Cierre financiero: liquidado a $0.00 + factura externa
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.close_quote(
    p_quote_id UUID,
    p_external_invoice_number TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_status TEXT;
    v_total NUMERIC(10,2);
    v_total_abonos NUMERIC(10,2);
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;

    SELECT public.get_my_role() INTO v_role;
    IF v_role IS NULL OR v_role NOT IN ('ADMINISTRADOR', 'NIVEL_2') THEN
        RAISE EXCEPTION 'Su rol (%) no esta autorizado a cerrar ordenes.', COALESCE(v_role, 'sin perfil');
    END IF;

    IF COALESCE(trim(p_external_invoice_number), '') = '' THEN
        RAISE EXCEPTION 'El numero de factura externa es obligatorio para cerrar la orden.';
    END IF;

    SELECT status, total INTO v_status, v_total
    FROM public.quotes WHERE id = p_quote_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La orden especificada no existe.';
    END IF;

    IF v_status <> 'COMPLETADO' THEN
        RAISE EXCEPTION 'Solo se pueden cerrar ordenes COMPLETADAS (estado actual: %).', v_status;
    END IF;

    SELECT COALESCE(SUM(amount), 0.00) INTO v_total_abonos
    FROM public.payments WHERE quote_id = p_quote_id;

    IF (v_total - v_total_abonos) <> 0.00 THEN
        RAISE EXCEPTION 'La orden debe estar liquidada (saldo $0.00) para cerrarse. Saldo actual: $%.', (v_total - v_total_abonos);
    END IF;

    UPDATE public.quotes
    SET status = 'CERRADO',
        external_invoice_number = trim(p_external_invoice_number),
        updated_at = NOW()
    WHERE id = p_quote_id;
END;
$$;

-- ------------------------------------------------------------
-- 7. Modificacion de abonos (ADMIN cualquiero; NIVEL_3 propios)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.modify_abono(
    p_payment_id UUID,
    p_amount NUMERIC(10,2),
    p_payment_method TEXT,
    p_observation TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_quote_id UUID;
    v_owner UUID;
    v_quote_status TEXT;
    v_total NUMERIC(10,2);
    v_otros_abonos NUMERIC(10,2);
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;

    SELECT public.get_my_role() INTO v_role;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'El monto del abono debe ser mayor a 0.';
    END IF;

    IF p_payment_method NOT IN ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA') THEN
        RAISE EXCEPTION 'Metodo de pago invalido.';
    END IF;

    SELECT quote_id, created_by INTO v_quote_id, v_owner
    FROM public.payments WHERE id = p_payment_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El abono especificado no existe.';
    END IF;

    IF v_role IS NULL OR (v_role <> 'ADMINISTRADOR' AND NOT (v_role = 'NIVEL_3' AND v_owner = auth.uid())) THEN
        RAISE EXCEPTION 'Solo ADMINISTRADOR puede modificar cualquier recibo; NIVEL_3 unicamente los propios.';
    END IF;

    SELECT status, total INTO v_quote_status, v_total
    FROM public.quotes WHERE id = v_quote_id FOR UPDATE;

    IF v_quote_status = 'CERRADO' THEN
        RAISE EXCEPTION 'No se puede modificar un abono de una orden CERRADA.';
    END IF;

    SELECT COALESCE(SUM(amount), 0.00) INTO v_otros_abonos
    FROM public.payments WHERE quote_id = v_quote_id AND id <> p_payment_id;

    IF (v_otros_abonos + p_amount) > v_total THEN
        RAISE EXCEPTION 'El nuevo monto ($%) supera el saldo disponible ($%).', p_amount, (v_total - v_otros_abonos);
    END IF;

    UPDATE public.payments
    SET amount = p_amount,
        payment_method = p_payment_method,
        observation = p_observation
    WHERE id = p_payment_id;
END;
$$;

-- ------------------------------------------------------------
-- 8. Eliminacion de abonos (solo ADMINISTRADOR)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_abono(p_payment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_quote_id UUID;
    v_quote_status TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;

    SELECT public.get_my_role() INTO v_role;

    SELECT quote_id INTO v_quote_id
    FROM public.payments WHERE id = p_payment_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El abono especificado no existe.';
    END IF;

    IF v_role IS NULL OR v_role <> 'ADMINISTRADOR' THEN
        RAISE EXCEPTION 'Solo ADMINISTRADOR puede eliminar abonos.';
    END IF;

    SELECT status INTO v_quote_status FROM public.quotes WHERE id = v_quote_id FOR UPDATE;

    IF v_quote_status = 'CERRADO' THEN
        RAISE EXCEPTION 'No se puede eliminar un abono de una orden CERRADA.';
    END IF;

    DELETE FROM public.payments WHERE id = p_payment_id;
END;
$$;

-- ------------------------------------------------------------
-- 9. Eliminacion de cotizaciones (solo ADMINISTRADOR, sin abonos)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_quote(p_quote_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;

    SELECT public.get_my_role() INTO v_role;

    IF v_role IS NULL OR v_role <> 'ADMINISTRADOR' THEN
        RAISE EXCEPTION 'Solo ADMINISTRADOR puede eliminar cotizaciones.';
    END IF;

    PERFORM 1 FROM public.quotes WHERE id = p_quote_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La cotizacion especificada no existe.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.payments WHERE quote_id = p_quote_id) THEN
        RAISE EXCEPTION 'No se puede eliminar una orden con abonos registrados.';
    END IF;

    DELETE FROM public.quote_items WHERE quote_id = p_quote_id;
    DELETE FROM public.quotes WHERE id = p_quote_id;
END;
$$;

-- ------------------------------------------------------------
-- 10. Listado de operarios (para asignacion en cotizaciones)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_operarios()
RETURNS TABLE (id UUID, user_code TEXT, full_name TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT p.id, p.user_code, p.full_name
    FROM public.profiles p
    ORDER BY p.user_code;
$$;
