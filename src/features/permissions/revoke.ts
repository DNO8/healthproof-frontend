import { apiClient } from "@/services/api/client";
import { API_ROUTES } from "@/lib/constants";
import { usePermissionsStore } from "@/state/permissions.store";

export async function revokePermission(permissionId: string): Promise<void> {
  await apiClient.post(API_ROUTES.PERMISSIONS.REVOKE, {
    permission_id: permissionId,
  });

  usePermissionsStore.getState().revokePermission(permissionId);

  // TODO: optional on-chain revocation
  // await revokeAccess({ patient, grantee, resourceHash })
}
