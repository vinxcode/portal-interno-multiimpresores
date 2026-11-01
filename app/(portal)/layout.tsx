import { redirect } from 'next/navigation';
import { NoProfileScreen } from '@/components/auth/NoProfileScreen';
import { PortalHeader } from '@/components/layout/PortalHeader';
import { getCurrentProfile, getCurrentUser } from '@/lib/auth/session';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    const user = await getCurrentUser();
    if (!user) {
      redirect('/login');
    }
    return <NoProfileScreen />;
  }
  return (
    <div className="min-h-screen bg-brand-light">
      <PortalHeader profile={profile} />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">{children}</main>
    </div>
  );
}
