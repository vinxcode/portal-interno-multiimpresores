'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/states';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/format';
import { round2 } from '@/lib/financial';
import type { Product } from '@/lib/types/database';
import type { QuoteItemDraft } from '@/store/quoteStore';

interface QuoteItemsEditorProps {
  items: QuoteItemDraft[];
  onAddItem: (item?: { detail?: string; unitPrice?: number }) => void;
  onUpdateItem: (localId: string, patch: Partial<Omit<QuoteItemDraft, 'localId'>>) => void;
  onRemoveItem: (localId: string) => void;
}

function ProductSearchInput({
  onPick,
  disabled,
}: {
  onPick: (product: Product) => void;
  disabled?: boolean;
}) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clean = term.trim().replace(/[,()]/g, ' ').trim();
    if (clean.length < 2) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      setError(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error: fetchError } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .or(`name.ilike.%${clean}%,code.ilike.%${clean}%`)
          .limit(8);
        if (fetchError) {
          setError(true);
          setResults([]);
          return;
        }
        setResults((data as Product[] | null) ?? []);
        setOpen(true);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handlePick(product: Product) {
    onPick(product);
    setTerm('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar producto del catálogo para agregarlo..."
          className="pl-9"
          disabled={disabled}
          aria-label="Buscar producto del catálogo"
        />
      </div>
      {open ? (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
          {loading ? (
            <p className="px-3 py-2 text-xs text-brand-muted">Buscando...</p>
          ) : error ? (
            <p className="px-3 py-2 text-xs text-red-600">Error al buscar productos.</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-brand-muted">Sin resultados en el catálogo.</p>
          ) : (
            results.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handlePick(product)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-brand-surface"
              >
                <span className="truncate">
                  <span className="font-semibold text-brand-dark">{product.code}</span>
                  <span className="text-brand-muted"> - {product.name}</span>
                </span>
                <span className="whitespace-nowrap text-xs font-semibold text-brand-dark">
                  {formatCurrency(product.sale_price)}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

export function QuoteItemsEditor({ items, onAddItem, onUpdateItem, onRemoveItem }: QuoteItemsEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-brand-dark">Ítems de la Cotización</h3>
        <Button type="button" variant="secondary" size="sm" onClick={() => onAddItem()}>
          <Plus className="h-4 w-4" aria-hidden />
          Agregar ítem
        </Button>
      </div>

      <ProductSearchInput onPick={(product) => onAddItem({ detail: product.name, unitPrice: product.sale_price })} />

      {items.length === 0 ? (
        <EmptyState title="Sin ítems" description="Agregue ítems desde el catálogo o manualmente con el botón Agregar ítem." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-brand-surface text-left text-xs font-semibold uppercase tracking-wide text-brand-muted">
                <th className="w-20 px-2 py-2">Cant.</th>
                <th className="px-2 py-2">Ítem</th>
                <th className="w-28 px-2 py-2">P. Unidad</th>
                <th className="w-28 px-2 py-2 text-right">Total</th>
                <th className="w-12 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.localId} className="border-b border-slate-100 last:border-0">
                  <td className="px-2 py-1.5">
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(e) => onUpdateItem(item.localId, { quantity: e.target.value === '' ? 0 : Number(e.target.value) })}
                      aria-label="Cantidad"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      value={item.detail}
                      onChange={(e) => onUpdateItem(item.localId, { detail: e.target.value })}
                      placeholder="Detalle del producto o servicio"
                      aria-label="Detalle del ítem"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => onUpdateItem(item.localId, { unitPrice: e.target.value === '' ? 0 : Number(e.target.value) })}
                      aria-label="Precio unitario"
                    />
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right font-semibold text-brand-dark">
                    {formatCurrency(round2(item.quantity * item.unitPrice))}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.localId)}
                      className="rounded p-1 text-brand-muted transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label="Eliminar ítem"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
