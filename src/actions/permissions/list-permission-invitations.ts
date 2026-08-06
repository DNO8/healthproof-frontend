"use server";

import type { AuthContext } from "@/lib/auth/with-auth";
import { withAuth } from "@/lib/auth/with-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PermissionInvitation {
  id: string;
  patient_wallet: string;
  grantee_wallet: string;
  document_ids: string[];
  scope: number;
  expires_at_unix: number;
  status: "pending" | "accepted" | "rejected" | "cancelled" | "expired";
  tx_hash: string | null;
  created_at: string;
  responded_at: string | null;
}

interface ListByPatient {
  type: "sent";
  patientWallet: string;
}

interface ListByGrantee {
  type: "received";
  granteeWallet: string;
}

type ListParams = ListByPatient | ListByGrantee;

async function listInvitationsHandler(
  data: ListParams,
  _auth: AuthContext,
): Promise<{ invitations: PermissionInvitation[] }> {
  const supabase = createAdminClient();

  let query = supabase
    .from("permission_invitations")
    .select("*")
    .order("created_at", { ascending: false });

  if (data.type === "sent") {
    query = query.eq("patient_wallet", data.patientWallet.toLowerCase());
  } else {
    query = query.eq("grantee_wallet", data.granteeWallet.toLowerCase());
  }

  const { data: rows, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const invitations: PermissionInvitation[] = (rows ?? []).map((r) => ({
    id: r.id as string,
    patient_wallet: r.patient_wallet as string,
    grantee_wallet: r.grantee_wallet as string,
    document_ids: (r.document_ids as string[]) ?? [],
    scope: (r.scope as number) ?? 0,
    expires_at_unix: Number(r.expires_at_unix ?? 0),
    status: r.status as PermissionInvitation["status"],
    tx_hash: (r.tx_hash as string | null) ?? null,
    created_at: r.created_at as string,
    responded_at: (r.responded_at as string | null) ?? null,
  }));

  return { invitations };
}

export const listPermissionInvitations = withAuth(listInvitationsHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 30 },
});
