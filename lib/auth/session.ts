import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/lib/types/database';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user ?? null;
  } catch {
    return null;
  }
}

export async function getCurrentProfile(): Promise<Profile | null> {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    return (data as Profile | null) ?? null;
  } catch {
    return null;
  }
}

export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect('/login');
  }
  return profile;
}
