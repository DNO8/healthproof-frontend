import { create } from "zustand";

interface UiState {
  isSidebarOpen: boolean;
  isQrModalOpen: boolean;
  isScannerOpen: boolean;
  activeModal: string | null;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openQrModal: () => void;
  closeQrModal: () => void;
  openScanner: () => void;
  closeScanner: () => void;
  setActiveModal: (modal: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: false,
  isQrModalOpen: false,
  isScannerOpen: false,
  activeModal: null,

  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  openQrModal: () => set({ isQrModalOpen: true }),
  closeQrModal: () => set({ isQrModalOpen: false }),
  openScanner: () => set({ isScannerOpen: true }),
  closeScanner: () => set({ isScannerOpen: false }),
  setActiveModal: (modal) => set({ activeModal: modal }),
}));
