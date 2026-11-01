'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PackagePlus, Pencil, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { ProductFormModal } from './ProductFormModal';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/format';
import type { Product } from '@/lib/types/database';

interface ProductSearchTableProps {
  canSeePurchasePrice: boolean;
  canCreate: boolean;
  canEdit: boolean;
}

export function ProductSearchTable({ canSeePurchasePrice, canCreate, canEdit }: ProductSearchTableProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (fetchError) {
        setError('No se pudo cargar el catálogo de productos. Intente de nuevo.');
        return;
      }
      setProducts((data as Product[] | null) ?? []);
    } catch {
      setError('No se pudo conectar con Supabase. Verifique la configuración (.env.local).');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (product) => product.name.toLowerCase().includes(term) || product.code.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-brand-dark">Buscador de Productos</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código o nombre..."
              className="w-64 pl-9"
              aria-label="Buscar productos"
            />
          </div>
          {canCreate ? (
            <Button
              onClick={() => {
                setEditingProduct(null);
                setModalOpen(true);
              }}
            >
              <PackagePlus className="h-4 w-4" aria-hidden />
              Nuevo Producto
            </Button>
          ) : null}
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <TableSkeleton rows={6} columns={canSeePurchasePrice ? 6 : 5} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : products.length === 0 ? (
          <EmptyState
            title="No hay productos en el catálogo"
            description={canCreate ? 'Cree el primer producto del taller con el botón Nuevo Producto.' : 'Un usuario autorizado debe cargar el catálogo.'}
          />
        ) : filtered.length === 0 ? (
          <EmptyState title="Sin resultados" description="Ningún producto coincide con la búsqueda." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-brand-surface text-left text-xs font-semibold uppercase tracking-wide text-brand-muted">
                  <th className="px-3 py-2">Código</th>
                  <th className="px-3 py-2">Nombre</th>
                  {canSeePurchasePrice ? <th className="px-3 py-2 text-right">P. Compra</th> : null}
                  <th className="px-3 py-2 text-right">P. Venta</th>
                  <th className="px-3 py-2 text-right">P. Mayoreo</th>
                  <th className="px-3 py-2">Observación</th>
                  {canEdit ? <th className="px-3 py-2 text-right">Acciones</th> : null}
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id} className="border-b border-slate-100 last:border-0 hover:bg-brand-light">
                    <td className="px-3 py-2 font-semibold text-brand-dark">{product.code}</td>
                    <td className="px-3 py-2 text-brand-dark">{product.name}</td>
                    {canSeePurchasePrice ? (
                      <td className="px-3 py-2 text-right font-semibold text-brand-dark">
                        {formatCurrency(product.purchase_price)}
                      </td>
                    ) : null}
                    <td className="px-3 py-2 text-right font-semibold text-brand-dark">
                      {formatCurrency(product.sale_price)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-brand-dark">
                      {product.wholesale_price !== null ? formatCurrency(product.wholesale_price) : '-'}
                    </td>
                    <td className="max-w-64 px-3 py-2 text-xs text-brand-muted">{product.observation ?? '-'}</td>
                    {canEdit ? (
                      <td className="px-3 py-2 text-right">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setEditingProduct(product);
                            setModalOpen(true);
                          }}
                          aria-label={`Editar ${product.code}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProductFormModal
        open={modalOpen}
        product={editingProduct}
        onClose={() => setModalOpen(false)}
        onSaved={() => void load()}
      />
    </section>
  );
}
