import type { Metadata } from 'next';
import { RecibosView } from '@/components/recibos/RecibosView';
import { requireProfile } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { QuoteWithRelations } from '@/lib/types/database';

export const metadata: Metadata = {
  title: 'Recibos - MULTI IMPRESORES',
};

interface RecibosPageProps {
  searchParams: Promise<{ quote?: string }>;
}

export default async function RecibosPage({ searchParams }: RecibosPageProps) {
  const profile = await requireProfile();
  const { quote: quoteParam } = await searchParams;
  const supabase = await getSupabaseServerClient();

  const { data } = await supabase
    .from('quotes')
    .select(
      `*,
      client:clients(*),
      items:quote_items(*),
      payments(*, profile:profiles(id, user_code, full_name)),
      assigned:profiles!quotes_assigned_to_fkey(id, user_code, full_name),
      creator:profiles!quotes_created_by_fkey(id, user_code, full_name)`
    )
    .neq('status', 'RECHAZADO')
    .order('created_at', { ascending: false })
    .limit(100);

  const quotes = (data as unknown as QuoteWithRelations[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-brand-navy">Recibos y Control de Pagos</h1>
        <p className="text-sm text-brand-muted">
          Registra abonos parciales, imprime tickets POS 80mm y cierra órdenes liquidadas.
        </p>
      </div>
      <RecibosView quotes={quotes} profile={profile} initialQuoteId={quoteParam ?? null} />
    </div>
  );
}
