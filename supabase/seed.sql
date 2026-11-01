-- ============================================================
-- Seed: datos de demostracion (opcional).
-- Ejecutar DESPUES de migrations y bootstrap.sql.
-- ============================================================

-- Clientes de muestra
INSERT INTO public.clients (doc_id, name, phone, email) VALUES
    ('0614-120214-101-2', 'Comercial El Progreso S.A. de C.V.', '2261-8890', 'ventas@elprogreso.com'),
    ('1024-330517-001-4', 'Ferreteria La Bendicion', '7788-4512', NULL),
    ('0518-220118-102-7', 'Instituto Educativo Nuevo Amanecer', '2222-9087', 'admin@nuevoamanecer.edu'),
    ('1234-567890-101-1', 'Cafe & Sabor (Ana Marina Rodriguez)', '7011-2345', NULL),
    ('0819-090217-103-3', 'Distribuidora Central de Ropa', '2455-1200', 'compras@distcentral.com'),
    ('2233-110225-001-9', 'Municipalidad de San Bartolo', '2333-4455', NULL);

-- Productos de muestra (precios INCLUYEN IVA 13%)
INSERT INTO public.products (code, name, purchase_price, sale_price, wholesale_price, observation) VALUES
    ('TAZ-15', 'Taza ceramica blanca 15oz (sublimada)', 2.50, 6.75, 5.90, 'Incluye diseno sencillo'),
    ('TAZ-MAG', 'Taza magica 11oz (sublimada)', 3.10, 8.50, 7.50, 'Cambia de color con el calor'),
    ('CAM-ALG', 'Camiseta algodon cuello redondo (serigrafia por unidad)', 3.80, 9.90, 8.40, 'Tallas S-XL, hasta 2 tintas'),
    ('CAM-DRY', 'Camiseta dry-fit deportiva (sublimacion total)', 6.20, 16.50, 14.20, 'Tecnicas en color'),
    ('GOR-SUB', 'Gorra algodon con bordado', 4.10, 10.50, 9.00, NULL),
    ('BOT-TERM', 'Botella termica 500ml sublimada', 5.40, 13.75, 12.00, 'Acero inoxidable'),
    ('LOD-A4', 'Block de hojas carta con espiral (impresion digital)', 1.15, 3.25, 2.80, '50 hojas papel bond 20'),
    ('TAR-PVC', 'Tarjeta PVC 1 cara full color (lote 100)', 18.00, 45.00, 39.00, 'Incluye QR o codigo de barras'),
    ('CAL-PAR', 'Calendario de pared media carta (tira capsula)', 1.90, 5.25, 4.50, 'Impresion 4x4 cara principal'),
    ('STI-VIN', 'Sticker vinilo die-cut (lote 50)', 6.50, 16.00, 13.50, 'Resistente al agua'),
    ('BAN-VIN', 'Banner vinilo 13oz (por m2)', 3.20, 8.75, 7.25, 'Incluye ojillos'),
    ('FLY-100', 'Volantes media carta (lote 100, 4x4)', 4.75, 12.50, 10.80, 'Papel propalcote 120g')
ON CONFLICT (code) DO NOTHING;

-- Ordenes de muestra (correlativos, totales y abonos consistentes
-- con el modelo de precios con IVA incluido)
DO $$
DECLARE
    v_year TEXT := EXTRACT(YEAR FROM NOW())::INT::TEXT;
    v_admin UUID;
    v_client1 UUID;
    v_client2 UUID;
    v_client3 UUID;
    v_quote1 UUID;
    v_quote2 UUID;
    v_quote3 UUID;
BEGIN
    SELECT id INTO v_admin FROM public.profiles
    ORDER BY (role = 'ADMINISTRADOR') DESC, user_code LIMIT 1;

    IF v_admin IS NULL THEN
        RAISE NOTICE 'No hay perfiles: ejecute bootstrap.sql antes de seed.sql. Se omiten las ordenes de muestra.';
        RETURN;
    END IF;

    SELECT id INTO v_client1 FROM public.clients WHERE name LIKE 'Comercial El Progreso%' LIMIT 1;
    SELECT id INTO v_client2 FROM public.clients WHERE name LIKE 'Ferreteria La Bendicion%' LIMIT 1;
    SELECT id INTO v_client3 FROM public.clients WHERE name LIKE 'Instituto Educativo%' LIMIT 1;

    -- OT 001: CREADO (pendiente de aprobacion) - 200 tazas, bruto $1350.00
    INSERT INTO public.quotes (
        correlative, client_id, status,
        subtotal_sin_iva, iva_total, subtotal_con_iva, retencion_renta, discount, total,
        notes, created_by
    ) VALUES (
        '001-' || v_year, v_client1, 'CREADO',
        1194.69, 155.31, 1350.00, 0.00, 0.00, 1350.00,
        'Reposicion anual de tazas corporativas', v_admin
    )
    RETURNING id INTO v_quote1;

    INSERT INTO public.quote_items (quote_id, quantity, detail, unit_price, total_price) VALUES
        (v_quote1, 200, 'Taza ceramica blanca 15oz sublimada con logo', 6.75, 1350.00);

    -- OT 002: EN_PROCESO con abonos parciales - bruto $226.00
    INSERT INTO public.quotes (
        correlative, client_id, status,
        subtotal_sin_iva, iva_total, subtotal_con_iva, retencion_renta, discount, total,
        notes, created_by, assigned_to
    ) VALUES (
        '002-' || v_year, v_client2, 'EN_PROCESO',
        200.00, 26.00, 226.00, 0.00, 0.00, 226.00,
        'Uniformes de personal de ventas', v_admin, v_admin
    )
    RETURNING id INTO v_quote2;

    INSERT INTO public.quote_items (quote_id, quantity, detail, unit_price, total_price) VALUES
        (v_quote2, 100, 'Camiseta algodon serigrafia 1 tinta', 1.13, 113.00),
        (v_quote2, 2, 'Gorra algodon con bordado al frente', 56.50, 113.00);

    INSERT INTO public.payments (quote_id, amount, payment_method, observation, created_by) VALUES
        (v_quote2, 50.00, 'EFECTIVO', 'Abono inicial', v_admin),
        (v_quote2, 76.00, 'TRANSFERENCIA', 'Abono secundario', v_admin);

    -- OT 003: COMPLETADO liquidado a $0.00 (listo para cierre) - bruto $113.00, descuento $13.00
    INSERT INTO public.quotes (
        correlative, client_id, status,
        subtotal_sin_iva, iva_total, subtotal_con_iva, retencion_renta, discount, total,
        notes, created_by, assigned_to
    ) VALUES (
        '003-' || v_year, v_client3, 'COMPLETADO',
        100.00, 13.00, 113.00, 0.00, 13.00, 100.00,
        'Diplomas de graduacion (descuento institucional)', v_admin, v_admin
    )
    RETURNING id INTO v_quote3;

    INSERT INTO public.quote_items (quote_id, quantity, detail, unit_price, total_price) VALUES
        (v_quote3, 1, 'Impresion de diplomas media carta (lote)', 113.00, 113.00);

    INSERT INTO public.payments (quote_id, amount, payment_method, observation, created_by) VALUES
        (v_quote3, 40.00, 'EFECTIVO', 'Anticipo 50%', v_admin),
        (v_quote3, 60.00, 'TARJETA', 'Liquidacion', v_admin);

    -- Sincronizar contador de correlativos
    INSERT INTO public.quote_correlatives (year, last_number)
    VALUES (EXTRACT(YEAR FROM NOW())::INT, 3)
    ON CONFLICT (year) DO UPDATE
    SET last_number = GREATEST(public.quote_correlatives.last_number, 3);
END $$;
