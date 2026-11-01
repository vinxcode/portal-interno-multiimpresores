import { create } from 'zustand';

interface RecibosState {
  selectedQuoteId: string | null;
  selectQuote: (quoteId: string | null) => void;
}

export const useRecibosStore = create<RecibosState>((set) => ({
  selectedQuoteId: null,
  selectQuote: (quoteId) => set({ selectedQuoteId: quoteId }),
}));
