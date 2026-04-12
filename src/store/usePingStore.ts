import { create } from 'zustand';

export interface DroppedItem {
  id: string;
  type: 'image' | 'text';
  content: string;
  file?: File;
}

export interface PingResult {
  coreInsight: string;
  inspirations: string[];
  actionItems: string[];
  unexpected: string;
}

interface PingStore {
  items: DroppedItem[];
  query: string;
  result: PingResult | null;
  setItems: (items: DroppedItem[] | ((prev: DroppedItem[]) => DroppedItem[])) => void;
  setQuery: (query: string) => void;
  setResult: (result: PingResult | null) => void;
  removeItem: (id: string) => void;
}

export const usePingStore = create<PingStore>()((set) => ({
  items: [],
  query: '',
  result: null,
  setItems: (itemsOrUpdater) => set((state) => ({
    items: typeof itemsOrUpdater === 'function' ? itemsOrUpdater(state.items) : itemsOrUpdater
  })),
  setQuery: (query) => set({ query }),
  setResult: (result) => set({ result }),
  removeItem: (id) => set((state) => ({
    items: state.items.filter(item => item.id !== id)
  }))
}));