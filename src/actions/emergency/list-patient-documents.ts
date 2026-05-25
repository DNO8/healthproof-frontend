"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { withAuth } from "@/lib/auth/with-auth";
import type { AuthContext } from "@/lib/auth/with-auth";

export interface PatientDocument {
  document_id: string;
  file_name: string | null;
  created_at: string;
}

async function handler(
  data: { patientWallet: string },
  _auth: AuthContext,
): Promise<PatientDocument[]> {
  const supabase = createAdminClient();

  const { data: rows, error } = await supabase
    .from("document_secrets")
    .select("document_id, file_name, created_at")
    .eq("patient_wallet", data.patientWallet.toLowerCase())
    .order("created_at", { ascending: false });

  if (error || !rows) {
    console.error("[listPatientDocuments] error:", error);
    return [];
  }

  return rows as PatientDocument[];
}

export const listPatientDocuments = withAuth(handler, {
  rateLimit: { windowMs: 60000, maxRequests: 20 },
});
