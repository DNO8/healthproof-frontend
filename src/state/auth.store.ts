import { create } from "zustand";
import type { UserProfile } from "@/types/domain.types";
import type { WalletState } from "@/types/blockchain.types";

interface AuthState {
  user: UserProfile | null;
  wallet: WalletState;
  isLoading: boolean;

  setUser: (user: UserProfile | null) => void;
  setWallet: (wallet: Partial<WalletState>) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialWallet: WalletState = {
  address: null,
  connected: false,
  chainId: null,
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  wallet: initialWallet,
  isLoading: false,

  setUser: (user) => set({ user }),
  setWallet: (wallet) =>
    set((state) => ({ wallet: { ...state.wallet, ...wallet } })),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ user: null, wallet: initialWallet, isLoading: false }),
}));
