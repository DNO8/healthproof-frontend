"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { withAuth, type AuthContext } from "@/lib/auth/with-auth";

/**
 * Check if a user has a Shamir key share backup.
 * Returns key_version if backup exists.
 */
async function checkKeyBackupHandler(
  data: { userId: string },
  auth: AuthContext
): Promise<{
  hasBackup: boolean;
  backupVersion: number | null;
  hasShare: boolean;
  hasLegacy: boolean;
}> {
  if (auth.userId !== data.userId) {
    throw new Error("Unauthorized: userId mismatch");
  }

  const supabase = createAdminClient();
  const { data: user, error } = await supabase
    .from("users")
    .select("key_share, key_version, encrypted_private_key")
    .eq("id", data.userId)
    .single();

  if (error || !user) {
    return {
      hasBackup: false,
      backupVersion: null,
      hasShare: false,
      hasLegacy: false,
    };
  }

  const hasShare = !!user.key_share;
  const hasLegacy = !!user.encrypted_private_key;

  return {
    hasBackup: hasShare,
    backupVersion: user.key_version ?? null,
    hasShare,
    hasLegacy,
  };
}

export const checkKeyBackup = withAuth(checkKeyBackupHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 20 },
});
