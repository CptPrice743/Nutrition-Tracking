import { create } from 'zustand';

type UiStore = {
  isSidebarOpen: boolean;
  serverWakeupVisible: boolean;
  wakeupPendingCount: number;
  setSidebarOpen: (open: boolean) => void;
  beginWakeup: () => void;
  endWakeup: () => void;
};

export const useUiStore = create<UiStore>((set, get) => ({
  isSidebarOpen: true,
  serverWakeupVisible: false,
  wakeupPendingCount: 0,
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  beginWakeup: () => {
    const nextCount = get().wakeupPendingCount + 1;
    set({ wakeupPendingCount: nextCount, serverWakeupVisible: true });
  },
  endWakeup: () => {
    const nextCount = Math.max(get().wakeupPendingCount - 1, 0);
    set({
      wakeupPendingCount: nextCount,
      serverWakeupVisible: nextCount > 0
    });
  }
}));
