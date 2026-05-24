"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { withAuth } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";
import { executeForwardRequest } from "@/actions/relay/relay-core";
import type { SignedForwardRequest } from "@/lib/metatx/types";

export interface RespondInvitationData {
  invitationId: string;
  action: "accept" | "reject" | "cancel";
}

async function respondInvitationHandler(
  data: RespondInvitationData,
  auth: AuthContext
): Promise<{ txHash?: string }> {
  const supabase = createAdminClient();

  // Fetch invitation
  const { data: inv, error: fetchError } = await supabase
    .from("permission_invitations")
    .select("*")
    .eq("id", data.invitationId)
    .single();

  if (fetchError || !inv) {
    throw new Error("Invitation not found");
  }

  const patientWallet = (inv.patient_wallet as string).toLowerCase();
  const granteeWallet = (inv.grantee_wallet as string).toLowerCase();
  const status = inv.status as string;

  if (status !== "pending") {
    throw new Error(`Invitation already ${status}`);
  }

  // Authorization checks
  if (data.action === "accept" || data.action === "reject") {
    if (auth.wallet.toLowerCase() !== granteeWallet) {
      throw new Error("Only the grantee can accept or reject this invitation");
    }
  } else if (data.action === "cancel") {
    if (auth.wallet.toLowerCase() !== patientWallet) {
      throw new Error("Only the patient can cancel this invitation");
    }
  }

  // For reject/cancel, just update status
  if (data.action === "reject" || data.action === "cancel") {
    const { error } = await supabase
      .from("permission_invitations")
      .update({
        status: data.action === "reject" ? "rejected" : "cancelled",
        responded_at: new Date().toISOString(),
      })
      .eq("id", data.invitationId);

    if (error) {
      throw new Error(error.message);
    }

    return {};
  }

  // Accept: relay stored signed meta-transactions
  const signedRequests = (inv.signed_requests ?? []) as SignedForwardRequest[];
  if (!signedRequests || signedRequests.length === 0) {
    throw new Error("No signed requests found for this invitation");
  }

  let lastTxHash = "";
  for (const request of signedRequests) {
    const result = await executeForwardRequest(request);
    if (!result.success) {
      throw new Error(`Meta-transaction failed for invitation ${data.invitationId}`);
    }
    lastTxHash = result.txHash;
  }

  // Save encrypted keys to permission_keys table if present
  const encryptedKeys = (inv.encrypted_keys ?? {}) as Record<string, string>;

  if (Object.keys(encryptedKeys).length > 0) {
    for (const [docId, encKey] of Object.entries(encryptedKeys)) {
      if (!encKey) continue;
      const { error: keyError } = await supabase.from("permission_keys").upsert(
        {
          document_id: docId,
          patient_wallet: patientWallet,
          grantee_wallet: granteeWallet,
          encrypted_key: encKey,
        },
        { onConflict: "document_id,grantee_wallet" }
      );
      if (keyError) {
        console.error("Failed to save permission key for", docId, keyError);
      }
    }
  }

  // Update invitation status
  const { error: updateError } = await supabase
    .from("permission_invitations")
    .update({
      status: "accepted",
      tx_hash: lastTxHash,
      responded_at: new Date().toISOString(),
    })
    .eq("id", data.invitationId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return { txHash: lastTxHash };
}

export const respondPermissionInvitation = withAuth(respondInvitationHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 10 },
});
