'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, LogIn, TriangleAlert, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { loginSchema } from '@/lib/schemas/login';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { BUSINESS, USER_CODE_STORAGE_KEY, toInternalEmail } from '@/lib/constants';

interface LoginFieldErrors {
  userCode?: string;
  password?: string;
}

export function LoginForm() {
  const router = useRouter();
  const [userCode, setUserCode] = useState('');
  const [password, setPassword] = useState('');
  const [rememberUser, setRememberUser] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});

  const configured = isSupabaseConfigured();

  useEffect(() => {
    const storedCode = window.localStorage.getItem(USER_CODE_STORAGE_KEY);
    if (storedCode) {
      setUserCode(storedCode);
      setRememberUser(true);
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const parsed = loginSchema.safeParse({ userCode: userCode.trim(), password, rememberUser });
    if (!parsed.success) {
      const errors: LoginFieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === 'userCode' || key === 'password') {
          errors[key] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    if (!configured) {
      setError('Supabase no está configurado. Copie .env.example a .env.local (ver supabase/SETUP.md).');
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: toInternalEmail(parsed.data.userCode),
        password: parsed.data.password,
      });

      if (authError) {
        setError('Código de usuario o contraseña incorrectos.');
        return;
      }

      if (parsed.data.rememberUser) {
        window.localStorage.setItem(USER_CODE_STORAGE_KEY, parsed.data.userCode);
      } else {
        window.localStorage.removeItem(USER_CODE_STORAGE_KEY);
      }

      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError('No se pudo conectar con el servidor de autenticación. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-brand-navy">{BUSINESS.name}</h1>
          <p className="mt-1 text-xs font-medium tracking-wide text-brand-muted">{BUSINESS.tagline.toUpperCase()}</p>
        </div>

        {!configured ? (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
            <p className="text-xs text-amber-800">
              Supabase no está configurado. Complete .env.local siguiendo supabase/SETUP.md para habilitar el acceso.
            </p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Field label="Código de Identificación Interna" htmlFor="user-code" error={fieldErrors.userCode} hint="Ej. 00126">
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <Input
                id="user-code"
                value={userCode}
                onChange={(e) => setUserCode(e.target.value)}
                placeholder="00126"
                autoComplete="off"
                className="pl-9"
                disabled={loading}
              />
            </div>
          </Field>

          <Field label="Contraseña" htmlFor="password" error={fieldErrors.password}>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="pl-9"
                disabled={loading}
              />
            </div>
          </Field>

          <label className="flex items-center gap-2 text-sm text-brand-dark">
            <input
              type="checkbox"
              checked={rememberUser}
              onChange={(e) => setRememberUser(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-cobalt focus:ring-brand-cobalt"
              disabled={loading}
            />
            Recordar Usuario
          </label>

          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" loading={loading} disabled={!configured} className="w-full">
            <LogIn className="h-4 w-4" aria-hidden />
            Ingresar
          </Button>
        </form>
      </div>
      <p className="mt-4 text-center text-xs text-brand-muted">
        El acceso es exclusivo para personal autorizado. Nunca se almacena la contraseña.
      </p>
    </div>
  );
}
