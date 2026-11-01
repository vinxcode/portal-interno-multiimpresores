'use client';

import { useState } from 'react';
import { ClipboardList, DollarSign, FileText } from 'lucide-react';
import { CerradasReport } from './CerradasReport';
import { EnProcesoReport } from './EnProcesoReport';
import { PendientesReport } from './PendientesReport';
import type { Client, Operario } from '@/lib/types/database';

interface ReportsViewProps {
  operarios: Operario[];
  clients: Client[];
}

type ReportTab = 'proceso' | 'pendientes' | 'cerradas';

const TABS: { id: ReportTab; label: string; icon: typeof ClipboardList }[] = [
  { id: 'proceso', label: 'Trabajos en Proceso', icon: ClipboardList },
  { id: 'pendientes', label: 'Cotizaciones Pendientes', icon: FileText },
  { id: 'cerradas', label: 'Cerradas e Ingresos', icon: DollarSign },
];

export function ReportsView({ operarios, clients }: ReportsViewProps) {
  const [tab, setTab] = useState<ReportTab>('proceso');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-2">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active ? 'bg-brand-navy text-white' : 'text-brand-muted hover:bg-brand-surface hover:text-brand-dark'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === 'proceso' ? <EnProcesoReport operarios={operarios} clients={clients} /> : null}
      {tab === 'pendientes' ? <PendientesReport clients={clients} /> : null}
      {tab === 'cerradas' ? <CerradasReport clients={clients} /> : null}
    </div>
  );
}
