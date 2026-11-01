'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useShallow } from 'zustand/react/shallow';
import { CircleCheck, FilePlus2, Image as ImageIcon, Link as LinkIcon, TriangleAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { StatusBadge } from '@/components/ui/Badge';
import { ClientSelect } from './ClientSelect';
import { QuoteItemsEditor } from './QuoteItemsEditor';
import { QuoteTotalsPanel } from './QuoteTotalsPanel';
import { useQuoteStore } from '@/store/quoteStore';
import { calculateQuoteTotals } from '@/lib/financial';
import { quoteSchema } from '@/lib/schemas/quote';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/format';
import type { Client, Operario } from '@/lib/types/database';

interface QuoteBuilderProps {
  canManageQuotes: boolean;
  canManageClients: boolean;
  clients: Client[];
  operarios: Operario[];
}

export function QuoteBuilder({ canManageQuotes, canManageClients, clients, operarios }: QuoteBuilderProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const draft = useQuoteStore(
    useShallow((s) => ({
      editingId: s.editingId,
      correlative: s.correlative,
      status: s.status,
      clientId: s.clientId,
      applyRenta: s.applyRenta,
      discount: s.discount,
      productLink: s.productLink,
      referenceImageUrl: s.referenceImageUrl,
      notes: s.notes,
      assignedTo: s.assignedTo,
    }))
  );
  const items = useQuoteStore(useShallow((s) => s.items));
  const actions = useQuoteStore(
    useShallow((s) => ({
      setClientId: s.setClientId,
      addItem: s.addItem,
      updateItem: s.updateItem,
      removeItem: s.removeItem,
      setApplyRenta: s.setApplyRenta,
      setDiscount: s.setDiscount,
      setProductLink: s.setProductLink,
      setReferenceImageUrl: s.setReferenceImageUrl,
      setNotes: s.setNotes,
      setAssignedTo: s.setAssignedTo,
      startCreate: s.startCreate,
      reset: s.reset,
    }))
  );

  useEffect(() => {
    if (useQuoteStore.getState().items.length === 0 && useQuoteStore.getState().editingId === null) {
      useQuoteStore.getState().startCreate();
    }
  }, []);

  const totals = useMemo(
    () =>
      calculateQuoteTotals(
        items.map((item) => ({ quantity: item.quantity, unitPrice: item.unitPrice })),
        { applyRenta: draft.applyRenta, discount: draft.discount }
      ),
    [items, draft.applyRenta, draft.discount]
  );

  if (!canManageQuotes) {
    return (
      <section className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-6">
        <TriangleAlert className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" aria-hidden />
        <div>
          <h2 className="text-sm font-semibold text-brand-dark">Cotizador no disponible para su rol</h2>
          <p className="mt-1 text-sm text-brand-muted">
            Su rol solo permite consultar cotizaciones y gestionar recibos y abonos. Seleccione una cotización del
            historial para ver su detalle.
          </p>
        </div>
      </section>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationErrors([]);
    setRpcError(null);
    setSuccessMessage(null);

    const parsed = quoteSchema.safeParse({
      clientId: draft.clientId ?? undefined,
      items: items.map((item) => ({
        quantity: item.quantity,
        detail: item.detail.trim(),
        unitPrice: item.unitPrice,
      })),
      applyRenta: draft.applyRenta,
      discount: draft.discount,
      productLink: draft.productLink.trim() === '' ? undefined : draft.productLink.trim(),
      referenceImageUrl: draft.referenceImageUrl.trim() === '' ? undefined : draft.referenceImageUrl.trim(),
      notes: draft.notes.trim() === '' ? undefined : draft.notes.trim(),
      assignedTo: draft.assignedTo,
    });

    if (!parsed.success) {
      setValidationErrors(parsed.error.issues.map((issue) => issue.message));
      return;
    }

    if (parsed.data.discount > totals.subtotalConIva) {
      setValidationErrors([`El descuento no puede superar el subtotal con IVA (${formatCurrency(totals.subtotalConIva)}).`]);
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const rpcArgs = {
        p_client_id: parsed.data.clientId,
        p_items: parsed.data.items.map((item) => ({
          quantity: item.quantity,
          detail: item.detail,
          unit_price: item.unitPrice,
        })),
        p_apply_renta: parsed.data.applyRenta,
        p_discount: parsed.data.discount,
        p_product_link: parsed.data.productLink ?? null,
        p_reference_image_url: parsed.data.referenceImageUrl ?? null,
        p_notes: parsed.data.notes ?? null,
        p_assigned_to: parsed.data.assignedTo ?? null,
      };

      const { data, error } =
        draft.editingId !== null
          ? await supabase.rpc('update_quote', { p_quote_id: draft.editingId, ...rpcArgs })
          : await supabase.rpc('create_quote', rpcArgs);

      if (error) {
        setRpcError(error.message);
        return;
      }

      const result = (data as { quote_id: string; correlative: string }[] | null)?.[0] ?? null;
      setSuccessMessage(
        draft.editingId !== null
          ? `Cotización ${draft.correlative ?? ''} actualizada correctamente.`
          : `Cotización ${result?.correlative ?? ''} creada correctamente.`
      );
      actions.startCreate();
      router.refresh();
    } catch {
      setRpcError('No se pudo guardar la cotización. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-brand-dark">
            {draft.editingId !== null ? `Editando ${draft.correlative ?? ''}` : 'Nueva Cotización'}
          </h2>
          {draft.editingId !== null && draft.status ? <StatusBadge status={draft.status} /> : null}
        </div>
        {draft.editingId !== null ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => actions.startCreate()}>
            <X className="h-4 w-4" aria-hidden />
            Cancelar edición
          </Button>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 p-4" noValidate>
        {successMessage ? (
          <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2" role="status">
            <CircleCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            <p className="text-sm font-medium text-emerald-700">{successMessage}</p>
          </div>
        ) : null}

        {rpcError ? (
          <div className="rounded-md bg-red-50 px-3 py-2" role="alert">
            <p className="text-sm font-medium text-red-700">{rpcError}</p>
          </div>
        ) : null}

        {validationErrors.length > 0 ? (
          <div className="rounded-md bg-red-50 px-3 py-2" role="alert">
            {validationErrors.map((message) => (
              <p key={message} className="text-xs font-medium text-red-700">
                {message}
              </p>
            ))}
          </div>
        ) : null}

        <ClientSelect clients={clients} value={draft.clientId} onChange={actions.setClientId} canManageClients={canManageClients} />

        <QuoteItemsEditor items={items} onAddItem={actions.addItem} onUpdateItem={actions.updateItem} onRemoveItem={actions.removeItem} />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="URL / Link del Producto" htmlFor="product-link">
            <div className="relative">
              <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <Input
                id="product-link"
                value={draft.productLink}
                onChange={(e) => actions.setProductLink(e.target.value)}
                className="pl-9"
                placeholder="https://..."
                disabled={loading}
              />
            </div>
          </Field>
          <Field label="Imagen de Referencia (URL)" htmlFor="reference-image">
            <div className="relative">
              <ImageIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <Input
                id="reference-image"
                value={draft.referenceImageUrl}
                onChange={(e) => actions.setReferenceImageUrl(e.target.value)}
                className="pl-9"
                placeholder="https://.../imagen.jpg"
                disabled={loading}
              />
            </div>
          </Field>
        </div>

        {draft.referenceImageUrl.trim() !== '' ? (
          <div className="flex items-center gap-3">
            <Image
              src={draft.referenceImageUrl.trim()}
              alt="Imagen de referencia"
              width={120}
              height={90}
              unoptimized
              className="rounded-md border border-slate-200 object-cover"
            />
            <p className="text-xs text-brand-muted">Vista previa de la imagen de referencia.</p>
          </div>
        ) : null}

        <Field label="Notas" htmlFor="quote-notes">
          <Textarea
            id="quote-notes"
            value={draft.notes}
            onChange={(e) => actions.setNotes(e.target.value)}
            placeholder="Detalles internos de la orden..."
            disabled={loading}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 md:grid-cols-3">
          <Field label="Asignar operario" htmlFor="assigned-to">
            <Select
              id="assigned-to"
              value={draft.assignedTo ?? ''}
              onChange={(e) => actions.setAssignedTo(e.target.value === '' ? null : e.target.value)}
              disabled={loading}
            >
              <option value="">Sin asignar</option>
              {operarios.map((operario) => (
                <option key={operario.id} value={operario.id}>
                  {operario.user_code} - {operario.full_name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex flex-col justify-center">
            <label className="flex items-center gap-2 text-sm font-medium text-brand-dark">
              <input
                type="checkbox"
                checked={draft.applyRenta}
                onChange={(e) => actions.setApplyRenta(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-cobalt focus:ring-brand-cobalt"
                disabled={loading}
              />
              Aplicar Retención de Renta (10%)
            </label>
            <p className="mt-1 text-xs text-brand-muted">Se descuenta sobre el subtotal sin IVA.</p>
          </div>

          <Field
            label="Descuento directo"
            htmlFor="discount"
            hint={`Maximo: ${formatCurrency(totals.subtotalConIva)}`}
          >
            <Input
              id="discount"
              type="number"
              min="0"
              step="0.01"
              value={draft.discount}
              onChange={(e) => actions.setDiscount(e.target.value === '' ? 0 : Number(e.target.value))}
              disabled={loading}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 lg:grid-cols-2">
          <QuoteTotalsPanel totals={totals} itemsCount={items.length} />
          <div className="flex flex-col justify-end gap-2">
            <Button type="submit" loading={loading} className="w-full">
              <FilePlus2 className="h-4 w-4" aria-hidden />
              {draft.editingId !== null ? 'Guardar Cambios' : 'Crear Cotización'}
            </Button>
            {draft.editingId !== null ? (
              <Button type="button" variant="secondary" onClick={() => actions.startCreate()} disabled={loading} className="w-full">
                Descartar cambios
              </Button>
            ) : null}
          </div>
        </div>
      </form>
    </section>
  );
}
