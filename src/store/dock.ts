import type { ReactNode } from 'react';
import { create } from 'zustand';

/**
 * A slot at the bottom of the quest screen. The question card renders its feedback panel
 * (correct / not quite / continue) here so it stays pinned while the question scrolls.
 */
export const useDock = create<{ node: ReactNode; set: (n: ReactNode) => void }>((set) => ({
  node: null,
  set: (node) => set({ node }),
}));
