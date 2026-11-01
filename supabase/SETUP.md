# Guia de Puesta en Marcha (Supabase)

La aplicacion se construye y verifica (`tsc`, `test`, `lint`, `build`) sin conexion,
pero para funcionar en runtime necesita un proyecto Supabase. Siga estos pasos.

## 1. Crear el proyecto
1. Cree un proyecto en https://supabase.com (Plan gratuito es suficiente).
2. En **Project Settings > API** guarde la `Project URL` y la `anon key`.

## 2. Aplicar migraciones (SQL Editor, en este orden)
1. `supabase/migrations/0001_schema.sql` - tablas, indices y contador de correlativos.
2. `supabase/migrations/0002_rls_policies.sql` - RLS segun la matriz de 3 niveles.
3. `supabase/migrations/0003_rpc_functions.sql` - funciones atomicas (abonos, cotizaciones, cierres).

## 3. Habilitar el login por codigo interno
En **Authentication > Sign In / Providers > Email** desactive **"Confirm email"**
(los correos son sinteticos y no existen, no deben requerir confirmacion).

## 4. Crear usuarios internos
En **Authentication > Users > Add user**, por cada operador:
- **Email:** `00126@internal.multiimpresores` (el codigo interno como parte local).
- **Password:** la contrasena del operador.
- **User metadata** (opcional): `{ "full_name": "Nombre Apellido", "role": "ADMINISTRADOR" }`
  Roles validos: `ADMINISTRADOR`, `NIVEL_2`, `NIVEL_3`. Si se omite, se asigna `NIVEL_3`.

## 5. Bootstrap de perfiles
Ejecute `supabase/bootstrap.sql` (sincroniza `auth.users` con `public.profiles`).
Revise y ajuste roles si es necesario:

```sql
SELECT user_code, full_name, role FROM public.profiles ORDER BY user_code;
UPDATE public.profiles SET role = 'ADMINISTRADOR' WHERE user_code = '00126';
```

## 6. Datos de demostracion (opcional)
Ejecute `supabase/seed.sql`: 6 clientes, 12 productos y 3 ordenes de muestra
(una CREADO, una EN_PROCESO con abonos y una COMPLETADA liquidada lista para cierre).

## 7. Variables de entorno
Copie `.env.example` a `.env.local` en la raiz del proyecto y complete:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## 8. Ejecutar

```bash
npm install
npm run dev
```

Ingrese en `http://localhost:3000/login` con el **codigo interno** (ej. `00126`) y la contrasena.
"Recordar Usuario" guarda unicamente el codigo en `localStorage`; la contrasena nunca se almacena.

## Notas operativas
- El login convierte el codigo al email sintetico `codigo@internal.multiimpresores`; el operador nunca lo ve.
- Todas las mutaciones financieras (abonos, totales, cierres) pasan por RPC con bloqueos `FOR UPDATE`.
- La app elimina cotizaciones mediante la RPC `delete_quote`, que bloquea ordenes con abonos
  (la eliminacion directa por SQL ejecuta la cascada y borraria los pagos).
- Los correlativos se generan atomicamente desde `quote_correlatives` (formato `NNN-AAAA`).
- Para crear un nuevo operador: paso 4, luego reejecutar `bootstrap.sql`.
