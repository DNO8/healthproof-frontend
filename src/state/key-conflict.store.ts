import { create } from "zustand";

export type KeyConflictReason =
  | "missing_local_keys"   // DB has public key + encrypted data, but IndexedDB is empty
  | "key_mismatch"         // IndexedDB key doesn't match DB key, and encrypted data exists
  | null;

interface KeyConflictState {
  conflict: KeyConflictReason;
  setConflict: (reason: KeyConflictReason) => void;
  clearConflict: () => void;
}

export const useKeyConflictStore = create<KeyConflictState>((set) => ({
  conflict: null,
  setConflict: (reason) => set({ conflict: reason }),
  clearConflict: () => set({ conflict: null }),
}));
