import type { Metadata } from 'next';
import { ReportsView } from '@/components/reports/ReportsView';
import { requireProfile } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { Client, Operario } from '@/lib/types/database';

export const metadata: Metadata = {
  title: 'Reportes - MULTI IMPRESORES',
};

export default async function ReportesPage() {
  await requireProfile();
  const supabase = await getSupabaseServerClient();

  const { data: operariosData } = await supabase.rpc('list_operarios');
  const { data: clientsData } = await supabase.from('clients').select('*').order('name');

  const operarios = (operariosData as unknown as Operario[] | null) ?? [];
  const clients = (clientsData as Client[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-brand-navy">Tableros de Control</h1>
        <p className="text-sm text-brand-muted">
          Trabajos en proceso, cotizaciones pendientes y órdenes cerradas con arqueo de caja.
        </p>
      </div>
      <ReportsView operarios={operarios} clients={clients} />
    </div>
  );
}
