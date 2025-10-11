import { writable } from 'svelte/store';

interface ContextMenuState {
  id: string | null;
  x: number;
  y: number;
}

function createContextMenuStore() {
  const { subscribe, set } = writable<ContextMenuState>({ id: null, x: 0, y: 0 });

  return {
    subscribe,
    open: (id: string, x: number, y: number) => set({ id, x, y }),
    close: () => set({ id: null, x: 0, y: 0 }),
  };
}

export const activeContextMenu = createContextMenuStore();
