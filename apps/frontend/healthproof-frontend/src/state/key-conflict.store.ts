import { create } from "zustand";

export type KeyConflictReason =
  | "missing_local_keys" // DB has public key + encrypted data, but IndexedDB is empty
  | "key_mismatch" // IndexedDB key doesn't match DB key, and encrypted data exists
  | null;

interface KeyConflictState {
  conflict: KeyConflictReason;
  isRecovering: boolean;
  requestRegenerate: boolean;
  setConflict: (reason: KeyConflictReason) => void;
  clearConflict: () => void;
  setIsRecovering: (value: boolean) => void;
  setRequestRegenerate: (value: boolean) => void;
}

export const useKeyConflictStore = create<KeyConflictState>((set) => ({
  conflict: null,
  isRecovering: false,
  requestRegenerate: false,
  setConflict: (reason) => set({ conflict: reason, isRecovering: false }),
  clearConflict: () => set({ conflict: null, isRecovering: false }),
  setIsRecovering: (value) => set({ isRecovering: value }),
  setRequestRegenerate: (value) => set({ requestRegenerate: value }),
}));
