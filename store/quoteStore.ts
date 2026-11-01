import { create } from 'zustand';
import type { QuoteStatus, QuoteWithRelations } from '@/lib/types/database';

export interface QuoteItemDraft {
  localId: string;
  quantity: number;
  detail: string;
  unitPrice: number;
}

interface QuoteDraftState {
  editingId: string | null;
  correlative: string | null;
  status: QuoteStatus | null;
  clientId: string | null;
  items: QuoteItemDraft[];
  applyRenta: boolean;
  discount: number;
  productLink: string;
  referenceImageUrl: string;
  notes: string;
  assignedTo: string | null;
  startCreate: () => void;
  loadQuote: (quote: QuoteWithRelations) => void;
  setClientId: (clientId: string | null) => void;
  addItem: (item?: { detail?: string; unitPrice?: number; quantity?: number }) => void;
  updateItem: (localId: string, patch: Partial<Omit<QuoteItemDraft, 'localId'>>) => void;
  removeItem: (localId: string) => void;
  setApplyRenta: (value: boolean) => void;
  setDiscount: (value: number) => void;
  setProductLink: (value: string) => void;
  setReferenceImageUrl: (value: string) => void;
  setNotes: (value: string) => void;
  setAssignedTo: (value: string | null) => void;
  reset: () => void;
}

const emptyDraft = {
  editingId: null,
  correlative: null,
  status: null,
  clientId: null,
  items: [] as QuoteItemDraft[],
  applyRenta: false,
  discount: 0,
  productLink: '',
  referenceImageUrl: '',
  notes: '',
  assignedTo: null,
};

function draftItem(): QuoteItemDraft {
  return {
    localId: crypto.randomUUID(),
    quantity: 1,
    detail: '',
    unitPrice: 0,
  };
}

export const useQuoteStore = create<QuoteDraftState>((set) => ({
  ...emptyDraft,
  startCreate: () => set({ ...emptyDraft, items: [draftItem()] }),
  loadQuote: (quote) =>
    set({
      editingId: quote.id,
      correlative: quote.correlative,
      status: quote.status,
      clientId: quote.client_id,
      items: quote.items.map((item) => ({
        localId: crypto.randomUUID(),
        quantity: item.quantity,
        detail: item.detail,
        unitPrice: item.unit_price,
      })),
      applyRenta: quote.retencion_renta > 0,
      discount: quote.discount,
      productLink: quote.product_link ?? '',
      referenceImageUrl: quote.reference_image_url ?? '',
      notes: quote.notes ?? '',
      assignedTo: quote.assigned_to,
    }),
  setClientId: (clientId) => set({ clientId }),
  addItem: (item) =>
    set((state) => ({
      items: [...state.items, { ...draftItem(), ...item }],
    })),
  updateItem: (localId, patch) =>
    set((state) => ({
      items: state.items.map((item) => (item.localId === localId ? { ...item, ...patch } : item)),
    })),
  removeItem: (localId) =>
    set((state) => ({ items: state.items.filter((item) => item.localId !== localId) })),
  setApplyRenta: (value) => set({ applyRenta: value }),
  setDiscount: (value) => set({ discount: value }),
  setProductLink: (value) => set({ productLink: value }),
  setReferenceImageUrl: (value) => set({ referenceImageUrl: value }),
  setNotes: (value) => set({ notes: value }),
  setAssignedTo: (value) => set({ assignedTo: value }),
  reset: () => set({ ...emptyDraft, items: [] }),
}));
