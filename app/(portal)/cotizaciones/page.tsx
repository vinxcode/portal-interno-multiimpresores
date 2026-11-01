import type { Metadata } from 'next';
import { QuoteBuilder } from '@/components/cotizador/QuoteBuilder';
import { QuoteHistoryList } from '@/components/cotizador/QuoteHistoryList';
import { canDeleteQuotes, canManageClients, canManageQuotes } from '@/lib/auth/roles';
import { requireProfile } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { Client, Operario, QuoteWithRelations } from '@/lib/types/database';

export const metadata: Metadata = {
  title: 'Cotizaciones - MULTI IMPRESORES',
};

export default async function CotizacionesPage() {
  const profile = await requireProfile();
  const supabase = await getSupabaseServerClient();

  const { data: clientsData } = await supabase.from('clients').select('*').order('name');
  const { data: operariosData } = await supabase.rpc('list_operarios');
  const { data: quotesData } = await supabase
    .from('quotes')
    .select(
      `*,
      client:clients(*),
      items:quote_items(*),
      payments(*, profile:profiles(id, user_code, full_name)),
      assigned:profiles!quotes_assigned_to_fkey(id, user_code, full_name),
      creator:profiles!quotes_created_by_fkey(id, user_code, full_name)`
    )
    .order('created_at', { ascending: false })
    .limit(50);

  const clients = (clientsData as Client[] | null) ?? [];
  const operarios = (operariosData as unknown as Operario[] | null) ?? [];
  const quotes = (quotesData as unknown as QuoteWithRelations[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-brand-navy">Cotizaciones y Órdenes de Trabajo</h1>
        <p className="text-sm text-brand-muted">
          Crea cotizaciones, conviértelas en OT al aprobarse y administra su historial.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_400px]">
        <QuoteBuilder
          canManageQuotes={canManageQuotes(profile.role)}
          canManageClients={canManageClients(profile.role)}
          clients={clients}
          operarios={operarios}
        />
        <QuoteHistoryList
          quotes={quotes}
          canManageQuotes={canManageQuotes(profile.role)}
          canDelete={canDeleteQuotes(profile.role)}
        />
      </div>
    </div>
  );
}
