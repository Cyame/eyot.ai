import { create } from 'zustand';

const STORAGE_KEY = 'eyot.debugNavHidden';

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

type DebugNavState = {
  readonly hidden: boolean;
  readonly setHidden: (hidden: boolean) => void;
};

export const useDebugNavStore = create<DebugNavState>((set) => ({
  hidden: readStored(),
  setHidden: (hidden) => {
    try {
      localStorage.setItem(STORAGE_KEY, hidden ? '1' : '0');
    } catch {
      /* ignore quota / private mode */
    }
    set({ hidden });
  },
}));
