"use server";

import { validatePatientAccess } from "@/lib/auth/permissions";
import type { AuthContext } from "@/lib/auth/with-auth";
import { withAuth } from "@/lib/auth/with-auth";
import type { SignedForwardRequest } from "@/lib/metatx/types";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CreateInvitationData {
  patientWallet: string;
  granteeWallet: string;
  documentIds: string[];
  scope: number;
  expiresAtUnix: number;
  signedRequests: SignedForwardRequest[];
  encryptedKeys?: Record<string, string>;
}

async function createInvitationHandler(
  data: CreateInvitationData,
  auth: AuthContext,
): Promise<{ id: string }> {
  if (data.patientWallet.toLowerCase() !== auth.wallet.toLowerCase()) {
    throw new Error("Signer mismatch: patientWallet != authenticated wallet");
  }

  const canGrant = await validatePatientAccess(data.patientWallet, auth.wallet);
  if (!canGrant) {
    throw new Error(
      "Not authorized to create permission invitation for this patient",
    );
  }

  const supabase = createAdminClient();

  const { data: inserted, error } = await supabase
    .from("permission_invitations")
    .insert({
      patient_wallet: data.patientWallet.toLowerCase(),
      grantee_wallet: data.granteeWallet.toLowerCase(),
      document_ids: data.documentIds,
      scope: data.scope,
      expires_at_unix: data.expiresAtUnix,
      status: "pending",
      signed_requests: data.signedRequests as unknown as Record<
        string,
        unknown
      >[],
      encrypted_keys: (data.encryptedKeys ?? {}) as Record<string, unknown>,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    throw new Error(error?.message ?? "Failed to create invitation");
  }

  return { id: inserted.id as string };
}

export const createPermissionInvitation = withAuth(createInvitationHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 10 },
});
