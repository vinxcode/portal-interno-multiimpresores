import type { QuoteStatus } from '@/lib/types/database';

const statusConfig: Record<QuoteStatus, { label: string; className: string }> = {
  CREADO: { label: 'CREADO', className: 'bg-slate-100 text-slate-700 border-slate-300' },
  APROBADO: { label: 'APROBADO', className: 'bg-blue-50 text-blue-700 border-blue-300' },
  EN_PROCESO: { label: 'EN PROCESO', className: 'bg-amber-50 text-amber-700 border-amber-300' },
  COMPLETADO: { label: 'COMPLETADO', className: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
  CERRADO: { label: 'CERRADO', className: 'bg-brand-navy text-white border-brand-navy' },
  RECHAZADO: { label: 'RECHAZADO', className: 'bg-red-50 text-red-700 border-red-300' },
};

export function StatusBadge({ status }: { status: QuoteStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${config.className}`}
    >
      {config.label}
    </span>
  );
}
