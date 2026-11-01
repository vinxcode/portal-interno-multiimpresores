'use client';

import { RefreshCw, SearchX, TriangleAlert } from 'lucide-react';
import { Button } from './Button';

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="h-9 flex-1 animate-pulse rounded bg-brand-surface" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <SearchX className="h-8 w-8 text-brand-muted" aria-hidden />
      <p className="text-sm font-medium text-brand-dark">{title}</p>
      {description ? <p className="text-xs text-brand-muted">{description}</p> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-red-200 bg-red-50 px-6 py-10 text-center">
      <TriangleAlert className="h-8 w-8 text-red-600" aria-hidden />
      <p className="text-sm font-medium text-red-700">{message}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden />
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}
