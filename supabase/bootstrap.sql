-- ============================================================
-- Bootstrap: sincroniza usuarios de Supabase Auth con profiles
-- Ejecutar DESPUES de crear los usuarios en Authentication > Users.
-- Reejecutable (ON CONFLICT DO NOTHING).
--
-- Convencion: el acceso al portal es por Codigo de Identificacion
-- Interna (ej. 00126). Cada usuario se crea en Supabase Auth con
-- el email sintetico "codigo@internal.multiimpresores".
--
-- Rol: se toma del user metadata "role" (ADMINISTRADOR / NIVEL_2 /
-- NIVEL_3). Si se omite, se asigna NIVEL_3 (minimo privilegio) y
-- debe promoverse manualmente.
-- ============================================================

INSERT INTO public.profiles (id, user_code, full_name, role)
SELECT
    u.id,
    split_part(u.email, '@', 1),
    COALESCE(NULLIF(u.raw_user_meta_data->>'full_name', ''), 'Usuario ' || split_part(u.email, '@', 1)),
    CASE u.raw_user_meta_data->>'role'
        WHEN 'ADMINISTRADOR' THEN 'ADMINISTRADOR'
        WHEN 'NIVEL_2' THEN 'NIVEL_2'
        WHEN 'NIVEL_3' THEN 'NIVEL_3'
        ELSE 'NIVEL_3'
    END
FROM auth.users u
WHERE u.email LIKE '%@internal.multiimpresores'
ON CONFLICT (id) DO NOTHING;

-- Verificacion / ajuste manual de roles:
-- SELECT user_code, full_name, role FROM public.profiles ORDER BY user_code;
-- UPDATE public.profiles SET role = 'ADMINISTRADOR' WHERE user_code = '00126';
-- UPDATE public.profiles SET role = 'NIVEL_2' WHERE user_code = '00130';
-- UPDATE public.profiles SET role = 'NIVEL_3' WHERE user_code = '00145';
