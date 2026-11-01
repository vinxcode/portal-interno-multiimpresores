import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { getCurrentProfile } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Acceso al Portal - MULTI IMPRESORES',
};

export default async function LoginPage() {
  const profile = await getCurrentProfile();
  if (profile) {
    redirect('/dashboard');
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-light px-4">
      <LoginForm />
    </main>
  );
}
