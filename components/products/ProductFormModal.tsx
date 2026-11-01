'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { productSchema } from '@/lib/schemas/product';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Product } from '@/lib/types/database';

interface ProductFormModalProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}

interface ProductFormState {
  code: string;
  name: string;
  purchasePrice: string;
  salePrice: string;
  wholesalePrice: string;
  observation: string;
}

const EMPTY_FORM: ProductFormState = {
  code: '',
  name: '',
  purchasePrice: '',
  salePrice: '',
  wholesalePrice: '',
  observation: '',
};

export function ProductFormModal({ open, product, onClose, onSaved }: ProductFormModalProps) {
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [initializedFor, setInitializedFor] = useState<string | null>(null);

  const targetKey = product ? product.id : 'new';

  if (open && initializedFor !== targetKey) {
    setInitializedFor(targetKey);
    setErrors([]);
    setForm(
      product
        ? {
            code: product.code,
            name: product.name,
            purchasePrice: String(product.purchase_price),
            salePrice: String(product.sale_price),
            wholesalePrice: product.wholesale_price !== null ? String(product.wholesale_price) : '',
            observation: product.observation ?? '',
          }
        : EMPTY_FORM
    );
  }

  if (!open && initializedFor !== null) {
    setInitializedFor(null);
  }

  function update<K extends keyof ProductFormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors([]);

    const parsed = productSchema.safeParse({
      code: form.code.trim(),
      name: form.name.trim(),
      purchasePrice: Number(form.purchasePrice),
      salePrice: Number(form.salePrice),
      wholesalePrice: form.wholesalePrice.trim() === '' ? undefined : Number(form.wholesalePrice),
      observation: form.observation.trim() === '' ? undefined : form.observation.trim(),
    });

    if (!parsed.success) {
      setErrors(parsed.error.issues.map((issue) => issue.message));
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const payload = {
        code: parsed.data.code,
        name: parsed.data.name,
        purchase_price: parsed.data.purchasePrice,
        sale_price: parsed.data.salePrice,
        wholesale_price: parsed.data.wholesalePrice ?? 0,
        observation: parsed.data.observation ?? null,
      };
      const { error: saveError } = product
        ? await supabase.from('products').update(payload).eq('id', product.id)
        : await supabase.from('products').insert(payload);

      if (saveError) {
        setErrors([saveError.message.includes('duplicate') ? 'El código de producto ya existe.' : saveError.message]);
        return;
      }

      onSaved();
      onClose();
    } catch {
      setErrors(['No se pudo guardar el producto. Intente de nuevo.']);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} title={product ? 'Editar Producto' : 'Nuevo Producto'} onClose={loading ? () => undefined : onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Código" htmlFor="product-code">
          <Input id="product-code" value={form.code} onChange={(e) => update('code', e.target.value)} disabled={loading} placeholder="TAZ-15" />
        </Field>
        <Field label="Nombre" htmlFor="product-name">
          <Input id="product-name" value={form.name} onChange={(e) => update('name', e.target.value)} disabled={loading} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="P. Compra" htmlFor="product-purchase">
            <Input id="product-purchase" type="number" min="0" step="0.01" value={form.purchasePrice} onChange={(e) => update('purchasePrice', e.target.value)} disabled={loading} />
          </Field>
          <Field label="P. Venta" htmlFor="product-sale">
            <Input id="product-sale" type="number" min="0" step="0.01" value={form.salePrice} onChange={(e) => update('salePrice', e.target.value)} disabled={loading} />
          </Field>
          <Field label="P. Mayoreo" htmlFor="product-wholesale">
            <Input id="product-wholesale" type="number" min="0" step="0.01" value={form.wholesalePrice} onChange={(e) => update('wholesalePrice', e.target.value)} disabled={loading} />
          </Field>
        </div>
        <Field label="Observación" htmlFor="product-observation">
          <Textarea id="product-observation" value={form.observation} onChange={(e) => update('observation', e.target.value)} disabled={loading} />
        </Field>

        {errors.length > 0 ? (
          <div className="rounded-md bg-red-50 px-3 py-2" role="alert">
            {errors.map((message) => (
              <p key={message} className="text-xs font-medium text-red-700">
                {message}
              </p>
            ))}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            {product ? 'Guardar Cambios' : 'Crear Producto'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
