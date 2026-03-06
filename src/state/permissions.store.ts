import { create } from "zustand";
import type { Permission } from "@/types/domain.types";

interface PermissionsState {
  permissions: Permission[];
  isLoading: boolean;

  setPermissions: (permissions: Permission[]) => void;
  addPermission: (permission: Permission) => void;
  revokePermission: (id: string) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const usePermissionsStore = create<PermissionsState>((set) => ({
  permissions: [],
  isLoading: false,

  setPermissions: (permissions) => set({ permissions }),
  addPermission: (permission) =>
    set((state) => ({ permissions: [permission, ...state.permissions] })),
  revokePermission: (id) =>
    set((state) => ({
      permissions: state.permissions.map((p) =>
        p.id === id ? { ...p, status: "REVOKED" as const } : p,
      ),
    })),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ permissions: [], isLoading: false }),
}));
